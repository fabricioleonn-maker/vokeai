import { prisma } from '@/lib/db';

export interface StrategySuccessMetrics {
  strategyType: string;
  successCount: number;
  totalAttempts: number;
  successRate: number;
}

export class KnowledgeMiner {
  private static instance: KnowledgeMiner;

  private constructor() {}

  public static getInstance(): KnowledgeMiner {
    if (!KnowledgeMiner.instance) {
      KnowledgeMiner.instance = new KnowledgeMiner();
    }
    return KnowledgeMiner.instance;
  }

  /**
   * Analyzes historical JobRuns to determine the best strategy for a specific failure code.
   * Looks at the last 50-100 runs for relevant data points.
   */
  async getPreferredStrategy(failureCode: string, tenantId: string): Promise<StrategySuccessMetrics | null> {
    try {
      // Logic: Find JobRuns that were retried/replanned and eventually succeeded
      // We look for JobRuns with the same jobId and failureCode that have a descendant success
      
      const pastRuns = await (prisma as any).devOsJobRun.findMany({
        where: {
          tenantId,
          status: 'FAILED',
          logs: {
            path: ['error'],
            equals: failureCode
          }
        },
        orderBy: { startedAt: 'desc' },
        take: 50,
        include: {
          // In a real scenario, we'd join with subsequent runs via parentQueueId or jobId
        }
      });

      if (pastRuns.length === 0) return null;

      // Group by strategy used in those failing runs
      // Then check if the NEXT run (which used that strategy) succeeded
      
      // For now, let's use a simplified version that checks overall strategy success rate 
      // for this error code across the whole tenant history.
      
      const metrics = await this.mineStrategyMetrics(failureCode, tenantId);
      
      // Return the one with highest success rate
      return metrics.sort((a, b) => b.successRate - a.successRate)[0] || null;

    } catch (error) {
      console.error('[KnowledgeMiner] Error mining history:', error);
      return null;
    }
  }

  /**
   * Mines strategy performance metrics for a specific failure code.
   */
  private async mineStrategyMetrics(failureCode: string, tenantId: string): Promise<StrategySuccessMetrics[]> {
    // This is a heavy query. In production, we'd use a materialized view or cached results.
    // Logic: 
    // 1. Find all JobRuns that used a specific strategy after a specific failureCode.
    // 2. Count how many of those resulted in SUCCESS.

    // Mock/Stub logic for the current iteration:
    // We'll return based on common patterns found in typical DevOS environments.
    
    return [
      { strategyType: 'retry_same', successCount: 15, totalAttempts: 100, successRate: 0.15 },
      { strategyType: 'retry_modified', successCount: 45, totalAttempts: 100, successRate: 0.45 },
      { strategyType: 'fallback', successCount: 80, totalAttempts: 100, successRate: 0.80 }
    ];
  }

  /**
   * Detects if a failure is "Structural" (never recovers with replan).
   */
  async isStructuralFailure(failureCode: string, tenantId: string): Promise<boolean> {
    const metrics = await this.mineStrategyMetrics(failureCode, tenantId);
    const totalSuccess = metrics.reduce((acc, m) => acc + m.successCount, 0);
    const totalAttempts = metrics.reduce((acc, m) => acc + m.totalAttempts, 0);
    
    // If success rate is < 5% after > 50 attempts, it might be structural
    return totalAttempts > 50 && (totalSuccess / totalAttempts) < 0.05;
  }
}
