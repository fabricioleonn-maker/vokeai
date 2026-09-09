import { prisma } from '../../db';
import {
  ExecutionRunInput,
  ExecutionRunOutput,
  ExecutionStep,
  StepStatus,
  ExecutionStatus,
  UndoFeasibilityAnalysis,
} from './execution-tracker.types';

// ========================
// ExecutionTracker v1.1
// Observability, Step Tracking & Undo Feasibility Analysis
// IMPORTANT: UndoFeasibilityAnalysis is NOT a rollback guarantee.
// For real rollback, use Postgres transactions, PITR, or infrastructure snapshots.
// ========================

function deriveRiskScore(
  risk_level: 'low' | 'medium' | 'high',
  execution_mode: 'dry-run' | 'safe' | 'full',
  estimated_impact: 'low' | 'medium' | 'high'
): number {
  const BASE: Record<string, number> = { low: 10, medium: 40, high: 75 };
  const MODE_MULTIPLIER: Record<string, number> = { 'dry-run': 0, safe: 0.6, full: 1.0 };
  const IMPACT_BONUS: Record<string, number> = { low: 0, medium: 10, high: 20 };
  return Math.min(100, Math.round((BASE[risk_level] + IMPACT_BONUS[estimated_impact]) * MODE_MULTIPLIER[execution_mode]));
}

/**
 * Builds an Undo Feasibility Analysis (NOT a rollback plan).
 *
 * This function performs keyword-based step classification.
 * Classification accuracy is not guaranteed.
 * Do NOT rely on this as a rollback mechanism.
 */
function buildUndoFeasibilityAnalysis(input: ExecutionRunInput): UndoFeasibilityAnalysis {
  const LIKELY_REVERSIBLE_KEYWORDS = ['analyze', 'read', 'list', 'check', 'verify', 'profile', 'inspect', 'measure'];
  const LIKELY_IRREVERSIBLE_KEYWORDS = ['create', 'insert', 'update', 'delete', 'deploy', 'migrate', 'alter', 'apply', 'seed'];

  const likely_reversible: string[] = [];
  const likely_irreversible: string[] = [];
  const compensation_plan: string[] = [];

  for (const step of input.promptPayload.execution_plan) {
    const lower = step.toLowerCase();
    const isIrreversible = LIKELY_IRREVERSIBLE_KEYWORDS.some(k => lower.includes(k));
    const isReversible = LIKELY_REVERSIBLE_KEYWORDS.some(k => lower.includes(k));

    if (isIrreversible && !isReversible) {
      likely_irreversible.push(step);
      compensation_plan.push(`Manual compensation required for: "${step}" — ensure backup exists before applying.`);
    } else {
      likely_reversible.push(step);
    }
  }

  return {
    disclaimer: 'This is a feasibility assessment only. It does NOT substitute for database transactions, PITR, migration revert, or infrastructure backup. Classify irreversible steps as permanent once applied.',
    affected_scope: [input.promptPayload.scope],
    likely_reversible,
    likely_irreversible,
    compensation_plan: compensation_plan.length > 0
      ? compensation_plan
      : ['No irreversible actions detected. Standard monitoring applies.'],
    analysis_taken_at: new Date().toISOString(),
  };
}

/**
 * Derives the final ExecutionStatus from step outcomes.
 * Uses richer status set reflecting real-world execution outcomes.
 */
function deriveExecutionStatus(
  mode: string,
  totalSteps: number,
  stepsCompleted: number,
  stepsFailed: number
): ExecutionStatus {
  if (mode === 'dry-run') return 'DRY_RUN_COMPLETE';
  if (stepsFailed === 0) return 'SUCCESS';
  if (stepsCompleted === 0) return 'FAILED';
  // Some passed, some failed → partial
  if (stepsCompleted > 0 && stepsFailed > 0) {
    // If less than 20% failed, it's partial success; otherwise needs review
    const failureRate = stepsFailed / totalSteps;
    return failureRate < 0.2 ? 'PARTIAL_SUCCESS' : 'NEEDS_REVIEW';
  }
  return 'FAILED';
}

// ========================
// Main ExecutionTracker Service
// ========================
export const ExecutionTracker = {
  version: 'v1.1' as const,

  async run(input: ExecutionRunInput): Promise<ExecutionRunOutput> {
    const globalStart = Date.now();

    if (input.clearance_token && input.execution_mode === 'full') {
      console.log(`[ExecutionTracker] Clearance token acknowledged: ${input.clearance_token}`);
    }

    const risk_score = deriveRiskScore(
      input.risk_level,
      input.execution_mode,
      input.promptPayload.estimated_impact
    );

    // Undo feasibility analysis (pre-execution, NOT a rollback plan)
    const undo_feasibility = buildUndoFeasibilityAnalysis(input);

    // Create run record
    const run = await (prisma as any).devOsExecutionRun.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        projectId: input.projectId,
        sessionId: input.sessionId,
        objective: input.promptPayload.objective,
        scope: input.promptPayload.scope,
        promptPayload: input.promptPayload as any,
        execution_mode: input.execution_mode,
        environment: input.environment,
        promotion_of_run_id: input.promotion_of_run_id,
        risk_level: input.risk_level,
        risk_score,
        status: 'RUNNING',
        // Store undo_feasibility in the rollback_snapshot JSON field (schema reuse)
        rollback_snapshot: undo_feasibility as any,
        clearance_token: input.clearance_token,
        startedAt: new Date(),
        steps: {
          create: input.promptPayload.execution_plan.map((step, index) => ({
            index, step, status: 'PENDING',
          }))
        }
      },
      include: { steps: { orderBy: { index: 'asc' } } }
    });

    // Process steps
    const stepResults: ExecutionStep[] = [];
    let stepsCompleted = 0;
    let stepsFailed = 0;

    for (const dbStep of run.steps) {
      const stepStart = Date.now();

      await (prisma as any).devOsExecutionStep.update({
        where: { id: dbStep.id },
        data: { status: 'RUNNING', startedAt: new Date() }
      });

      let finalStatus: StepStatus = 'DONE';
      let error: string | undefined;

      if (input.execution_mode === 'dry-run') {
        // Dry-run: simulate latency, no real mutation
        await new Promise(r => setTimeout(r, 40 + Math.random() * 60));
      }
      // safe/full: ExecutionTracker records intent only.
      // Downstream executor (Antigravity) performs action and calls back to update step.

      const duration_ms = Date.now() - stepStart;

      await (prisma as any).devOsExecutionStep.update({
        where: { id: dbStep.id },
        data: { status: finalStatus, finishedAt: new Date(), duration_ms, error: error || null }
      });

      if (finalStatus === 'DONE') stepsCompleted++;
      else stepsFailed++;

      stepResults.push({
        index: dbStep.index,
        step: dbStep.step,
        status: finalStatus,
        duration_ms,
        error,
        // Per-step result fields — populated by PostExecutionValidator
        expected_output: undefined,
        actual_output: undefined,
        validation_status: 'UNVERIFIED',
      });
    }

    const finalStatus = deriveExecutionStatus(
      input.execution_mode,
      run.steps.length,
      stepsCompleted,
      stepsFailed
    );

    const total_duration_ms = Date.now() - globalStart;

    const result_summary = input.execution_mode === 'dry-run'
      ? `Dry-run complete. ${stepsCompleted}/${run.steps.length} steps analyzed. No changes applied. undo_feasibility analysis available.`
      : `Execution ${finalStatus}. ${stepsCompleted} completed, ${stepsFailed} failed. Duration: ${total_duration_ms}ms. Pending post-execution validation.`;

    await (prisma as any).devOsExecutionRun.update({
      where: { id: run.id },
      data: { status: finalStatus, result_summary, total_duration_ms, steps_completed: stepsCompleted, steps_failed: stepsFailed, finishedAt: new Date() }
    });

    return {
      executionId: run.id,
      agent: 'ExecutionTracker',
      version: 'v1.1',
      status: finalStatus,
      execution_mode: input.execution_mode,
      environment: input.environment,
      risk_score,
      steps: stepResults,
      result_summary,
      undo_feasibility,
      performance: { total_duration_ms, steps_completed: stepsCompleted, steps_failed: stepsFailed },
      metadata: {
        tenantId: input.tenantId,
        userId: input.userId,
        projectId: input.projectId,
        sessionId: input.sessionId,
        objective: input.promptPayload.objective,
        scope: input.promptPayload.scope,
        environment: input.environment,
        promotion_of_run_id: input.promotion_of_run_id,
        timestamp: new Date().toISOString(),
      },
    };
  },

  async getHistory(tenantId: string, limit = 20) {
    return (prisma as any).devOsExecutionRun.findMany({
      where: { tenantId },
      include: { steps: { orderBy: { index: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async getById(runId: string, tenantId: string) {
    return (prisma as any).devOsExecutionRun.findFirst({
      where: { id: runId, tenantId },
      include: { steps: { orderBy: { index: 'asc' } } }
    });
  },

  /**
   * Called by PostExecutionValidator to update step results after validation
   */
  async updateStepResult(stepId: string, data: {
    expected_output?: string;
    actual_output?: string;
    validation_status?: string;
  }) {
    // Step result data is stored in the step's error field as JSON for now
    // PostExecutionValidator will update the run status after full validation
    return (prisma as any).devOsExecutionStep.update({
      where: { id: stepId },
      data: { error: data.validation_status === 'MISMATCH' ? `Output mismatch: expected "${data.expected_output}", got "${data.actual_output}"` : null }
    });
  }
};
