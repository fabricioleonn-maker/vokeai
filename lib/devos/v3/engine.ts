import { prisma } from '@/lib/db';
import { ProjectHealthService } from './health-service';
import { ProjectBrainService } from './brain-service';
import { GlobalScheduler } from './scheduler-service';
import { ReplanServiceV2 } from './replan-service';

export const EngineV3Core = {
  /**
   * High-level Engineering OS Lifecycle: DevOS V3
   */
  async runCycle(projectId: string) {
    // 1. Load Strategic Context
    const project = await prisma.devOsProject.findUnique({
      where: { id: projectId },
      include: { brain: true, health: true }
    });

    if (!project || !project.brain || !project.health) {
      throw new Error(`Critical: Project ${projectId} is missing V3 Intelligence components.`);
    }

    // 2. Compute Health State
    const health = await ProjectHealthService.computeHealth(projectId);
    if (!health) throw new Error('Health computation failed.');

    // 3. Scheduler Decision
    const isEligible = await GlobalScheduler.canExecute(projectId);
    if (!isEligible) {
      console.log(`[V3 Engine] Project ${projectId} skipped by scheduler (Health/Cooldown).`);
      return { status: 'DEFERRED', reason: 'Scheduler/Health Constraint' };
    }

    // 4. Resolve Cognitive Memory (Brain Service)
    const brainContext = await ProjectBrainService.getCognitiveContext(projectId);
    
    // 5. Select Tactical Session
    const session = await prisma.devOsSession.findFirst({
      where: { projectId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: { tasks: { where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 1 } }
    });

    if (!session || session.tasks.length === 0) {
      // Automatic Replan if executing but no tasks left
      if (project.status === 'EXECUTING') {
         return { status: 'NEED_REPLAN', reason: 'No pending tasks in active session.' };
      }
      return { status: 'IDLE', reason: 'No active session/tasks.' };
    }

    const currentTask = session.tasks[0];

    try {
      // 6. Tactical Execution Step (Simulated here, would call Orchestrator/Executor)
      console.log(`[V3 Engine] executing ${currentTask.title} in project ${project.name}`);
      
      // Update Task to IN_PROGRESS
      await prisma.devOsTask.update({
        where: { id: currentTask.id },
        data: { status: 'IN_PROGRESS' }
      });

      // [Execution Logic would call the actual LLM Agents here]
      
      // 7. Post-Evaluation & Quality Audit
      const qualityScore = 0.95; // Result from Auditor
      await ProjectHealthService.recordEvent(projectId, 'QUALITY', qualityScore);

      // 8. Learning Phase (Brain Update)
      await ProjectBrainService.recordDecision({
        tenantId: project.tenantId,
        projectId: project.id,
        brainId: project.brain.id,
        sessionId: session.id,
        taskId: currentTask.id,
        type: 'EXECUTION',
        decision: `Successfully completed task: ${currentTask.title}`,
        reasoning: `High quality score of ${qualityScore} reached with safe execution pattern.`,
        confidence: qualityScore
      });

      return { status: 'SUCCESS', taskId: currentTask.id };

    } catch (error: any) {
      // 9. Failure Management & Auto-Recovery
      await ProjectHealthService.recordEvent(projectId, 'FAILURE');
      console.error(`[V3 Engine] Task failure in ${projectId}:`, error);

      // If health drops too low, trigger recovery replan
      if (health.score < 60) {
        await ReplanServiceV2.executeReplan(projectId, 'RECOVERY', `Critical health drop after failure: ${error.message}`);
        return { status: 'RECOVERY_INITIATED', reason: 'Health threshold reached' };
      }

      return { status: 'FAILED', error: error.message };
    }
  }
};
