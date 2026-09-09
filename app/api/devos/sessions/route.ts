import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getToken } from 'next-auth/jwt';
import { PlannerService } from '@/lib/devos/planner-service';
import { DevOsAuditService } from '@/lib/devos/audit-service';

type AuthUser = { id: string; name?: string | null; email?: string | null; role?: string; tenantId?: string };

// POST /api/devos/sessions - Create a new DevOS session and trigger the planner
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authId = token.sub as string;
  const authTenantId = token.tenantId as string;

  const user = await prisma.user.findUnique({ where: { id: authId }, include: { tenant: true } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant found' }, { status: 400 });

  const { objective, strategy = 'safe', maxIterations = 20 } = await req.json();
  if (!objective) return NextResponse.json({ error: 'Objective is required' }, { status: 400 });

  // 1. Create session
  const devosSession = await prisma.devOsSession.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      objective,
      strategy,
      maxIterations,
      status: 'PLANNING'
    }
  });

  // 2. Run Planner to decompose the objective
  const ctx = { tenantId: user.tenantId, userId: user.id, sessionId: devosSession.id };
  const plan = await PlannerService.plan(ctx, objective);

  // 3. Create tasks from plan
  await prisma.devOsTask.createMany({
    data: plan.breakdown.map((t, idx) => ({
      sessionId: devosSession.id,
      title: t.title,
      description: t.description,
      intent: t.intent,
      priority: t.priority,
      dependsOn: t.dependsOn?.map(i => plan.breakdown[i]?.title) ?? []
    }))
  });

  // 4. Activate session
  await prisma.devOsSession.update({
    where: { id: devosSession.id },
    data: { status: 'ACTIVE' }
  });

  const updatedSession = await prisma.devOsSession.findUnique({
    where: { id: devosSession.id },
    include: { tasks: true }
  });

  return NextResponse.json(updatedSession, { status: 201 });
}

// GET /api/devos/sessions - List sessions for the current tenant
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const authId = token.sub as string;
  const authTenantId = token.tenantId as string;

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  const sessions = await prisma.devOsSession.findMany({
    where: { tenantId: user.tenantId },
    include: { tasks: { select: { id: true, status: true, priority: true } }, _count: { select: { auditLogs: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return NextResponse.json(sessions);
}
