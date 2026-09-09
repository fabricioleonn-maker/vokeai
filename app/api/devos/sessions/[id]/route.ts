import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DevOsEngine } from '@/lib/devos/devos-engine';
import { PlannerService } from '@/lib/devos/planner-service';

type AuthUser = { id: string; name?: string | null; email?: string | null; role?: string; tenantId?: string };

// GET /api/devos/sessions/[id] - Get session details with tasks and audit logs
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const devosSession = await prisma.devOsSession.findUnique({
    where: { id: params.id },
    include: {
      tasks: { orderBy: { createdAt: 'asc' } },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 }
    }
  });

  if (!devosSession) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(devosSession);
}

// POST /api/devos/sessions/[id]/run - Trigger one execution cycle
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const strategy = body.strategy || 'safe';
  const user = session.user as AuthUser;

  const result = await DevOsEngine.runCycle(params.id, user.id, strategy);

  return NextResponse.json(result);
}
