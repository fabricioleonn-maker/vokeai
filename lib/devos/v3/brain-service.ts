import { prisma } from '@/lib/db';
import { DevOsDecisionType, DevOsExecutionPattern, DevOsStrategyMode } from '@prisma/client';

export const ProjectBrainService = {
  /**
   * Initializes a new brain for a project with default values.
   */
  async initializeBrain(projectId: string, tenantId: string, objective: string) {
    return prisma.devOsProjectBrain.upsert({
      where: { projectId },
      create: {
        tenantId,
        projectId,
        goalSummary: objective.substring(0, 500),
        constraintsDigest: "Auto-detecting constraints...",
        executionPattern: 'SEQUENTIAL',
        strategyMode: 'SAFE',
        memoryVersion: 1
      },
      update: {} // No-op if exists
    });
  },

  /**
   * Records a strategic decision taken by the cognitive kernel.
   */
  async recordDecision(params: {
    projectId: string;
    tenantId: string;
    brainId: string;
    sessionId?: string;
    taskId?: string;
    type: DevOsDecisionType;
    decision: string;
    reasoning: string;
    impact?: string;
    confidence?: number;
  }) {
    const brain = await prisma.devOsProjectBrain.findUnique({
      where: { id: params.brainId },
      select: { memoryVersion: true }
    });

    if (!brain) throw new Error('Brain not found');

    const log = await prisma.devOsDecisionLog.create({
      data: {
        tenantId: params.tenantId,
        projectId: params.projectId,
        brainId: params.brainId,
        sessionId: params.sessionId,
        taskId: params.taskId,
        type: params.type,
        decision: params.decision,
        reasoning: params.reasoning,
        impact: params.impact,
        confidence: params.confidence || 1.0,
        snapshotVersion: brain.memoryVersion,
        applied: true
      }
    });

    // Update last decision timestamp
    await prisma.devOsProjectBrain.update({
      where: { id: params.brainId },
      data: { lastDecisionAt: new Date() }
    });

    return log;
  },

  /**
   * Fetches the full cognitive context for the planner.
   */
  async getCognitiveContext(projectId: string) {
    return prisma.devOsProjectBrain.findUnique({
      where: { projectId },
      include: {
        decisions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }
};
