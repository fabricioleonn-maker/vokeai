import { prisma } from '@/lib/db';
import { DevOsReplanMode, DevOsDecisionType } from '@prisma/client';
import { PlannerService } from '../planner-service';
import { ProjectBrainService } from './brain-service';
import { ProjectHealthService } from './health-service';

export const ReplanServiceV2 = {
  /**
   * Executes an incremental replan based on the specified mode.
   * Does NOT destroy completed tasks/sessions.
   */
  async executeReplan(projectId: string, mode: DevOsReplanMode, reason: string) {
    const project = await prisma.devOsProject.findUnique({
      where: { id: projectId },
      include: { brain: true, health: true }
    });

    if (!project || !project.brain) throw new Error('Project/Brain not found');

    // 1. Record the replan event in Health
    await ProjectHealthService.recordEvent(projectId, 'REPLAN');

    // 2. Log the strategic decision in Brain
    await ProjectBrainService.recordDecision({
      tenantId: project.tenantId,
      projectId: project.id,
      brainId: project.brain.id,
      type: 'REPLAN',
      decision: `Initiating ${mode} replan cycle.`,
      reasoning: reason,
      impact: 'Adjustment of the remaining tactical execution path.',
      confidence: 0.95
    });

    // 3. Prepare the new directive for the Planner
    const directive = `REPLAN_MODE: ${mode}. REASON: ${reason}. 
    Goal: ${project.brain.goalSummary}. 
    History: Preserve completed progress. 
    Focus: ${mode === 'RECOVERY' ? 'Find workaround for current failure' : 'Optimize remaining tasks'}`;

    // 4. Call Planner (it will now generate a Delta plan)
    const ctx = {
      tenantId: project.tenantId,
      userId: 'system',
      sessionId: 'replan_v3',
      projectId: project.id,
      projectContext: project.context,
      strategy: project.strategy
    };

    const newPlan = await PlannerService.plan(ctx as any, directive);

    // 5. Create NEW session (clean slate for the next tactical steps)
    const newSession = await prisma.devOsSession.create({
      data: {
        tenantId: project.tenantId,
        userId: 'system',
        projectId: project.id,
        objective: `REPLAN [${mode}]: ${project.objective}`,
        strategy: project.strategy,
        status: 'ACTIVE',
        executionMode: 'auto'
      }
    });

    // 6. Populate tasks
    await prisma.devOsTask.createMany({
      data: newPlan.breakdown.map((t) => ({
        sessionId: newSession.id,
        title: t.title,
        description: t.description,
        intent: t.intent,
        priority: t.priority,
        dependsOn: t.dependsOn?.map(i => newPlan.breakdown[i]?.title) ?? []
      }))
    });

    return {
      sessionId: newSession.id,
      mode,
      newTasks: newPlan.breakdown.length
    };
  }
};
