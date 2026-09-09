import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { ValidatorAgent } from '@/lib/devos/agents/validator-agent';
import type { ValidatorInput } from '@/lib/devos/agents/validator-agent.types';

/**
 * POST /api/devos/validator
 * Validates a PromptAgent payload and decides if execution is safe.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authId = token.sub as string;

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });

  const body = await req.json();
  const { promptPayload, sessionId } = body;

  if (!promptPayload?.prompt || !promptPayload?.metadata) {
    return NextResponse.json(
      { error: 'Field "promptPayload" is required and must be a valid PromptAgent output.' },
      { status: 400 }
    );
  }

  const input: ValidatorInput = {
    promptPayload,
    tenantId: user.tenantId,
    userId: user.id,
    sessionId: sessionId || undefined,
  };

  const result = await ValidatorAgent.validate(input);
  return NextResponse.json(result, { status: 200 });
}
