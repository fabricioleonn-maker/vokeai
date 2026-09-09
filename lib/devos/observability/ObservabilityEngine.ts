import { prisma } from '@/lib/db';
import { NodeStatus, NodeType } from '../types';

export class ObservabilityEngine {
  /**
   * Marks a graph node as RUNNING and records start time.
   */
  public static async onNodeStart(runId: string, nodeType: NodeType, metadata?: any, nodeId?: string): Promise<void> {
    const graph = await (prisma as any).devOsExecutionGraph.findUnique({
      where: { runId }
    });

    if (!graph) return;

    const nodes = (graph.nodes as any[]).map(node => {
      const isTarget = nodeId ? node.id === nodeId : node.type === nodeType;
      if (isTarget) {
        return { 
          ...node, 
          status: 'RUNNING', 
          timestampStart: new Date(),
          metadata: { ...node.metadata, ...metadata }
        };
      }
      return node;
    });

    await (prisma as any).devOsExecutionGraph.update({
      where: { id: graph.id },
      data: { nodes }
    });
  }

  /**
   * Marks a graph node as DONE or FAILED and records metrics.
   */
  public static async onNodeEnd(
    runId: string, 
    nodeType: NodeType, 
    status: NodeStatus, 
    metrics?: { cost?: number; risk?: number; durationMs?: number; metadata?: any },
    nodeId?: string
  ): Promise<void> {
    const graph = await (prisma as any).devOsExecutionGraph.findUnique({
      where: { runId }
    });

    if (!graph) return;

    const nodes = (graph.nodes as any[]).map(node => {
      const isTarget = nodeId ? node.id === nodeId : node.type === nodeType;
      if (isTarget) {
        return { 
          ...node, 
          status, 
          timestampEnd: new Date(),
          duration: metrics?.durationMs || (node.timestampStart ? Date.now() - new Date(node.timestampStart).getTime() : 0),
          cost: metrics?.cost,
          risk: metrics?.risk,
          metadata: { ...node.metadata, ...metrics?.metadata }
        };
      }
      return node;
    });

    await (prisma as any).devOsExecutionGraph.update({
      where: { id: graph.id },
      data: { nodes }
    });

    // If critical failure, record in JobRun as well
    if (status === 'FAILED') {
      await (prisma as any).devOsJobRun.update({
        where: { id: runId },
        data: { status: 'FAILED' }
      });
    }
  }

  /**
   * Records aggregate metrics for the entire run.
   */
  public static async recordFinalMetrics(runId: string, totalCost: number, totalDuration: number): Promise<void> {
    await (prisma as any).devOsJobRun.update({
      where: { id: runId },
      data: {
        actualCost: totalCost,
        actualDurationMs: totalDuration,
        completedAt: new Date()
      }
    });
  }
}
