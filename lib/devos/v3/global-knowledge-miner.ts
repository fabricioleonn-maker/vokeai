import { prisma } from '@/lib/db';
import { GlobalFingerprintEngine } from './global-fingerprint';

export class GlobalKnowledgeMiner {
  /**
   * Consolidates finished Job Runs from all tenants into the Global Intelligence Layer.
   * Runs in batch mode (e.g., hourly).
   */
  public static async consolidate() {
    console.log('[DevOS] Starting Global Intelligence Consolidation...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let processed = 0;
    let updated = 0;

    // 1. Fetch recently finished runs across ALL tenants
    const runs = await (prisma as any).devOsJobRun.findMany({
      where: {
        completedAt: { gte: oneHourAgo },
        status: { in: ['SUCCESS', 'FAILED'] }
      },
      include: {
        job: true
      }
    });

    if (runs.length === 0) {
      console.log('[DevOS] No new runs to consolidate.');
      return { processed: 0, updated: 0 };
    }

    processed = runs.length;
    const globalGroups = new Map<string, any>();

    // 2. Aggregate counts by Global Fingerprint
    for (const run of runs) {
      const fingerprint = GlobalFingerprintEngine.generate({
        jobType: run.job.name,
        module: run.module,
        environment: run.environment,
        complexityTier: (run as any).complexityTier || 'medium',
        payloadSizeTier: GlobalFingerprintEngine.calculatePayloadTier(run.payload),
        errorCode: (run as any).failureCode
      });

      const existing = globalGroups.get(fingerprint) || {
        fingerprint,
        jobType: run.job.name,
        module: run.module,
        environment: run.environment,
        errorCode: (run as any).failureCode,
        successes: 0,
        fails: 0,
        totalCost: 0,
        totalLatency: 0,
        tenants: new Set<string>()
      };

      if (run.status === 'SUCCESS') existing.successes++;
      else existing.fails++;

      existing.totalCost += (run.actualCost || 0);
      existing.totalLatency += (run.durationMs || 0);
      existing.tenants.add(run.tenantId);

      globalGroups.set(fingerprint, existing);
    }

    // 3. Upsert into DevOsGlobalInsight
    for (const data of globalGroups.values()) {
      const totalSamples = data.successes + data.fails;
      const successRate = data.successes / totalSamples;
      const avgCost = data.totalCost / totalSamples;
      const avgLatency = data.totalLatency / totalSamples;
      const tenantCount = data.tenants.size;

      // Calculate confidence
      let confidenceScore = Math.min(1, (totalSamples / 50) * 0.5 + (tenantCount / 3) * 0.5);
      if (successRate > 0.95 || successRate < 0.05) confidenceScore *= 1.1;
      confidenceScore = Math.min(1, confidenceScore);

      let confidenceLevel = 'LOW';
      if (confidenceScore >= 0.8 && totalSamples >= 50 && tenantCount >= 3) {
        confidenceLevel = 'HIGH';
      } else if (confidenceScore >= 0.4) {
        confidenceLevel = 'MEDIUM';
      }

      await (prisma as any).devOsGlobalInsight.upsert({
        where: { globalFingerprint: data.fingerprint },
        update: {
          successRate,
          avgCost,
          avgLatency,
          sampleSize: { increment: totalSamples },
          tenantCount: { increment: 0 },
          confidenceScore,
          confidenceLevel,
          lastUpdatedAt: new Date()
        },
        create: {
          globalFingerprint: data.fingerprint,
          jobType: data.jobType,
          module: data.module,
          environment: data.environment,
          errorCode: data.errorCode,
          successRate,
          avgCost,
          avgLatency,
          sampleSize: totalSamples,
          tenantCount: tenantCount,
          confidenceScore,
          confidenceLevel,
        }
      });
      updated++;

      // 4. Create Metric Snapshot for history
      await (prisma as any).devOsGlobalMetricSnapshot.create({
        data: {
          globalFingerprint: data.fingerprint,
          successCount: data.successes,
          failCount: data.fails,
          avgCost,
          avgLatencyMs: avgLatency
        }
      });
    }

    console.log(`[DevOS] Consolidated ${globalGroups.size} global patterns.`);
    return { processed, updated };
  }
}
