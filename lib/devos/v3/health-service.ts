import { prisma } from '@/lib/db';
import { DevOsRiskLevel } from '@prisma/client';

export const ProjectHealthService = {
  /**
   * Calculates and updates the health score for a project based on the mandatory Staff formula.
   */
  async computeHealth(projectId: string) {
    const health = await prisma.devOsProjectHealth.findUnique({
      where: { projectId }
    });

    if (!health) return null;

    // MANDATORY formula:
    // HealthScore = 100 
    // - (blockersCount * 12) 
    // - (failedTasksCount * 8) 
    // - (replanCount * 5) 
    // - ((1 - successRate) * 20) 
    // - ((1 - avgTaskQuality) * 20) 
    // - ((1 - stability) * 15)

    const score = Math.max(0, Math.min(100, Math.round(
      100 
      - (health.blockersCount * 12)
      - (health.failedTasksCount * 8)
      - (health.replanCount * 5)
      - ((1 - health.successRate) * 20)
      - ((1 - health.avgTaskQuality) * 20)
      - ((1 - health.stability) * 15)
    )));

    // Classification:
    // LOW -> score >= 75
    // MEDIUM -> 50–74
    // HIGH -> < 50
    let riskLevel: DevOsRiskLevel = 'LOW';
    if (score < 50) riskLevel = 'HIGH';
    else if (score < 75) riskLevel = 'MEDIUM';

    const updatedHealth = await prisma.devOsProjectHealth.update({
      where: { id: health.id },
      data: {
        score,
        riskLevel
      }
    });

    return updatedHealth;
  },

  /**
   * Record a failure or blocker event and re-trigger health computation
   */
  async recordEvent(projectId: string, type: 'FAILURE' | 'BLOCKER' | 'REPLAN' | 'SUCCESS_RATE' | 'QUALITY', value?: number) {
    const data: any = {};
    if (type === 'FAILURE') data.failedTasksCount = { increment: 1 };
    if (type === 'BLOCKER') {
      data.blockersCount = { increment: 1 };
      data.lastBlockedAt = new Date();
    }
    if (type === 'REPLAN') {
      data.replanCount = { increment: 1 };
      data.lastReplanAt = new Date();
    }
    if (type === 'SUCCESS_RATE' && value !== undefined) data.successRate = value;
    if (type === 'QUALITY' && value !== undefined) data.avgTaskQuality = value;

    await prisma.devOsProjectHealth.update({
      where: { projectId },
      data
    });

    return this.computeHealth(projectId);
  }
};
