import { prisma } from '@/lib/db';

import { NodeType, NodeStatus } from '@/lib/devos/types';

export class ExecutionGraphBuilder {
  /**
   * Initializes a standard execution graph for a new run.
   */
  public static async createGraph(tenantId: string, jobId: string, runId: string): Promise<string> {
    const nodes = [
      { id: 'node-input', type: 'INPUT', status: 'PENDING', label: 'Input Payload' },
      { id: 'node-governance', type: 'GOVERNANCE', status: 'PENDING', label: 'Governance Policy' },
      { id: 'node-budget', type: 'BUDGET', status: 'PENDING', label: 'Budget Guard' },
      { id: 'node-scoring', type: 'SCORING', status: 'PENDING', label: 'Scoring Engine' },
      { id: 'node-approval', type: 'APPROVAL', status: 'PENDING', label: 'Approval Gate' },
      { id: 'node-orchestra', type: 'ORCHESTRATOR', status: 'PENDING', label: 'Agent Orchestrator' },
      { id: 'node-commit', type: 'COMMIT', status: 'PENDING', label: 'Final Commit' }
    ];

    const edges = [
      { id: 'e1', from: 'node-input', to: 'node-governance' },
      { id: 'e2', from: 'node-governance', to: 'node-budget' },
      { id: 'e3', from: 'node-budget', to: 'node-scoring' },
      { id: 'e4', from: 'node-scoring', to: 'node-approval' },
      { id: 'e5', from: 'node-approval', to: 'node-orchestra' },
      { id: 'e6', from: 'node-orchestra', to: 'node-commit' }
    ];

    const graph = await (prisma as any).devOsExecutionGraph.create({
      data: {
        tenantId,
        jobId,
        runId,
        nodes,
        edges,
        metadata: { version: '1.7' }
      }
    });

    return graph.id;
  }

  /**
   * Dynamically adds a node to an existing graph.
   */
  public static async addNode(runId: string, node: { id: string, type: NodeType, label: string, metadata?: any }) {
    const graph = await (prisma as any).devOsExecutionGraph.findUnique({ where: { runId } });
    if (!graph) return;

    const nodes = [...(graph.nodes as any[]), { ...node, status: 'PENDING' }];
    await (prisma as any).devOsExecutionGraph.update({
      where: { id: graph.id },
      data: { nodes }
    });
  }

  /**
   * Dynamically adds an edge to an existing graph.
   */
  public static async addEdge(runId: string, from: string, to: string, label?: string) {
    const graph = await (prisma as any).devOsExecutionGraph.findUnique({ where: { runId } });
    if (!graph) return;

    const edges = [...(graph.edges as any[]), { id: `e-${Date.now()}`, from, to, label }];
    await (prisma as any).devOsExecutionGraph.update({
      where: { id: graph.id },
      data: { edges }
    });
  }
}
