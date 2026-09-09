// ========================
// PostExecutionValidator — Type Definitions
// ========================

export type PostValidationVerdict = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'NEEDS_HUMAN_REVIEW';

export interface StepValidationResult {
  index: number;
  step: string;
  /**
   * What was expected based on the original execution_plan
   * Derived from the step description and success criteria
   */
  expected_output: string;
  /**
   * Observed output, logs, or artifact from the executor
   * If null, the step is considered unverified
   */
  actual_output?: string;
  /** VERIFIED=matched, MISMATCH=divergence, UNVERIFIED=no output received, NOT_APPLICABLE=dry-run */
  validation_status: 'VERIFIED' | 'MISMATCH' | 'UNVERIFIED' | 'NOT_APPLICABLE';
  coherence_score: number; // 0.0–1.0
  notes?: string;
}

export interface PostValidationInput {
  executionId: string;
  tenantId: string;
  userId: string;
  /**
   * The original approved prompt from PromptAgent
   */
  originalPrompt: {
    objective: string;
    execution_plan: string[];
    success_criteria: string[];
    estimated_impact: 'low' | 'medium' | 'high';
  };
  /**
   * Steps as recorded by ExecutionTracker after execution
   */
  executedSteps: Array<{
    index: number;
    step: string;
    status: string;
    duration_ms?: number;
    error?: string;
  }>;
  /**
   * Optional: Actual output/logs from the executor (Antigravity)
   * If not provided, validator will assess based on step status only
   */
  executor_log?: string;
}

export interface PostValidationOutput {
  agent: 'PostExecutionValidator';
  version: 'v1';
  executionId: string;
  verdict: PostValidationVerdict;
  verdict_reason: string;
  coherence_score: number; // Overall 0.0–1.0
  step_validations: StepValidationResult[];
  /**
   * If PARTIAL_SUCCESS or NEEDS_HUMAN_REVIEW: recommended next actions
   */
  recommended_actions?: string[];
  /**
   * If FAILED: whether it's safe to retry or if rollback planning is required
   */
  recovery_guidance?: {
    retry_feasible: boolean;
    requires_manual_intervention: boolean;
    intervention_steps: string[];
  };
  metadata: {
    tenantId: string;
    userId: string;
    executionId: string;
    timestamp: string;
    processingMs: number;
  };
}
