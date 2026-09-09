// ========================
// ValidatorAgent — Type Definitions
// ========================

export type ValidatorDecision = 'APPROVED' | 'BLOCKED' | 'NEEDS_REVIEW';

export interface ValidatorInput {
  promptPayload: {
    prompt: {
      objective: string;
      scope: string;
      execution_rules: string[];
      constraints: string[];
      success_criteria: string[];
      non_goals: string[];
      execution_plan: string[];
      estimated_impact: 'low' | 'medium' | 'high';
      requires_human_review_reason: string;
    };
    risk_level: 'low' | 'medium' | 'high';
    metadata: {
      project: string;
      module: string;
      environment: 'dev' | 'staging' | 'prod';
      tenantId: string;
      userId: string;
    };
  };
  tenantId: string;
  userId: string;
  /** Optional: Required for production execution — must be a successful staging run ID */
  promotion_of_run_id?: string;
  /** Optional: If provided, Validator checks if this was the last approved intent to prevent replay attacks */
  sessionId?: string;
}

export interface ValidationCheck {
  rule: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'critical';
  detail?: string;
}

export interface ValidatorOutput {
  agent: 'ValidatorAgent';
  version: 'v1';
  decision: ValidatorDecision;
  /** Human-readable summary of why the decision was made */
  decision_reason: string;
  checks: ValidationCheck[];
  /** If NEEDS_REVIEW: steps required before re-submission */
  required_actions?: string[];
  /** Only present when APPROVED */
  execution_clearance?: {
    dry_run_required: boolean;
    max_scope: string;
    environment_lock: 'dev' | 'staging' | 'prod';
    expires_at: string;  // ISO 8601, valid for 30 minutes
  };
  metadata: {
    tenantId: string;
    userId: string;
    environment: string;
    project: string;
    module: string;
    timestamp: string;
    processingMs: number;
  };
}
