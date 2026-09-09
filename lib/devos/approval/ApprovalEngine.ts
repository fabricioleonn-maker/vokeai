import { DevOsApprovalLevel } from '@prisma/client';

export type ApprovalDecisionType = 'AUTO_EXECUTE' | 'REQUIRE_APPROVAL' | 'BLOCK';

export interface ApprovalInput {
  tenantId: string;
  module: string;
  environment: string;
  estimatedCost: number;
  riskScore: number;
  confidence: number;
  attempts: number;
  isDestructive?: boolean;
  policyOverrides?: {
    forceManualApproval?: boolean;
    maxAutoApproveCost?: number;
  };
}

export interface ApprovalDecision {
  decision: ApprovalDecisionType;
  reasons: string[];
  approvalLevel: DevOsApprovalLevel;
}

import { PolicyEngine } from '../policy/PolicyEngine';

export class ApprovalEngine {
  /**
   * Decides the approval workflow for a specific execution request based on tenant policy.
   */
  public static async evaluate(input: ApprovalInput): Promise<ApprovalDecision> {
    const reasons: string[] = [];
    let decision: ApprovalDecisionType = 'AUTO_EXECUTE';
    let approvalLevel: any = 'LOW';

    // 1. Resolve Policy
    const policy = await PolicyEngine.resolve(input.tenantId);
    const maxAutoCost = policy.maxAutoApproveCost;
    const riskThreshold = policy.riskThreshold;

    // 2. Critical Blocks
    if (input.riskScore >= 95) {
      return { decision: 'BLOCK', reasons: ['CRITICAL_RISK_THRESHOLD_EXCEEDED'], approvalLevel: 'HIGH' };
    }

    // 3. Risk Threshold Review (from Policy)
    if (input.riskScore > riskThreshold) {
      reasons.push(`RISK_ABOVE_POLICY_THRESHOLD: ${input.riskScore} > ${riskThreshold}`);
      decision = 'REQUIRE_APPROVAL';
      approvalLevel = 'HIGH';
    }

    // 4. Financial Review (from Policy)
    if (input.estimatedCost > maxAutoCost) {
      reasons.push(`COST_EXCEEDS_AUTO_APPROVE_LIMIT: $${input.estimatedCost} > $${maxAutoCost}`);
      decision = 'REQUIRE_APPROVAL';
      if (approvalLevel !== 'HIGH') approvalLevel = 'MEDIUM';
    }

    // 5. Destructive Operations (Conditional by Env/Policy)
    const isProd = input.environment === 'production' || input.environment === 'prod';
    if (isProd && input.isDestructive && policy.environmentRules.production.blockDestructive) {
      reasons.push('DESTRUCTIVE_OPERATION_BLOCKED_BY_PROD_POLICY');
      return { decision: 'BLOCK', reasons, approvalLevel: 'HIGH' };
    }

    if (isProd && policy.environmentRules.production.requireApprovalAlways) {
      reasons.push('PRODUCTION_ENVIRONMENT_REQUIRES_ALWAYS_APPROVAL');
      decision = 'REQUIRE_APPROVAL';
      approvalLevel = 'HIGH';
    }

    // 6. Generic Policy Approval Triggers
    if (input.confidence < 0.6 && policy.requireApproval.lowConfidence) {
      reasons.push(`LOW_CONFIDENCE_SCORE_REVIEW: ${(input.confidence * 100).toFixed(0)}%`);
      decision = 'REQUIRE_APPROVAL';
      if (approvalLevel === 'LOW') approvalLevel = 'MEDIUM';
    }

    // 7. Manual Policy Overrides
    if (input.policyOverrides?.forceManualApproval) {
      reasons.push('OVERRIDE: FORCED_MANUAL_APPROVAL');
      decision = 'REQUIRE_APPROVAL';
    }

    return {
      decision,
      reasons,
      approvalLevel
    };
  }
}
