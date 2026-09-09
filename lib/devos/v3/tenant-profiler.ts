import { prisma } from '@/lib/db';

export type TenantPersona = 'PERFORMANCE_MAX' | 'COST_OPTIMIZED' | 'BALANCED' | 'STABLE';

export interface TenantProfile {
  persona: TenantPersona;
  avgSuccessRate: number;
  avgCostPerJob: number;
  latencySensitivity: 'HIGH' | 'LOW' | 'MEDIUM';
}

export class TenantProfiler {
  /**
   * Analyzes tenant history to build a behavioral profile.
   */
  public static async getProfile(tenantId: string): Promise<TenantProfile> {
    const recentRuns = await (prisma as any).devOsJobRun.findMany({
      where: { 
        tenantId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } // Last 30 days
      },
      take: 100,
      orderBy: { createdAt: 'desc' }
    });

    if (recentRuns.length < 5) {
      return { persona: 'BALANCED', avgSuccessRate: 0, avgCostPerJob: 0, latencySensitivity: 'MEDIUM' };
    }

    const successes = recentRuns.filter((r: any) => r.status === 'SUCCESS').length;
    const successRate = successes / recentRuns.length;
    const totalCost = recentRuns.reduce((acc: number, r: any) => acc + (r.actualCost || 0), 0);
    const avgCost = totalCost / recentRuns.length;

    // Logic to determine persona
    let persona: TenantPersona = 'BALANCED';
    if (successRate > 0.95 && avgCost > 0.05) persona = 'PERFORMANCE_MAX';
    else if (avgCost < 0.005) persona = 'COST_OPTIMIZED';
    else if (successRate < 0.7) persona = 'STABLE'; // Needs more stability focus

    return {
      persona,
      avgSuccessRate: successRate,
      avgCostPerJob: avgCost,
      latencySensitivity: persona === 'PERFORMANCE_MAX' ? 'HIGH' : 'MEDIUM'
    };
  }
}
