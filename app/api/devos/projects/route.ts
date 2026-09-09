import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

type AuthUser = { id: string; tenantId?: string };

// GET /api/devos/projects - List projects for the current tenant
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authId = token.sub as string;

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  const projects = await prisma.devOsProject.findMany({
    where: { tenantId: user.tenantId },
    include: {
      _count: { select: { sessions: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(projects);
}

// POST /api/devos/projects - Create a new project
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authId = token.sub as string;

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  const body = await req.json();
  const { name, objective, context, strategy = 'safe' } = body;

  if (!name || !objective) {
    return NextResponse.json({ error: 'Name and Objective are required' }, { status: 400 });
  }

  const project = await prisma.devOsProject.create({
    data: {
      tenantId: user.tenantId,
      name,
      objective,
      context: context || {
        businessGoal: objective,
        constraints: [],
        techStack: [],
        expectedOutcome: ""
      },
      strategy,
      status: 'PLANNING',
      progress: 0
    }
  });

  return NextResponse.json(project, { status: 201 });
}
