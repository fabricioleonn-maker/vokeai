export interface HandoffSnapshot {
  fromAgent: string;
  toAgent: string;
  reason: string;
  contextSnapshot: any;
  recommendedAction?: string;
  riskNotes?: string;
  budgetConsumed: number;
  confidence: number;
}

export class HandoffProtocol {
  /**
   * Standardizes context passing between agents.
   */
  public static createHandoff(params: Omit<HandoffSnapshot, 'handoffId'>): HandoffSnapshot {
    return {
      ...params,
      contextSnapshot: {
        ...params.contextSnapshot,
        _handoff_ts: Date.now(),
        _handoff_source: params.fromAgent
      }
    };
  }
  
  /**
   * Validates if a handoff is allowed based on depth or policy.
   */
  public static isHandoffAllowed(depth: number, maxDepth: number): boolean {
    return depth < maxDepth;
  }
}
