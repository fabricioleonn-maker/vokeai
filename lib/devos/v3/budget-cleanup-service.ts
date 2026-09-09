import { prisma } from '@/lib/db';
import { BudgetManager } from './budget-manager';

export class BudgetCleanupService {
  /**
   * Identifies and releases 'RESERVED' budget logs that haven't been committed 
   * or released within the heartbeat window (15 mins).
   */
  public static async cleanupAbandonedReservations(): Promise<number> {
    const ttlWindow = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
    
    // Find reserved logs older than 15 mins
    const abandonedLogs = await (prisma as any).devOsBudgetLog.findMany({
      where: {
        type: 'RESERVE',
        status: 'SUCCESS',
        createdAt: { lt: ttlWindow },
        // We look for those that don't have a corresponding COMMIT or RELEASE with same runId
      }
    });

    let cleanedCount = 0;

    for (const log of abandonedLogs) {
      if (!log.runId) continue;

      // Double check if there's no commit/release for this runId
      const finalAction = await (prisma as any).devOsBudgetLog.findFirst({
        where: {
          runId: log.runId,
          type: { in: ['COMMIT', 'RELEASE'] }
        }
      });

      if (!finalAction) {
        // Abandoned! Release it.
        await BudgetManager.releaseReservation(
          log.tenantId, 
          log.runId, 
          log.amount, 
          'CLEANUP_SERVICE: RESERVATION_EXPIRED'
        );
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}
