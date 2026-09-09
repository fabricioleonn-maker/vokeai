import { callLLM } from '../../agents/llm-service';
import { prisma } from '../../db';
import {
  PostValidationInput,
  PostValidationOutput,
  PostValidationVerdict,
  StepValidationResult,
} from './post-execution-validator.types';

// ========================
// PostExecutionValidator v1
// Post-Execution Judgement Layer
// Receives execution output → judges coherence → emits verdict
// ========================

const PEV_SYSTEM = `
You are PostExecutionValidator v1, a critical analysis agent within the Synkra/DevOS Engineering OS.

You receive:
- The original approved objective and execution plan
- The success criteria that were defined
- The executed steps with their status and any errors
- Optional: actual output or logs from the executor

Your job is to JUDGE whether the execution actually achieved its objective.

## MANDATORY OUTPUT FORMAT
Return ONLY a single valid JSON object. No markdown, no explanations.

{
  "verdict": "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED" | "NEEDS_HUMAN_REVIEW",
  "verdict_reason": "string — precise one-sentence judgment",
  "coherence_score": 0.0-1.0,
  "step_validations": [
    {
      "index": 0,
      "expected_output": "string — what this step should have produced",
      "validation_status": "VERIFIED" | "MISMATCH" | "UNVERIFIED" | "NOT_APPLICABLE",
      "coherence_score": 0.0-1.0,
      "notes": "string (optional)"
    }
  ],
  "recommended_actions": ["string", ...],
  "recovery_guidance": {
    "retry_feasible": true | false,
    "requires_manual_intervention": true | false,
    "intervention_steps": ["string", ...]
  }
}

## VERDICT RULES
- SUCCESS: All success criteria met, no errors, coherence_score ≥ 0.85
- PARTIAL_SUCCESS: Most steps completed, minor gaps, coherence_score 0.5–0.84
- NEEDS_HUMAN_REVIEW: Ambiguous result, mixed signals, coherence_score 0.3–0.49
- FAILED: Critical steps errored, success criteria clearly not met, coherence_score < 0.3

## COHERENCE SCORE (0.0–1.0)
- How well the execution outcome aligns with the stated objective and success criteria
- Penalize: errored steps, missing outputs, partial completions
- Reward: all steps DONE, no errors, positive partial progress toward goal

## RECOVERY GUIDANCE (required for FAILED and NEEDS_HUMAN_REVIEW)
- retry_feasible: true only if error is transient (timeout, network, rate limit)
- requires_manual_intervention: true if data may be in inconsistent state
- intervention_steps: specific, actionable steps (not vague)

## IMPORTANT
- You judge the OUTCOME, not the intent
- A step marked DONE without actual output = UNVERIFIED, not VERIFIED
- You cannot verify what you cannot observe — mark as UNVERIFIED honestly
`;

// ========================
// Main PostExecutionValidator Service
// ========================
export const PostExecutionValidator = {
  version: 'v1' as const,

  async validate(input: PostValidationInput): Promise<PostValidationOutput> {
    const startTime = Date.now();

    // Fast-path: all steps DONE and no errors → skip LLM for efficiency
    const allPassed = input.executedSteps.every(s => s.status === 'DONE' && !s.error);
    const allFailed = input.executedSteps.every(s => s.status === 'ERROR');

    let verdict: PostValidationVerdict;
    let verdict_reason: string;
    let coherence_score: number;
    let step_validations: StepValidationResult[];
    let recommended_actions: string[] | undefined;
    let recovery_guidance: PostValidationOutput['recovery_guidance'] | undefined;

    if (allPassed && input.executedSteps.length > 0) {
      // Fast-path SUCCESS (no LLM needed — saves tokens)
      verdict = 'SUCCESS';
      verdict_reason = `All ${input.executedSteps.length} steps completed successfully with no errors.`;
      coherence_score = 0.9; // Base score — PostExecutionValidator cannot verify without actual outputs
      step_validations = input.executedSteps.map(s => ({
        index: s.index,
        step: s.step,
        expected_output: `Step "${s.step}" completes successfully`,
        validation_status: 'UNVERIFIED' as const, // Cannot confirm without actual output
        coherence_score: 0.9,
        notes: 'Step marked DONE but actual output not provided — marked UNVERIFIED.',
      }));

    } else if (allFailed) {
      // Fast-path FAILED
      verdict = 'FAILED';
      verdict_reason = `All ${input.executedSteps.length} steps failed with errors.`;
      coherence_score = 0.0;
      step_validations = input.executedSteps.map(s => ({
        index: s.index, step: s.step,
        expected_output: `Step "${s.step}" completes successfully`,
        actual_output: s.error || 'Error encountered',
        validation_status: 'MISMATCH' as const,
        coherence_score: 0.0,
        notes: s.error,
      }));
      recovery_guidance = {
        retry_feasible: false,
        requires_manual_intervention: true,
        intervention_steps: [
          'Review error logs for each failed step.',
          'Verify environment and permissions.',
          'Do not retry automatically — assess root cause first.',
        ],
      };

    } else {
      // Mixed/ambiguous → use LLM for nuanced judgment
      try {
        const userPrompt = `
ORIGINAL OBJECTIVE: ${input.originalPrompt.objective}

SUCCESS CRITERIA:
${input.originalPrompt.success_criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

EXECUTION PLAN:
${input.originalPrompt.execution_plan.map((s, i) => `${i + 1}. ${s}`).join('\n')}

EXECUTED STEPS:
${input.executedSteps.map(s =>
  `Step ${s.index + 1}: "${s.step}" → ${s.status}${s.error ? ` | ERROR: ${s.error}` : ''}${s.duration_ms ? ` | ${s.duration_ms}ms` : ''}`
).join('\n')}

${input.executor_log ? `EXECUTOR LOGS:\n${input.executor_log.slice(0, 2000)}` : 'EXECUTOR LOGS: Not provided — assess based on step status only.'}

IMPACT LEVEL: ${input.originalPrompt.estimated_impact}

Produce your verdict following the JSON format in your instructions.
`.trim();

        const llmResponse = await callLLM({
          systemPrompt: PEV_SYSTEM,
          conversationHistory: [{ role: 'user', content: userPrompt }],
          agentConfig: { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 1200 }
        });

        const rawJson = llmResponse.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(rawJson);

        verdict = parsed.verdict as PostValidationVerdict;
        verdict_reason = parsed.verdict_reason;
        coherence_score = parsed.coherence_score;
        recommended_actions = parsed.recommended_actions;
        recovery_guidance = parsed.recovery_guidance;

        // Merge LLM step validation with known step data
        step_validations = input.executedSteps.map((executedStep) => {
          const llmStep = parsed.step_validations?.find((v: any) => v.index === executedStep.index);
          return {
            index: executedStep.index,
            step: executedStep.step,
            expected_output: llmStep?.expected_output || `Step "${executedStep.step}" completes successfully`,
            actual_output: executedStep.error || undefined,
            validation_status: llmStep?.validation_status || 'UNVERIFIED',
            coherence_score: llmStep?.coherence_score ?? (executedStep.status === 'DONE' ? 0.8 : 0.0),
            notes: llmStep?.notes,
          };
        });

      } catch {
        // LLM failure → conservative NEEDS_HUMAN_REVIEW
        verdict = 'NEEDS_HUMAN_REVIEW';
        verdict_reason = 'Post-execution validation encountered an error. Human review required before marking as success.';
        coherence_score = 0.4;
        step_validations = input.executedSteps.map(s => ({
          index: s.index, step: s.step,
          expected_output: `Step "${s.step}" completes successfully`,
          validation_status: 'UNVERIFIED' as const,
          coherence_score: s.status === 'DONE' ? 0.7 : 0.0,
        }));
        recommended_actions = ['Retry validation or review manually.'];
      }
    }

    const processingMs = Date.now() - startTime;

    const output: PostValidationOutput = {
      agent: 'PostExecutionValidator',
      version: 'v1',
      executionId: input.executionId,
      verdict,
      verdict_reason,
      coherence_score,
      step_validations,
      recommended_actions,
      recovery_guidance,
      metadata: {
        tenantId: input.tenantId,
        userId: input.userId,
        executionId: input.executionId,
        timestamp: new Date().toISOString(),
        processingMs,
      },
    };

    // Update ExecutionRun status based on verdict
    await updateExecutionRunStatus(input.executionId, verdict, input.tenantId);

    // Persist audit log
    await logValidation(input.tenantId, input.userId, output).catch(() => {});

    return output;
  }
};

async function updateExecutionRunStatus(
  executionId: string,
  verdict: PostValidationVerdict,
  tenantId: string
) {
  const STATUS_MAP: Record<PostValidationVerdict, string> = {
    SUCCESS: 'SUCCESS',
    PARTIAL_SUCCESS: 'PARTIAL_SUCCESS',
    FAILED: 'FAILED',
    NEEDS_HUMAN_REVIEW: 'NEEDS_REVIEW',
  };

  try {
    await prisma.devOsExecutionRun.updateMany({
      where: { id: executionId, tenantId },
      data: { status: STATUS_MAP[verdict] }
    });
  } catch (e) {
    console.error('[PostExecutionValidator] Failed to update run status:', e);
  }
}

async function logValidation(tenantId: string, userId: string, output: PostValidationOutput) {
  await prisma.aIUsageLog.create({
    data: {
      tenantId,
      userId,
      model: 'gpt-4o-mini',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      purpose: 'post_execution_validator_v1',
      metadata: {
        executionId: output.executionId,
        verdict: output.verdict,
        coherence_score: output.coherence_score,
        processingMs: output.metadata.processingMs,
      } as any,
    }
  });
}
