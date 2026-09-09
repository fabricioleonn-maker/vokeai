import { DevOsTransactionType, DevOsPlan, DevOsBudgetStatus, DevOsNodeType } from '../types';
import { prisma } from '@/lib/db';

export class BillingManager {
  /**
   * Reserves credits for a job execution.
   * Returns a transaction reference or throws if insufficient funds.
   */
  static async reserveCredits(tenantId: string, jobId: string, amount: number) {
    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.devOsWallet.findUnique({
        where: { tenantId }
      });

      if (!wallet || wallet.balance.toNumber() < amount) {
        throw new Error('Insufficient balance to reserve credits.');
      }

      // Create transaction record
      const transaction = await tx.devOsCreditTransaction.create({
        data: {
          tenantId,
          type: 'RESERVE',
          amount,
          reference: jobId,
          status: 'PENDING'
        }
      });

      // Update wallet: move balance to reserved
      await tx.devOsWallet.update({
        where: { tenantId },
        data: {
          balance: { decrement: amount },
          reservedBalance: { increment: amount }
        }
      });

      return transaction.id;
    });
  }

  /**
   * Releases reserved credits (e.g. on cancellation or failure).
   */
  static async releaseCredits(tenantId: string, transactionId: string) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.devOsCreditTransaction.findUnique({
        where: { id: transactionId }
      });

      if (!transaction || transaction.status !== 'PENDING') {
        throw new Error('Invalid or non-pending transaction.');
      }

      // Return reserved to balance
      await tx.devOsWallet.update({
        where: { tenantId },
        data: {
          balance: { increment: transaction.amount },
          reservedBalance: { decrement: transaction.amount }
        }
      });

      // Update transaction status
      await tx.devOsCreditTransaction.update({
        where: { id: transactionId },
        data: { status: 'CANCELLED' }
      });
    });
  }

  /**
   * Finalizes consumption (DEBIT).
   */
  static async finalizeConsumption(tenantId: string, transactionId: string, actualCost: number) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.devOsCreditTransaction.findUnique({
        where: { id: transactionId }
      });

      if (!transaction || transaction.status !== 'PENDING') {
        throw new Error('Invalid or non-pending transaction.');
      }

      const reservedAmount = transaction.amount.toNumber();
      const diff = reservedAmount - actualCost;

      // Update wallet: remove from reserved, adjust balance if cost different
      await tx.devOsWallet.update({
        where: { tenantId },
        data: {
          reservedBalance: { decrement: reservedAmount },
          balance: { increment: diff > 0 ? diff : 0 }
        }
      });

      // Update transaction status to COMPLETED and actual DEBIT
      await tx.devOsCreditTransaction.update({
        where: { id: transactionId },
        data: {
          type: 'DEBIT',
          amount: actualCost,
          status: 'COMPLETED'
        }
      });
    });
  }

  /**
   * Checks if a tenant is within their plan limits for the current month.
   */
  static async checkPlanLimits(tenantId: string): Promise<{ allowed: boolean, reason?: string }> {
    const subscription = await prisma.devOsSubscription.findUnique({
      where: { tenantId }
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      return { allowed: false, reason: 'No active subscription found.' };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count executions this month
    const executionCount = await prisma.devOsJob.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth }
      }
    });

    const limits: Record<DevOsPlan, number> = {
      FREE: 100,
      STARTER: 1000,
      PRO: 10000,
      ENTERPRISE: 1000000
    };

    const limit = limits[subscription.plan as DevOsPlan] || 0;

    if (executionCount >= limit) {
      return { allowed: false, reason: `Plan execution limit reached (${executionCount}/${limit}).` };
    }

    // Also check wallet
    const wallet = await prisma.devOsWallet.findUnique({ where: { tenantId } });
    if (!wallet || wallet.balance.toNumber() <= 0) {
      return { allowed: false, reason: 'Insufficient credits in wallet.' };
    }

    return { allowed: true };
  }

  static async getSubscriptionStatus(tenantId: string) {
    const sub = await prisma.devOsSubscription.findUnique({ where: { tenantId } });
    const wallet = await prisma.devOsWallet.findUnique({ where: { tenantId } });
    
    return {
      plan: sub?.plan || 'FREE',
      isActive: sub?.isActive || false,
      balance: wallet?.balance.toNumber() || 0,
      reserved: wallet?.reservedBalance.toNumber() || 0
    };
  }
}
