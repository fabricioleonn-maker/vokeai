import { prisma } from '@/lib/db';
import { GlobalFingerprintEngine } from './global-fingerprint';

export class GlobalStrategyAdvisor {
  /**
   * Suggests the best retry/replan strategy based on global results.
   */
  public static async suggestStrategy(fingerprint: string, tenantId: string) {
    if (!await this.hasReciprocity(tenantId)) return null;

    const insight = await (prisma as any).devOsGlobalInsight.findUnique({
      where: { globalFingerprint: fingerprint }
    });

    if (!insight || insight.confidenceLevel !== 'HIGH') return null;

    return {
      strategy: insight.bestStrategy || 'RECOVERY',
      confidence: insight.confidenceScore,
      reason: `Global consensus (N=${insight.sampleSize}) suggests this strategy for similar errors.`
    };
  }

  private static async hasReciprocity(tenantId: string): Promise<boolean> {
    const config = await (prisma as any).devOsTenantConfig.findUnique({
      where: { tenantId }
    });
    return config?.enableGlobalIntelligence || config?.bootstrapMode || false;
  }
}

export class GlobalModelAdvisor {
  /**
   * Suggests the most cost-effective and successful model globally for this job type.
   */
  public static async suggestModel(fingerprint: string, tenantId: string) {
    if (!await this.hasReciprocity(tenantId)) return null;

    const insight = await (prisma as any).devOsGlobalInsight.findUnique({
      where: { globalFingerprint: fingerprint }
    });

    if (!insight || insight.confidenceScore < 0.6) return null;

    return {
      model: insight.bestModel || 'gpt-4o-mini',
      confidence: insight.confidenceScore,
      avgLatency: insight.avgLatency
    };
  }

  private static async hasReciprocity(tenantId: string): Promise<boolean> {
    const config = await (prisma as any).devOsTenantConfig.findUnique({
      where: { tenantId }
    });
    return config?.enableGlobalIntelligence || config?.bootstrapMode || false;
  }
}

export class GlobalWindowAdvisor {
  /**
   * Suggests an optimal execution window based on global performance trends.
   */
  public static async suggestWindow(fingerprint: string, tenantId: string) {
     if (!await this.hasReciprocity(tenantId)) return null;
     
     // Note: In Phase 11, we are using simplified global stats.
     // In a full implementation, we'd query DevOsGlobalMetricSnapshot by time.
     return null; // Placeholder for future time-series global analysis
  }
}
