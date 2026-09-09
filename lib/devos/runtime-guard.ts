import { prisma } from '../db';
import { UsageService } from '../core/usage';

export class DevOsRuntimeGuard {
  /**
   * Validates if a session can proceed to execution
   */
  static async validateSession(sessionId: string): Promise<{ allowed: boolean; reason?: string }> {
    const session = await prisma.devOsSession.findUnique({
      where: { id: sessionId },
      include: { tasks: true }
    });

    if (!session) return { allowed: false, reason: 'Session not found' };

    // 1. Anti-Loop Protection
    if (session.currentIteration >= session.maxIterations) {
      return { allowed: false, reason: `Max iterations reached (${session.maxIterations}). Loop protection triggered.` };
    }

    // 2. State Machine Validation
    if (session.status === 'COMPLETED' || session.status === 'FAILED') {
      return { allowed: false, reason: `Session is in a terminal state: ${session.status}` };
    }

    // 3. Quota Enforcement (Synkra Integration)
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      include: { plan: true }
    });
    
    if (!tenant) return { allowed: false, reason: 'Tenant context missing' };
    
    // Limits check
    const planLimits = (tenant.plan?.limits as any) || {};
    const quota = await UsageService.getQuotaStatus(session.tenantId, planLimits);
    if (quota.state === 'EXHAUSTED') {
      return { allowed: false, reason: 'AI Token quota exhausted for this tenant.' };
    }

    return { allowed: true };
  }

  /**
   * Validates state transitions based on an explicit state machine
   */
  static validateTransition(current: string, next: string): boolean {
    const transitions: Record<string, string[]> = {
      'PLANNING': ['ACTIVE', 'FAILED'],
      'ACTIVE': ['PAUSED', 'COMPLETED', 'FAILED', 'BLOCKED'],
      'BLOCKED': ['ACTIVE', 'FAILED'],
      'PAUSED': ['ACTIVE', 'FAILED'],
      'COMPLETED': [], // Terminal
      'FAILED': ['PLANNING'] // Can restart planning
    };

    return transitions[current]?.includes(next) ?? false;
  }

  /**
   * Task sanity check before execution
   */
  static async validateTaskExecution(taskId: string): Promise<{ allowed: boolean; reason?: string }> {
    const task = await prisma.devOsTask.findUnique({ where: { id: taskId } });
    if (!task) return { allowed: false, reason: 'Task not found' };
    
    if (task.status === 'COMPLETED' || task.status === 'SUGGESTION_ONLY') {
      return { allowed: false, reason: 'Task already completed or has a suggestion.' };
    }

    return { allowed: true };
  }
}
