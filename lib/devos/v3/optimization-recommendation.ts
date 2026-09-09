import { prisma } from '@/lib/db';
import dayjs from 'dayjs';

export interface RecommendationInsight {
  title: string;
  description: string;
  impactScore: number;
  insightType: 'cost_optimization' | 'performance_routing' | 'window_shift' | 'structural_waste';
  source: string;
}

export class OptimizationRecommendationEngine {
  /**
   * Scans recent executions and generates AI Ops recommendations.
   * Can be run on a cron job (e.g., daily) to populate the DevOsOptimizationInsight table.
   */
  public static async analyzeTenant(tenantId: string, module: string): Promise<void> {
    const cutoff = dayjs().subtract(7, 'days').toDate();

    // 1. Structural Retry Waste Check
    // E.g., How many times did a job fail > 2 times and never succeeded?
    const runs = await (prisma as any).devOsJobRun.findMany({
      where: {
        tenantId,
        createdAt: { gte: cutoff }
      },
      select: {
        jobId: true,
        queueId: true,
        status: true,
        actualCost: true
      }
    });

    // Dummy detection logic for "waste": High amount of FAILED runs vs SUCCEEDED for the same Job
    const jobStats = new Map<string, { success: number, fail: number, costWasted: number }>();
    runs.forEach((r: any) => {
      const stats = jobStats.get(r.jobId) || { success: 0, fail: 0, costWasted: 0 };
      if (r.status === 'SUCCEEDED') stats.success++;
      else {
        stats.fail++;
        stats.costWasted += r.actualCost || 0;
      }
      jobStats.set(r.jobId, stats);
    });

    const recommendations: RecommendationInsight[] = [];

    jobStats.forEach((stats, jobId) => {
      // If we failed a lot and succeeded rarely, and wasted money doing it
      if (stats.fail > 5 && stats.success === 0 && stats.costWasted > 0.05) {
        recommendations.push({
          title: 'High Retry Waste Detected',
          description: `Job ${jobId} is failing repeatedly and wasting budget ($${stats.costWasted.toFixed(4)}). Consider lowering max retries or fixing structural issue.`,
          impactScore: 0.8,
          insightType: 'structural_waste',
          source: 'waste_analyzer'
        });
      }
    });

    // 2. High Cost / Success Rate Optimization
    // If we use 'gpt-4o' heavily where 'gpt-4o-mini' would work, we can recommend a shift
    const premiumStats = await (prisma as any).devOsJobRun.findMany({
      where: {
        tenantId,
        selectedModel: 'gpt-4o',
        status: 'SUCCEEDED',
        createdAt: { gte: cutoff }
      }
    });

    if (premiumStats.length > 50) {
       recommendations.push({
         title: 'Potential Cost Savings (Model Downgrade)',
         description: `High volume of jobs running on premium models. Try shifting the default routing policy to 'cost_first' to assess if 'gpt-4o-mini' maintains acceptable success rates.`,
         impactScore: 0.7,
         insightType: 'cost_optimization',
         source: 'cost_analyzer'
       });
    }

    // Persist Recommendations
    for (const rec of recommendations) {
      await (prisma as any).devOsOptimizationInsight.create({
        data: {
          tenantId,
          module,
          title: rec.title,
          description: rec.description,
          insightType: rec.insightType,
          impactScore: rec.impactScore,
          source: rec.source
        }
      });
    }
  }
}
