import { prisma } from '@/lib/db';
import dayjs from 'dayjs';

export interface PerformanceStats {
  model: string;
  successRate: number;
  avgCost: number;
  avgLatencyMs: number;
  sampleSize: number;
}

export class PerformanceMiner {
  /**
   * Mines historical performance for a specific execution fingerprint.
   * Returns a breakdown by model to help the ModelRoutingEngine pick the best one.
   */
  public static async getModelPerformanceForFingerprint(fingerprint: string): Promise<PerformanceStats[]> {
    try {
      // Analyze last 30 days of data for relevance
      const cutoff = dayjs().subtract(30, 'days').toDate();

      const runs = await (prisma as any).devOsJobRun.findMany({
        where: {
          executionFingerprint: fingerprint,
          createdAt: { gte: cutoff },
          selectedModel: { not: null }
        },
        select: {
          selectedModel: true,
          status: true,
          actualCost: true,
          durationMs: true
        }
      });

      if (!runs.length) return [];

      const statsMap = new Map<string, { success: number, total: number, costSum: number, latencySum: number }>();

      for (const run of runs) {
        const model = run.selectedModel as string;
        if (!statsMap.has(model)) {
          statsMap.set(model, { success: 0, total: 0, costSum: 0, latencySum: 0 });
        }
        
        const stats = statsMap.get(model)!;
        stats.total += 1;
        if (run.status === 'SUCCEEDED') {
          stats.success += 1;
        }
        stats.costSum += (run.actualCost || 0);
        stats.latencySum += (run.durationMs || 0);
      }

      const results: PerformanceStats[] = [];
      statsMap.forEach((stats, model) => {
        results.push({
          model,
          successRate: stats.total > 0 ? stats.success / stats.total : 0,
          avgCost: stats.total > 0 ? stats.costSum / stats.total : 0,
          avgLatencyMs: stats.total > 0 ? stats.latencySum / stats.total : 0,
          sampleSize: stats.total
        });
      });

      return results.sort((a, b) => b.successRate - a.successRate); // Highest success first

    } catch (err) {
      console.error('[PerformanceMiner] Error mining fingerprint stats:', err);
      return [];
    }
  }

  /**
   * Generates a "window slot" string from a date date (e.g., "08:00-09:00")
   */
  public static getWindowSlot(date: Date): string {
    const d = dayjs(date);
    const startHour = d.format('HH:00');
    const endHour = d.add(1, 'hour').format('HH:00');
    return `${startHour}-${endHour}`;
  }
}
