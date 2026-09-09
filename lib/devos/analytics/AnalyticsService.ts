import { prisma } from '@/lib/db';
import { DevOsNodeStatus } from '../types';

export class AnalyticsService {
  /**
   * Calculates Operational ROI and efficiency metrics for a tenant.
   */
  static async getExecutiveSummary(tenantId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Total Executions & Success Rate
    const jobs = await prisma.devOsJob.findMany({
      where: {
        tenantId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        status: true,
        cost: true
      }
    });

    const total = jobs.length;
    const successful = jobs.filter(j => j.status === 'COMPLETED').length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    // 2. Financial Metrics
    const totalCost = jobs.reduce((acc, j) => acc + (j.cost?.toNumber() || 0), 0);
    
    // Estimation logic: 1 AI operational minute saves ~0.5 human hours in some domains.
    // Let's use a simpler heuristic for now: Avg human cost of a task is $15.
    const estimatedSavings = successful * 15 - totalCost;

    // 3. Automation over time (grouped by day)
    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as count,
        SUM(cost) as cost
      FROM "DevOsJob"
      WHERE "tenantId" = ${tenantId}
      AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `;

    return {
      metrics: {
        successRate,
        totalExecutions: total,
        totalCost,
        estimatedSavings,
        humanTimeSaved: successful * 0.5 // 30 mins per successful task
      },
      dailyStats
    };
  }

  static async getAgentPerformance(tenantId: string) {
    // Group execution nodes by agent name/type
    // Requires analysis of DevOsExecutionNode table
    const nodes = await prisma.devOsExecutionNode.findMany({
      where: {
        job: { tenantId },
        type: 'AGENT',
        status: 'DONE',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      select: {
        metadata: true,
        cost: true,
        duration: true
      }
    });

    // Aggregation logic...
    return nodes;
  }
}
