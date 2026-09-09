import { prisma } from '@/lib/db';
import { DevOsBudgetStatus, DevOsBudgetLogType } from '@/lib/devos/types';
import { PolicyEngine } from '../policy/PolicyEngine';

export interface BudgetStatus {
  tenantId: string;
  total: number;
  spent: number;
  reserved: number;
  remaining: number;
  status: DevOsBudgetStatus;
  isOverLimit: boolean;
  canExecuteCritical: boolean;
}

export class BudgetManager {
  private static readonly RESERVATION_TTL_MINUTES = 15;
  private static readonly SOFT_LIMIT_PERCENT = 1.0; // 100%
  private static readonly HARD_LIMIT_PERCENT = 1.2; // 120%

  /**
   * Loads or initializes budget for a tenant.
   */
  public static async getBudgetStatus(tenantId: string): Promise<BudgetStatus> {
    let budget = await (prisma as any).devOsBudget.findUnique({
      where: { tenantId }
    });

    if (!budget) {
      // Default initialization for new tenants
      const cycleEnd = new Date();
      cycleEnd.setMonth(cycleEnd.getMonth() + 1);
      
      budget = await (prisma as any).devOsBudget.create({
        data: {
          tenantId,
          monthlyBudget: 50.0,
          remainingBudget: 50.0,
          budgetCycleEnd: cycleEnd
        }
      });
    }

    const policy = await PolicyEngine.resolve(tenantId);
    const totalUsageRatio = (budget.currentSpend + budget.reservedSpend) / budget.monthlyBudget;
    
    // Limits derived from policy if available, otherwise fallback to standard
    const softLimit = 1.0; 
    const hardLimit = 1.2;

    return {
      tenantId: budget.tenantId,
      total: budget.monthlyBudget,
      spent: budget.currentSpend,
      reserved: budget.reservedSpend,
      remaining: budget.remainingBudget,
      status: budget.status,
      isOverLimit: totalUsageRatio >= softLimit,
      canExecuteCritical: totalUsageRatio < hardLimit
    };
  }

  /**
   * Reserves an estimated amount before execution.
   * Atomic operation to prevent race conditions.
   */
  public static async reserveBudget(tenantId: string, amount: number, runId: string, jobId?: string): Promise<boolean> {
    const budget = await this.getBudgetStatus(tenantId);
    
    // Check Hard Limit for all, Soft Limit logic will be handled by BudgetGuard
    if ( (budget.spent + budget.reserved + amount) / budget.total > this.HARD_LIMIT_PERCENT) {
       return false;
    }

    await prisma.$transaction(async (tx) => {
      await (tx as any).devOsBudget.update({
        where: { tenantId },
        data: {
          reservedSpend: { increment: amount },
          remainingBudget: { decrement: amount }
        }
      });

      await (tx as any).devOsBudgetLog.create({
        data: {
          tenantId,
          runId,
          jobId,
          amount,
          type: 'RESERVE',
          status: 'SUCCESS',
          reason: 'Pre-execution estimate reservation'
        }
      });
    });

    return true;
  }

  /**
   * Commits actual spend and releases reservation difference.
   */
  public static async commitSpend(tenantId: string, runId: string, reservedAmount: number, actualAmount: number): Promise<void> {
    const diff = reservedAmount - actualAmount;

    await prisma.$transaction(async (tx) => {
      await (tx as any).devOsBudget.update({
        where: { tenantId },
        data: {
          reservedSpend: { decrement: reservedAmount },
          currentSpend: { increment: actualAmount },
          remainingBudget: { increment: diff } // Return the diff to remaining
        }
      });

      await (tx as any).devOsBudgetLog.create({
        data: {
          tenantId,
          runId,
          amount: actualAmount,
          type: 'COMMIT',
          status: 'SUCCESS',
          reason: `Spend committed. Reserved: ${reservedAmount}, Actual: ${actualAmount}`
        }
      });

      // Update budget status if needed (e.g. alert thresholds)
      await this.evaluateStatus(tenantId, tx);
    });
  }

  /**
   * Releases reservation if job is cancelled or fails before spending.
   */
  public static async releaseReservation(tenantId: string, runId: string, amount: number, reason: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await (tx as any).devOsBudget.update({
        where: { tenantId },
        data: {
          reservedSpend: { decrement: amount },
          remainingBudget: { increment: amount }
        }
      });

      await (tx as any).devOsBudgetLog.create({
        data: {
          tenantId,
          runId,
          amount,
          type: 'RELEASE',
          status: 'SUCCESS',
          reason: `Reservation released: ${reason}`
        }
      });
    });
  }

  /**
   * Cleans up expired reservations (Standard 15m TTL).
   * Runs heartbeats/cleanup logic.
   */
  public static async cleanupExpiredReservations(): Promise<number> {
    // Phase 12.2: Standard 15m cleanup
    const ttlWindow = new Date(Date.now() - this.RESERVATION_TTL_MINUTES * 60 * 1000);
    
    const abandonedLogs = await (prisma as any).devOsBudgetLog.findMany({
      where: {
        type: 'RESERVE',
        status: 'SUCCESS',
        createdAt: { lt: ttlWindow }
      }
    });

    let cleaned = 0;
    for (const log of abandonedLogs) {
      const exists = await (prisma as any).devOsBudgetLog.findFirst({
        where: {
          runId: log.runId,
          type: { in: ['COMMIT', 'RELEASE'] }
        }
      });

      if (!exists) {
        await this.releaseReservation(log.tenantId, log.runId, log.amount, 'AUTO_CLEANUP: TTL_EXPIRED');
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * ELITE PROTECTION: Reservation Deadlock
   * If reserved spend is too high but no jobs are running, clear everything.
   */
  public static async forceReleaseStaleReservations(tenantId: string): Promise<number> {
    const budget = await this.getBudgetStatus(tenantId);
    const threshold = budget.total * 0.5; // 50% threshold

    if (budget.reserved < threshold) return 0;

    // Check for active jobs in the last 30 minutes
    const activeJobs = await (prisma as any).devOsJobRun.count({
      where: {
        tenantId,
        status: 'RUNNING',
        updatedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }
      }
    });

    if (activeJobs > 0) return 0;

    console.warn(`[BudgetManager] Deadlock detected for tenant ${tenantId}. Reserved: ${budget.reserved}, Active: 0. Forcing release.`);

    const reservedLogs = await (prisma as any).devOsBudgetLog.findMany({
      where: {
        tenantId,
        type: 'RESERVE',
        status: 'SUCCESS'
      }
    });

    let released = 0;
    for (const log of reservedLogs) {
       const finished = await (prisma as any).devOsBudgetLog.findFirst({
         where: { runId: log.runId, type: { in: ['COMMIT', 'RELEASE'] } }
       });

       if (!finished) {
         await this.releaseReservation(tenantId, log.runId, log.amount, 'DEADLOCK_PROTECTION: NO_ACTIVE_JOBS');
         released++;
       }
    }

    return released;
  }

  private static async evaluateStatus(tenantId: string, tx: any) {
    const budget = await tx.devOsBudget.findUnique({ where: { tenantId } });
    const ratio = budget.currentSpend / budget.monthlyBudget;

    let newStatus: DevOsBudgetStatus = DevOsBudgetStatus.ACTIVE;
    if (ratio >= 1.2) newStatus = DevOsBudgetStatus.BLOCKED;
    else if (ratio >= 1.0) newStatus = DevOsBudgetStatus.CRITICAL;
    else if (ratio >= 0.8) newStatus = DevOsBudgetStatus.WARNING;

    if (newStatus !== budget.status) {
      await tx.devOsBudget.update({
        where: { tenantId },
        data: { status: newStatus }
      });
    }
  }
}
