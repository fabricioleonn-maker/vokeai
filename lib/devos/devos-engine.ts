import { prisma } from '../db';
import { DevOsRuntimeGuard } from './runtime-guard';
import { PlannerService } from './planner-service';
import { OrchestratorService } from './orchestrator-service';
import { ExecutorService } from './executor-service';
import { DevOsAuditService } from './audit-service';
import { DevOsContext, ExecutorOutput } from './types';

export type ExecutionStrategy = 'safe' | 'fast' | 'deep';

export class DevOsEngine {
  static async runCycle(
    sessionId: string,
    userId: string,
    strategy: ExecutionStrategy = 'safe'
  ): Promise<{ success: boolean; message: string; nextTaskId?: string; progress?: number }> {
    const startTime = Date.now();

    // 1. SESSION GUARD
    const guard = await DevOsRuntimeGuard.validateSession(sessionId);
    if (!guard.allowed) {
      await DevOsAuditService.log({ sessionId, actor: 'guard', action: 'execution_blocked', status: 'error', reason: guard.reason });
      return { success: false, message: guard.reason || 'Blocked by Guard' };
    }

    const session = await prisma.devOsSession.findUnique({
      where: { id: sessionId },
      include: { tasks: true }
    });
    if (!session) return { success: false, message: 'Session not found' };

    const ctx: DevOsContext = { tenantId: session.tenantId, userId, sessionId };

    // PROGRESS TRACKING
    const totalTasks = session.tasks.length;
    const completedTasks = session.tasks.filter((t: any) => t.status === 'COMPLETED' || t.status === 'SUGGESTION_ONLY').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 2. ORCHESTRATE (Hybrid: deterministic for CRITICAL, LLM for the rest)
    const criticalTask = session.tasks.find((t: any) => t.priority === 'CRITICAL' && t.status === 'PENDING');
    let nextTaskId = criticalTask?.id;

    if (!nextTaskId) {
      const pendingTasks = session.tasks.filter((t: any) => t.status === 'PENDING' || t.status === 'BLOCKED');
      if (pendingTasks.length === 0) {
        // [FIX #3] AUTO-COMPLETE SESSION
        await prisma.devOsSession.update({
          where: { id: sessionId },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });
        return { success: true, message: 'Session completed successfully', progress: 100 };
      }

      const decision = await OrchestratorService.decide(ctx, { sessionId, tasks: session.tasks as any, objective: session.objective });
      nextTaskId = decision.nextTaskId;
    }

    if (!nextTaskId) {
      return { success: true, message: 'No pending tasks could be decided.', progress };
    }

    // [FIX #1] TASK VALIDATION BEFORE EXECUTION
    const taskValidation = await DevOsRuntimeGuard.validateTaskExecution(nextTaskId);
    if (!taskValidation.allowed) {
      await DevOsAuditService.log({ sessionId, taskId: nextTaskId, actor: 'guard', action: 'task_execution_blocked', status: 'error', reason: taskValidation.reason });
      return { success: false, message: taskValidation.reason || 'Task blocked by guard', progress };
    }

    const task = session.tasks.find((t: any) => t.id === nextTaskId)!;

    // [FIX #2] DEPENDENCY VALIDATION
    const dependsOnIds: string[] = (task.dependsOn as string[] | null) ?? [];
    const unmetDeps = dependsOnIds.filter((depId: string) => {
      const dep = session.tasks.find((t: any) => t.id === depId);
      return dep && dep.status !== 'COMPLETED';
    });

    if (unmetDeps.length > 0) {
      await prisma.devOsTask.update({ where: { id: nextTaskId }, data: { status: 'BLOCKED' } });
      await DevOsAuditService.log({ sessionId, taskId: nextTaskId, actor: 'guard', action: 'dependency_unmet', status: 'error', reason: `Blocked by: ${unmetDeps.join(', ')}` });
      return { success: false, message: `Task blocked by unmet dependencies: ${unmetDeps.join(', ')}`, nextTaskId, progress };
    }

    // 3. EXECUTE
    await prisma.devOsTask.update({ where: { id: nextTaskId }, data: { status: 'IN_PROGRESS' } });

    const execution = await ExecutorService.run(ctx, {
      taskId: nextTaskId,
      taskTitle: task.title,
      taskDescription: task.description || '',
      intent: (task as any).intent || '',
      sessionContext: session.objective,
      mode: 'suggest',
      strategy
    });

    // 4. QUALITY GATE (enhanced scoring)
    const qualityScore = this.calculateQualityScore(execution);

    // [FIX #5] DIFFERENTIATE BLOCKED vs FAILED
    let newStatus: string;
    if (qualityScore >= 70) newStatus = 'SUGGESTION_ONLY';
    else if (qualityScore >= 50) newStatus = 'BLOCKED';
    else newStatus = 'FAILED';

    await prisma.devOsTask.update({
      where: { id: nextTaskId },
      data: { qualityScore, status: newStatus }
    });

    // 5. COMMIT CYCLE + MEMORY UPDATE
    const newIteration = session.currentIteration + 1;
    const newProgress = totalTasks > 0 ? Math.round(((completedTasks + (newStatus === 'SUGGESTION_ONLY' ? 1 : 0)) / totalTasks) * 100) : 0;

    // Session Memory: accumulate decisions, patterns and failures
    const currentMemory = (session.memory as any) ?? { decisions: [], patterns: [], previous_failures: [] };
    const memoryEntry = {
      iteration: newIteration,
      taskId: nextTaskId,
      taskTitle: task.title,
      decision: newStatus,
      qualityScore,
      timestamp: new Date().toISOString()
    };

    if (newStatus === 'SUGGESTION_ONLY') {
      currentMemory.decisions.push(memoryEntry);
    } else if (newStatus === 'FAILED' || newStatus === 'BLOCKED') {
      currentMemory.previous_failures.push({ ...memoryEntry, reason: `Quality score too low: ${qualityScore}` });
    }

    // Keep memory bounded to avoid unbounded JSON growth
    if (currentMemory.decisions.length > 50) currentMemory.decisions = currentMemory.decisions.slice(-50);
    if (currentMemory.previous_failures.length > 20) currentMemory.previous_failures = currentMemory.previous_failures.slice(-20);

    await prisma.devOsSession.update({
      where: { id: sessionId },
      data: { currentIteration: newIteration, progress: newProgress, memory: currentMemory }
    });

    await DevOsAuditService.log({
      sessionId,
      taskId: nextTaskId,
      actor: 'auditor',
      action: 'task_audited',
      output: { qualityScore, status: newStatus },
      status: newStatus === 'FAILED' ? 'error' : 'success',
      reason: newStatus === 'SUGGESTION_ONLY' ? 'Passed quality gate' : `Low quality score: ${qualityScore}`,
      durationMs: Date.now() - startTime
    });

    return {
      success: newStatus !== 'FAILED',
      message: newStatus === 'SUGGESTION_ONLY' ? 'Cycle completed successfully' : `Task ${newStatus}: quality score ${qualityScore}/100`,
      nextTaskId,
      progress: newProgress
    };
  }

  // [FIX #4] ENHANCED QUALITY SCORING
  private static calculateQualityScore(execution: ExecutorOutput): number {
    let score = 85;
    if (execution.confidence < 0.7) score -= 20;
    if (execution.suggestedFiles.length === 0) score -= 15;
    if (execution.suggestedFiles.length === 1) score -= 5;
    if (execution.limitations.length > 3) score -= 10;
    if (execution.suggestion.length < 100) score -= 15;
    if (execution.limitations.some(l => l.toLowerCase().includes('não executei'))) score -= 5;
    return Math.max(0, Math.min(100, score));
  }
}
