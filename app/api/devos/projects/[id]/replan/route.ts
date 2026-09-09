import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PlannerService } from '@/lib/devos/planner-service';
import { DevOsProjectContext } from '@/lib/devos/types';

type AuthUser = { id: string; tenantId?: string };

// POST /api/devos/projects/[id]/replan - Update plan based on new context or failures
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const authUser = session.user as AuthUser;

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user?.tenantId) return NextResponse.json({ error: 'No tenant found' }, { status: 400 });

  const project = await prisma.devOsProject.findUnique({
    where: { id: params.id, tenantId: user.tenantId },
    include: { sessions: { take: 1, orderBy: { createdAt: 'desc' } } }
  });

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // 1. Prepare planning context with history awareness
  const ctx = {
    tenantId: user.tenantId,
    userId: user.id,
    sessionId: project.sessions[0]?.id || 'replan_new',
    projectId: project.id,
    projectContext: project.context as unknown as DevOsProjectContext,
    strategy: project.strategy as 'safe' | 'fast' | 'deep'
  };

  try {
    // 2. Run Planner with explicit REPLAN mode hint
    const objective = `REPLANNING: ${project.objective}. 
    Current State: ${project.sessions[0]?.status || 'no_session'}. 
    Please adjust the remaining work.`;
    
    const plan = await PlannerService.plan(ctx as any, objective);

    // 3. Update Project status to PLANNING while we work
    await prisma.devOsProject.update({
      where: { id: project.id },
      data: { status: 'PLANNING' }
    });

    // 4. Create NEW session (or add to existing? usually new session is cleaner for history)
    const newSession = await prisma.devOsSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        projectId: project.id,
        objective: `REPLAN: ${project.objective}`,
        strategy: project.strategy,
        status: 'ACTIVE',
        executionMode: 'manual'
      }
    });

    // 5. Populate new tasks
    await prisma.devOsTask.createMany({
      data: plan.breakdown.map((t) => ({
        sessionId: newSession.id,
        title: t.title,
        description: t.description,
        intent: t.intent,
        priority: t.priority,
        dependsOn: t.dependsOn?.map(i => plan.breakdown[i]?.title) ?? []
      }))
    });

    // 6. Return back to executing
    await prisma.devOsProject.update({
      where: { id: project.id },
      data: { status: 'EXECUTING' }
    });

    return NextResponse.json(newSession, { status: 201 });

  } catch (error: any) {
    console.error('Replanning failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to replan' }, { status: 500 });
  }
}
