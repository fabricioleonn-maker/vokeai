// ========================
// ExecutionTracker — Type Definitions (v1.1)
// ========================

/**
 * Extended status set reflecting real-world execution outcomes.
 * PARTIAL_SUCCESS: some steps completed, some failed (non-critical)
 * NEEDS_REVIEW: ambiguous outcome — human must assess before marking success
 * BLOCKED: execution gate prevented progress
 */
export type ExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'NEEDS_REVIEW'
  | 'BLOCKED'
  | 'DRY_RUN_COMPLETE';

export type ExecutionMode = 'dry-run' | 'safe' | 'full';
export type StepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR' | 'SKIPPED';
export type StepValidationStatus = 'VERIFIED' | 'MISMATCH' | 'UNVERIFIED' | 'NOT_APPLICABLE';

// Risk score: 0 (zero risk) → 100 (critical danger)
export type RiskScore = number;

export interface ExecutionStep {
  index: number;
  step: string;
  status: StepStatus;
  startedAt?: string;
  finishedAt?: string;
  duration_ms?: number;
  error?: string;
  // v1.1: Per-step result tracking (populated by PostExecutionValidator)
  expected_output?: string;
  actual_output?: string;
  validation_status?: StepValidationStatus;
}

/**
 * UndoFeasibilityAnalysis — NOT a rollback mechanism.
 *
 * ⚠️ IMPORTANT DISCLAIMER:
 * This is a feasibility assessment, NOT a guaranteed rollback capability.
 * It does NOT substitute for:
 *   - Database PITR (Point-In-Time Recovery)
 *   - Transaction rollback (Postgres BEGIN/ROLLBACK)
 *   - Migration reversibility (prisma migrate revert)
 *   - Infrastructure snapshots or backup restore
 *
 * Classification is based on keyword analysis and may be inaccurate.
 * Always treat irreversible_actions as permanent once applied.
 */
export interface UndoFeasibilityAnalysis {
  /**
   * Disclaimer: this analysis does not guarantee rollback capability.
   * It is an informational assessment only.
   */
  disclaimer: string;
  affected_scope: string[];
  /** Actions likely reversible via compensating operations — NOT guaranteed */
  likely_reversible: string[];
  /** Actions considered permanent once applied — manual intervention required to undo */
  likely_irreversible: string[];
  /** Recommended compensating actions per irreversible step */
  compensation_plan: string[];
  analysis_taken_at: string;
}

export interface ExecutionRunInput {
  projectId?: string;
  sessionId?: string;
  tenantId: string;
  userId: string;
  promptPayload: {
    objective: string;
    scope: string;
    execution_plan: string[];
    estimated_impact: 'low' | 'medium' | 'high';
    constraints: string[];
  };
  risk_level: 'low' | 'medium' | 'high';
  risk_score?: RiskScore;
  execution_mode: ExecutionMode;
  environment: 'dev' | 'staging' | 'prod';
  promotion_of_run_id?: string;
  clearance_token?: string;
}

export interface ExecutionRunOutput {
  executionId: string;
  agent: 'ExecutionTracker';
  version: 'v1.1';
  status: ExecutionStatus;
  execution_mode: ExecutionMode;
  environment: 'dev' | 'staging' | 'prod';
  risk_score: RiskScore;
  steps: ExecutionStep[];
  result_summary: string;
  /** See UndoFeasibilityAnalysis — this is NOT a rollback guarantee */
  undo_feasibility: UndoFeasibilityAnalysis;
  performance: {
    total_duration_ms: number;
    steps_completed: number;
    steps_failed: number;
  };
  metadata: {
    tenantId: string;
    userId: string;
    projectId?: string;
    sessionId?: string;
    objective: string;
    scope: string;
    environment: 'dev' | 'staging' | 'prod';
    promotion_of_run_id?: string;
    timestamp: string;
  };
}
