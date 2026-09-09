import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { ExecutionTracker } from '@/lib/devos/agents/execution-tracker';
import type { ExecutionRunInput, ExecutionMode } from '@/lib/devos/agents/execution-tracker.types';

/**
 * POST /api/devos/executions/run
 * Inicia uma nova Execução (ExecutionRun) a partir de um payload do PromptAgent.
 * Requer autorização do ValidatorAgent para o modo 'full'.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const authId = token.sub as string;

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 });

  const body = await req.json();
  const { promptPayload, risk_level, execution_mode, clearance_token, projectId, sessionId, environment = 'dev' } = body;

  if (!promptPayload?.execution_plan || !Array.isArray(promptPayload.execution_plan)) {
    return NextResponse.json({ error: 'O plano de execução (promptPayload.execution_plan) é obrigatório.' }, { status: 400 });
  }

  const VALID_MODES: ExecutionMode[] = ['dry-run', 'safe', 'full'];
  if (!VALID_MODES.includes(execution_mode)) {
    return NextResponse.json(
      { error: `O modo de execução deve ser um de: ${VALID_MODES.join(', ')}` },
      { status: 400 }
    );
  }

  // Modo Full exige um token de liberação
  if (execution_mode === 'full' && !clearance_token) {
    return NextResponse.json(
      { error: 'O modo "full" requer um token de liberação do Agente de Validação.' },
      { status: 403 }
    );
  }

  const input: ExecutionRunInput = {
    tenantId: user.tenantId,
    userId: user.id,
    promptPayload,
    risk_level: risk_level || 'medium',
    risk_score: 0, // será derivado dentro do serviço
    execution_mode,
    clearance_token,
    projectId,
    sessionId,
    environment: environment as any,
  };

  const result = await ExecutionTracker.run(input);
  return NextResponse.json(result, { status: 200 });
}

/**
 * GET /api/devos/executions/run
 * Lista execuções recentes para o tenant atual.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const authId = token.sub as string;

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  const runs = await ExecutionTracker.getHistory(user.tenantId, limit);
  return NextResponse.json(runs);
}
