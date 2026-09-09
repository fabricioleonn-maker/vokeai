// Manual type definitions to bypass stale Prisma Client in the current environment
export type DevOsNodeStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
export type DevOsNodeType = 
  | 'INPUT' | 'GOVERNANCE' | 'BUDGET' | 'SCORING' | 'APPROVAL' 
  | 'ORCHESTRATOR' | 'AGENT' | 'AGENT_DECISION' | 'AGENT_HANDOFF' 
  | 'AGENT_MERGE' | 'AGENT_FALLBACK' | 'AGENT_TIMEOUT' | 'EXECUTION' 
  | 'RETRY' | 'REPLAN' | 'COMMIT' | 'FAILURE';

export interface ReactFlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    type: DevOsNodeType;
    status: DevOsNodeStatus;
    metadata?: any;
    duration?: number;
    cost?: number;
  };
  position: { x: number; y: number };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: any;
}

export class ReactFlowAdapter {
  /**
   * Converts a DevOsExecutionGraph to React Flow compatible nodes and edges.
   */
  public static transform(graph: any) {
    const rawNodes = graph.nodes || [];
    const rawEdges = graph.edges || [];

    const nodes: ReactFlowNode[] = rawNodes.map((node: any, index: number) => ({
      id: node.id,
      type: 'devosNode',
      data: {
        label: node.type,
        type: node.type as DevOsNodeType,
        status: node.status as DevOsNodeStatus,
        metadata: node.metadata,
        duration: node.duration,
        cost: node.cost
      },
      // Simple automated layout (horizontal)
      position: { x: index * 250, y: 100 }
    }));

    const edges: ReactFlowEdge[] = rawEdges.map((edge: any) => ({
      id: `e-${edge.fromNodeId}-${edge.toNodeId}`,
      source: edge.fromNodeId,
      target: edge.toNodeId,
      label: edge.condition,
      animated: true,
      style: { stroke: this.getEdgeColor(edge.condition) }
    }));

    return { nodes, edges };
  }

  private static getEdgeColor(condition: string) {
    switch (condition) {
      case 'success': return '#10b981'; // Green
      case 'failure': return '#ef4444'; // Red
      case 'retry': return '#f59e0b';   // Amber
      default: return '#94a3b8';      // Slate
    }
  }
}
