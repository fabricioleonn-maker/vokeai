import { prisma } from '@/lib/db';
import { FailureInsight } from './failure-analyzer';
import { ExecutionStrategy, StrategyGenerator } from './strategy-generator';

export class AdaptiveRetryManager {
  private static instance: AdaptiveRetryManager;

  private constructor() {}

  public static getInstance(): AdaptiveRetryManager {
    if (!AdaptiveRetryManager.instance) {
      AdaptiveRetryManager.instance = new AdaptiveRetryManager();
    }
    return AdaptiveRetryManager.instance;
  }

  /**
   * Defines the next step based on the number of attempts and the failure insight.
   */
  async decideNextStep(
    attempts: number, 
    insight: FailureInsight, 
    payload: any,
    tenantId: string
  ): Promise<ExecutionStrategy> {
    
    // Safety check for absolute max (governance)
    if (attempts >= 4) {
      return {
        strategy_type: 'abort',
        modifications: {},
        confidence: 1.0,
        source: 'heuristic'
      };
    }

    // --- PHASE 13: RETRY SELF-OPTIMIZATION ---
    // Learn from history if retrying this specific failure is effective
    const retryEfficacy = await this.analyzeRetryEfficacy(tenantId, insight.error_code);
    if (retryEfficacy < 0.2 && attempts >= 1) { // If < 20% success rate for this error, stop early
       return {
         strategy_type: 'abort',
         modifications: {},
         confidence: 0.9,
         source: 'history',
         reasoning: 'RETRY_SELF_OPTIMIZATION: LOW_ESTIMATED_EFFICACY'
       };
    }

    // Step 1: First retry (attempt 1) -> Same payload
    if (attempts === 1 && insight.retryable) {
      return {
        strategy_type: 'retry_same',
        modifications: {
          delayMinutes: 2,
          priority: (payload?.priority || 5)
        },
        confidence: 0.9,
        source: 'heuristic'
      };
    }

    // Step 2: Second retry (attempt 2) -> Modified payload (retry_modified)
    if (attempts === 2 && insight.retryable) {
      return StrategyGenerator.getInstance().generateStrategy(insight, payload, tenantId);
    }

    // Step 3: Third retry (attempt 3) -> Deep Replan (split_execution or fallback)
    if (attempts === 3) {
      const complexStrategy = await StrategyGenerator.getInstance().generateStrategy(insight, payload, tenantId);
      // Force a more complex strategy if simple was suggested
      if (complexStrategy.strategy_type === 'retry_same') {
        complexStrategy.strategy_type = 'fallback';
      }
      return complexStrategy;
    }

    // Default: Abort if not retryable or max attempts reached
    return {
      strategy_type: 'abort',
      modifications: {},
      confidence: 1.0,
      source: 'heuristic'
    };
  }

  /**
   * Calculates the historical efficacy of retries for a specific error code.
   */
  private async analyzeRetryEfficacy(tenantId: string, errorCode: string): Promise<number> {
    // Look for previous runs with same error code that were later successful
    const historicalRuns = await (prisma as any).devOsJobRun.findMany({
      where: {
        tenantId,
        errorCode,
        attempts: { gt: 0 }
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });

    if (historicalRuns.length < 5) return 0.5; // Neutral confidence for new errors

    const recovered = historicalRuns.filter((r: any) => r.status === 'SUCCESS').length;
    return recovered / historicalRuns.length;
  }
}
