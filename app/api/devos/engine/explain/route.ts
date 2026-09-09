import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { callLLM } from '@/lib/agents/llm-service';

/**
 * POST /api/devos/engine/explain
 * Asks the engine to explain the last decision for a session.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authId = token.sub as string;

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const devSession = await prisma.devOsSession.findUnique({
    where: { id: sessionId },
    include: {
      tasks: { orderBy: { updatedAt: 'desc' }, take: 5 },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 }
    }
  });

  if (!devSession) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const lastOrchLog = devSession.auditLogs.find((l: any) => l.actor === 'orchestrator');
  const lastExecLog = devSession.auditLogs.find((l: any) => l.actor === 'executor');
  const lastGuardLog = devSession.auditLogs.find((l: any) => l.actor === 'guard');

  const context = `
Session Objective: ${devSession.objective}
Session Status: ${devSession.status}
Current Iteration: ${devSession.currentIteration}/${devSession.maxIterations}
Progress: ${devSession.progress}%

Last Orchestrator Decision: ${JSON.stringify(lastOrchLog?.output ?? {})}
Last Execution Result: ${JSON.stringify(lastExecLog?.output ?? {})}
Last Guard Action: ${lastGuardLog ? `${lastGuardLog.action} — ${lastGuardLog.reason}` : 'None'}

Recent Tasks:
${devSession.tasks.map((t: any) => `- ${t.title}: ${t.status} (score: ${t.qualityScore ?? 'N/A'})`).join('\n')}
  `.trim();

  const tenant = await prisma.tenant.findUnique({ where: { id: devSession.tenantId } });

  const response = await callLLM({
    systemPrompt: 'You are the DevOS Explainer. Your job is to translate technical system decisions into clear, human-readable explanations for developers. Always respond with valid JSON.',
    conversationHistory: [
      { role: 'user', content: `Explain in clear, concise terms what the DevOS system decided last and why. Focus on: what task was chosen, why, what the result was, and if something is blocking progress, what the user should do. Be direct and specific.\n\nContext:\n${context}` }
    ],
    tenantContext: {
      name: tenant?.name || 'Unknown',
      plan: tenant?.planId || 'Standard'
    }
  });

  let explanation: { decision: string; reason: string; confidence: number; blockerAdvice?: string };
  try {
    explanation = JSON.parse(response.content);
  } catch {
    explanation = {
      decision: response.content.substring(0, 200),
      reason: 'Parsed from free-form LLM response',
      confidence: 0.7
    };
  }

  return NextResponse.json({ explanation, sessionStatus: devSession.status, progress: devSession.progress });
}
