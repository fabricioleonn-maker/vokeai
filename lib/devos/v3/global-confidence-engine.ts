export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ConfidenceResult {
  score: number;
  level: ConfidenceLevel;
  reason: string;
}

export class GlobalConfidenceEngine {
  /**
   * Evaluates the reliability of a global pattern based on Phase 11 official directions.
   */
  public static calculate(params: {
    sampleSize: number;
    tenantCount: number;
    successRate: number;
    recencyDays?: number;
  }): ConfidenceResult {
    let score = 0;
    const { sampleSize, tenantCount, successRate } = params;

    // 1. Sample Size (0.0 to 0.4 weight)
    const sampleScore = Math.min(0.4, (sampleSize / 50) * 0.4);
    
    // 2. Tenant Diversity (0.0 to 0.4 weight)
    const diversityScore = Math.min(0.4, (tenantCount / 3) * 0.4);

    // 3. Consistency (0.0 to 0.2 weight)
    // Very high or very low success rates are more deterministic (consistent behavior)
    const consistencyScore = (successRate > 0.9 || successRate < 0.1) ? 0.2 : 0.1;

    score = sampleScore + diversityScore + consistencyScore;

    // Threshold logic from official direction:
    // HIGH: 50+ samples, 3+ tenants, score >= 0.8
    let level: ConfidenceLevel = 'LOW';
    let reason = 'Insufficient data sample size and tenant diversity.';

    if (score >= 0.8 && sampleSize >= 50 && tenantCount >= 3) {
      level = 'HIGH';
      reason = 'Strong global consensus across multiple tenants.';
    } else if (score >= 0.4 && sampleSize >= 20) {
      level = 'MEDIUM';
      reason = 'Emerging pattern with moderate sample size.';
    }

    return {
      score: Math.min(1, score),
      level,
      reason
    };
  }
}
