import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

// GET /api/devos/projects/[id] - Fetch project details with sessions
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authId = token.sub as string;

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  const project = await prisma.devOsProject.findUnique({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      sessions: {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { tasks: true } } }
      },
      brain: {
        include: {
          decisions: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      },
      health: true
    }
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  return NextResponse.json(project);
}

// PATCH /api/devos/projects/[id] - Update project metadata
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authId = token.sub as string;

  const user = await prisma.user.findUnique({ where: { id: authId } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

  const body = await req.json();
  const { name, objective, context, strategy, status } = body;

  const project = await prisma.devOsProject.update({
    where: { id: params.id, tenantId: user.tenantId },
    data: {
      name,
      objective,
      context,
      strategy,
      status
    }
  });

  return NextResponse.json(project);
}
