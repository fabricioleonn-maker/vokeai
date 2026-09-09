import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { PromptAgent } from '@/lib/devos/agents/prompt-agent';
import type { PromptAgentInput, Environment } from '@/lib/devos/agents/prompt-agent.types';

type AuthUser = { id: string; tenantId?: string; role?: string };

/**
 * POST /api/devos/prompt-agent
 * Transforms free-form user intent into a structured, security-governed technical prompt.
 */
export async function POST(req: NextRequest) {
  // Debug profundo para capturar por que o token é nulo
  const secret = process.env.NEXTAUTH_SECRET;
  const token = await getToken({ 
    req, 
    secret
  });
  
  if (!token) {
    const cookies = req.headers.get('cookie') || 'NONE';
    console.error(`[AUTH-DEBUG] 401 Unauthorized at PromptAgent`);
    console.log(`[AUTH-DEBUG] NEXTAUTH_URL from process.env: ${process.env.NEXTAUTH_URL}`);
    console.log(`[AUTH-DEBUG] NEXTAUTH_SECRET (first/last 4): ${secret?.substring(0, 4)}...${secret?.substring(secret?.length - 4)}`);
    console.log(`[AUTH-DEBUG] Cookies present: ${cookies.includes('next-auth.session-token') ? 'YES (next-auth.session-token)' : 'NO'}`);
    if (cookies !== 'NONE') {
       console.log(`[AUTH-DEBUG] Raw Cookie Sample: ${cookies.substring(0, 50)}...`);
    }

    return NextResponse.json({ 
      error: 'Unauthorized',
      details: 'Falha na validação do token JWT. Verifique os logs do servidor [AUTH-DEBUG].'
    }, { status: 401 });
  }

  const authUser = token as unknown as AuthUser;

  if (!authUser.tenantId) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
  }

  const body = await req.json();
  const { intent, context } = body;

  // Validate required fields
  if (!intent || typeof intent !== 'string') {
    return NextResponse.json(
      { error: 'Field "intent" is required and must be a string.' },
      { status: 400 }
    );
  }

  if (!context?.project || !context?.module || !context?.environment) {
    return NextResponse.json(
      { error: 'Fields "context.project", "context.module" and "context.environment" are required.' },
      { status: 400 }
    );
  }

  const VALID_ENVS: Environment[] = ['dev', 'staging', 'prod'];
  if (!VALID_ENVS.includes(context.environment)) {
    return NextResponse.json(
      { error: `"context.environment" must be one of: ${VALID_ENVS.join(', ')}` },
      { status: 400 }
    );
  }

  const input: PromptAgentInput = {
    intent: intent.trim(),
    context: {
      project: context.project.trim(),
      module: context.module.trim(),
      environment: context.environment as Environment,
    },
    tenantId: authUser.tenantId,
    userId: authUser.id,
  };

  const result = await PromptAgent.process(input);

  if (result.status !== 'success') {
    console.error(`[PromptAgent-ERROR] Processing failed:`, result.error);
    console.log(`[PromptAgent-DEBUG] Full result payload:`, JSON.stringify(result, null, 2));
  }
  
  const statusCode = result.status === 'success' ? 200 : 500;
  return NextResponse.json(result, { status: statusCode });
}
