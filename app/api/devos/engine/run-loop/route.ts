import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { DevOsEngine } from '@/lib/devos/devos-engine';
import { DevOsAuditService } from '@/lib/devos/audit-service';

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED']);
const BLOCKING_STATUSES = new Set(['BLOCKED', 'COMPLETED', 'FAILED']);

/**
 * POST /api/devos/engine/run-loop
 * Executes cycles automatically until a terminal/blocking state is reached
 * or maxIterations is exceeded.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authId = token.sub as string;

  const { sessionId, strategy = 'safe' } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });
  const cycleResults: { cycle: number; success: boolean; message: string; progress?: number }[] = [];
  let cycleCount = 0;
  let shouldStop = false;

  while (!shouldStop) {
    cycleCount++;

    // Reload session state before every cycle to respect external changes
    const currentSession = await prisma.devOsSession.findUnique({
      where: { id: sessionId },
      select: { status: true, currentIteration: true, maxIterations: true, executionMode: true }
    });

    if (!currentSession) {
      cycleResults.push({ cycle: cycleCount, success: false, message: 'Session not found' });
      break;
    }

    // Break if session mode was switched to manual externally
    if (currentSession.executionMode === 'manual' && cycleCount > 1) {
      cycleResults.push({ cycle: cycleCount, success: true, message: 'Loop paused: switched to manual mode' });
      break;
    }

    // Guard: terminal state
    if (TERMINAL_STATUSES.has(currentSession.status)) {
      cycleResults.push({ cycle: cycleCount, success: true, message: `Session in terminal state: ${currentSession.status}` });
      break;
    }

    // Guard: iteration overflow
    if (currentSession.currentIteration >= currentSession.maxIterations) {
      await prisma.devOsSession.update({ where: { id: sessionId }, data: { status: 'FAILED' } });
      await DevOsAuditService.log({ sessionId, actor: 'guard', action: 'loop_limit_exceeded', status: 'error', reason: `Reached max iterations: ${currentSession.maxIterations}` });
      cycleResults.push({ cycle: cycleCount, success: false, message: `Loop aborted: max iterations (${currentSession.maxIterations}) reached` });
      break;
    }

    // Run one cycle
    const result = await DevOsEngine.runCycle(sessionId, user.id, strategy);
    cycleResults.push({ cycle: cycleCount, ...result });

    // Reload status to check if it's now blocking
    const afterCycle = await prisma.devOsSession.findUnique({
      where: { id: sessionId },
      select: { status: true }
    });

    if (!afterCycle || BLOCKING_STATUSES.has(afterCycle.status)) {
      shouldStop = true;
    }

    // Safety cap: max 20 cycles per API call
    if (cycleCount >= 20) {
      cycleResults.push({ cycle: cycleCount + 1, success: false, message: 'API safety cap reached (20 cycles per call)' });
      shouldStop = true;
    }
  }

  const finalSession = await prisma.devOsSession.findUnique({
    where: { id: sessionId },
    select: { status: true, progress: true, currentIteration: true }
  });

  return NextResponse.json({ cycles: cycleCount, results: cycleResults, sessionState: finalSession });
}
