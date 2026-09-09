import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

type AuthUser = { id: string; tenantId?: string; role?: string };

/**
 * GET /api/devos/dashboard
 * Returns global DevOS statistics for the current tenant
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authUser = token as unknown as AuthUser;

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  const [sessions, tasks, auditLogs] = await Promise.all([
    prisma.devOsSession.findMany({
      where: { tenantId: user.tenantId },
      include: { tasks: { select: { status: true, qualityScore: true } }, _count: { select: { auditLogs: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.devOsTask.findMany({
      where: { session: { tenantId: user.tenantId } },
      select: { status: true, qualityScore: true, createdAt: true, updatedAt: true }
    }),
    prisma.devOsAuditLog.findMany({
      where: { session: { tenantId: user.tenantId } },
      select: { tokensUsed: true, durationMs: true, actor: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500 // enough for stats
    })
  ]);

  // Compute metrics
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'ACTIVE' || s.status === 'PLANNING').length;
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
  const blockedSessions = sessions.filter(s => s.status === 'BLOCKED').length;
  const failedSessions = sessions.filter(s => s.status === 'FAILED').length;
  const successRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'SUGGESTION_ONLY').length;
  const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length;
  const failedTasks = tasks.filter(t => t.status === 'FAILED').length;

  const scoresArr = tasks.filter(t => t.qualityScore !== null).map(t => t.qualityScore as number);
  const avgQualityScore = scoresArr.length > 0 ? scoresArr.reduce((a, b) => a + b, 0) / scoresArr.length : null;

  const totalTokens = auditLogs.reduce((sum, l) => sum + (l.tokensUsed ?? 0), 0);
  const durations = auditLogs.filter(l => l.durationMs !== null).map(l => l.durationMs as number);
  const avgDurationMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  // Recent sessions (last 5) for the activity feed
  const recentSessions = sessions.slice(0, 5).map(s => ({
    id: s.id,
    objective: s.objective,
    status: s.status,
    progress: s.progress,
    taskCount: s.tasks.length,
    logCount: s._count.auditLogs,
    createdAt: s.createdAt
  }));

  return NextResponse.json({
    sessions: { total: totalSessions, active: activeSessions, completed: completedSessions, blocked: blockedSessions, failed: failedSessions, successRate },
    tasks: { total: tasks.length, completed: completedTasks, blocked: blockedTasks, failed: failedTasks },
    quality: { avgScore: avgQualityScore ? Math.round(avgQualityScore) : null },
    cost: { totalTokens, estimatedUsd: (totalTokens / 1_000_000) * 3 }, // ~$3 per 1M tokens estimate
    performance: { avgDurationMs: avgDurationMs ? Math.round(avgDurationMs) : null },
    recentSessions
  });
}
