import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { PostExecutionValidator } from '@/lib/devos/agents/post-execution-validator';
import type { PostValidationInput } from '@/lib/devos/agents/post-execution-validator.types';

/**
 * POST /api/devos/executions/validate
 * Runs post-execution validation on a completed ExecutionRun.
 * Updates the run's final status based on the verdict.
 *
 * Input:
 *   executionId, originalPrompt, executedSteps, executor_log (optional)
 *
 * Output: PostValidationOutput with verdict + coherence_score + step_validations
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authId = token.sub as string;

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });

  const body = await req.json();
  const { executionId, originalPrompt, executedSteps, executor_log } = body;

  if (!executionId || typeof executionId !== 'string') {
    return NextResponse.json({ error: '"executionId" is required.' }, { status: 400 });
  }

  if (!originalPrompt?.execution_plan || !Array.isArray(originalPrompt.execution_plan)) {
    return NextResponse.json({ error: '"originalPrompt.execution_plan" is required.' }, { status: 400 });
  }

  if (!executedSteps || !Array.isArray(executedSteps)) {
    return NextResponse.json({ error: '"executedSteps" must be an array.' }, { status: 400 });
  }

  const input: PostValidationInput = {
    executionId,
    tenantId: user.tenantId,
    userId: user.id,
    originalPrompt,
    executedSteps,
    executor_log,
  };

  const result = await PostExecutionValidator.validate(input);
  return NextResponse.json(result, { status: 200 });
}
