import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PlannerService } from '@/lib/devos/planner-service';
import { DevOsProjectContext } from '@/lib/devos/types';

type AuthUser = { id: string; tenantId?: string };

// POST /api/devos/projects/[id]/generate-plan - Break objective into a session
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authUser = session.user as AuthUser;

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant found' }, { status: 400 });

  const project = await prisma.devOsProject.findUnique({
    where: { id: params.id, tenantId: user.tenantId }
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // 1. Prepare planning context
  const ctx = {
    tenantId: user.tenantId,
    userId: user.id,
    sessionId: 'temp_planning', // Will be updated
    projectId: project.id,
    projectContext: project.context as unknown as DevOsProjectContext,
    strategy: project.strategy as 'safe' | 'fast' | 'deep'
  };

  try {
    // 2. Run Planner
    const plan = await PlannerService.plan(ctx as any, project.objective);

    // 3. Create Session linked to Project
    const devOsSession = await prisma.devOsSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        projectId: project.id,
        objective: project.objective,
        strategy: project.strategy,
        status: 'ACTIVE',
        executionMode: 'manual'
      }
    });

    // 4. Create tasks from plan
    await prisma.devOsTask.createMany({
      data: plan.breakdown.map((t) => ({
        sessionId: devOsSession.id,
        title: t.title,
        description: t.description,
        intent: t.intent,
        priority: t.priority,
        dependsOn: t.dependsOn?.map(i => plan.breakdown[i]?.title) ?? []
      }))
    });

    // 5. Update Project status
    await prisma.devOsProject.update({
      where: { id: project.id },
      data: { status: 'EXECUTING' }
    });

    const refreshedSession = await prisma.devOsSession.findUnique({
      where: { id: devOsSession.id },
      include: { tasks: true }
    });

    return NextResponse.json(refreshedSession, { status: 201 });

  } catch (error: any) {
    console.error('Plan generation failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate plan' }, { status: 500 });
  }
}
