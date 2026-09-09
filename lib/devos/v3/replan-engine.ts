import { prisma } from '@/lib/db';
import { FailureAnalyzer } from './failure-analyzer';
import { AdaptiveRetryManager } from './adaptive-retry-manager';
import { BudgetPolicyEngine } from './budget-policy-engine';
import { CostIntelligence } from './cost-intelligence';
import dayjs from 'dayjs';

export class ReplanEngine {
  private static instance: ReplanEngine;

  private constructor() {}

  public static getInstance(): ReplanEngine {
    if (!ReplanEngine.instance) {
      ReplanEngine.instance = new ReplanEngine();
    }
    return ReplanEngine.instance;
  }

  /**
   * Orchestrates the replan flow after a job failure.
   */
  async handleFailure(runId: string): Promise<boolean> {
    try {
      // 1. Fetch current context
      const run = await (prisma as any).devOsJobRun.findUnique({ where: { id: runId } });
      if (!run) return false;

      const queueItem = await (prisma as any).devOsExecutionQueue.findUnique({ where: { id: run.queueId } });
      if (!queueItem) return false;

      // 2. Analyze failure
      const insight = await FailureAnalyzer.getInstance().analyze(runId);
      
      // 3. Decide strategy based on attempt count (using queueItem.attempts)
      const strategy = await AdaptiveRetryManager.getInstance().decideNextStep(
        queueItem.attempts + 1, 
        insight, 
        queueItem.payload,
        run.tenantId
      );

      // Audit decision
      await (prisma as any).devOsJobAuditLog.create({
        data: {
          tenantId: run.tenantId,
          jobId: run.jobId,
          runId: run.id,
          action: 'REPLAN_DECISION',
          actor: 'ReplanEngine',
          metadata: {
            insight,
            strategy,
            attempt: queueItem.attempts + 1
          }
        }
      });

      if (strategy.strategy_type === 'abort') {
        return false;
      }

      // 4. ELITE CHECK: Budget-aware Retry
      // Estimate cost of the retry strategy (heuristic)
      const retryEstimate = 0.005; // Base heuristic for retry
      const budgetDecision = await BudgetPolicyEngine.evaluate(
        run.tenantId, 
        retryEstimate, 
        queueItem.priority
      );

      if (budgetDecision.action === 'BLOCK_OVER_BUDGET' && queueItem.priority < 90) {
        await (prisma as any).devOsJobAuditLog.create({
          data: {
            tenantId: run.tenantId,
            jobId: run.jobId,
            runId: run.id,
            action: 'REPLAN_ABORTED_BY_BUDGET',
            actor: 'ReplanEngine',
            metadata: { reason: 'Insufficient budget for retry', decision: budgetDecision }
          }
        });
        return false;
      }

      // 5. Generate new queue item based on strategy
      const scheduledAt = dayjs()
        .add(strategy.modifications.delayMinutes || 1, 'minute')
        .toDate();

      await (prisma as any).devOsExecutionQueue.create({
        data: {
          tenantId: queueItem.tenantId,
          jobId: queueItem.jobId,
          status: 'PENDING',
          environment: queueItem.environment,
          priority: strategy.modifications.priority || queueItem.priority,
          triggerSource: 'schedule', // Re-scheduled
          scheduledAt,
          availableAt: scheduledAt,
          module: queueItem.module,
          payload: strategy.modifications.payload || queueItem.payload,
          attempts: queueItem.attempts + 1, // Carry over attempts
          replanCount: strategy.strategy_type === 'retry_same' ? queueItem.replanCount : queueItem.replanCount + 1,
          parentQueueId: queueItem.id
        }
      });

      return true;
    } catch (err) {
      console.error('[ReplanEngine] Error during failure handling:', err);
      return false;
    }
  }
}
