import { FailureInsight } from './failure-analyzer';
import { KnowledgeMiner } from './knowledge-miner';

export type StrategyType = 
  | 'retry_same' 
  | 'retry_modified' 
  | 'split_execution' 
  | 'fallback' 
  | 'abort';

export interface ExecutionStrategy {
  strategy_type: StrategyType;
  modifications: {
    payload?: any;
    priority?: number;
    delayMinutes?: number;
  };
  confidence: number;
  source: 'history' | 'heuristic';
  reasoning?: string;
}

export class StrategyGenerator {
  private static instance: StrategyGenerator;
  private miner: KnowledgeMiner;

  private constructor() {
    this.miner = KnowledgeMiner.getInstance();
  }

  public static getInstance(): StrategyGenerator {
    if (!StrategyGenerator.instance) {
      StrategyGenerator.instance = new StrategyGenerator();
    }
    return StrategyGenerator.instance;
  }

  /**
   * Generates a new execution strategy based on failure insight and historical intelligence.
   */
  async generateStrategy(insight: FailureInsight, currentPayload: any, tenantId: string): Promise<ExecutionStrategy> {
    
    // 1. Learning Layer: Check for structural failures (History)
    const isStructural = await this.miner.isStructuralFailure(insight.root_cause || 'UNKNOWN', tenantId);
    if (isStructural) {
      return {
        strategy_type: 'abort',
        modifications: {},
        confidence: 0.98,
        source: 'history',
        reasoning: 'Failure pattern identified as structurally unrecoverable based on historical analysis.'
      };
    }

    // 2. Learning Layer: Check for high-success patterns (History)
    const history = await this.miner.getPreferredStrategy(insight.root_cause || 'UNKNOWN', tenantId);
    if (history && history.successRate > 0.45) {
      return {
        strategy_type: history.strategyType as StrategyType,
        modifications: {
          priority: (currentPayload?.priority || 5) + 2,
          delayMinutes: 10
        },
        confidence: history.successRate,
        source: 'history',
        reasoning: `Strategy selected based on ${(history.successRate * 100).toFixed(0)}% historical success rate.`
      };
    }

    // 3. Heuristic Layer (Legacy)
    // 1. Transient -> Simple Retry Same
    if (insight.failure_type === 'transient') {
      return {
        strategy_type: 'retry_same',
        modifications: {
          delayMinutes: 5,
          priority: (currentPayload?.priority || 5) + 1 
        },
        confidence: 0.95,
        source: 'heuristic'
      };
    }

    // 2. Validation Failed -> Try to modify payload
    if (insight.failure_type === 'validation') {
      return {
        strategy_type: 'retry_modified',
        modifications: {
          payload: { ...currentPayload, _original_failure: insight.root_cause, _suggestion: 'FIX_STRUCTURE' },
          priority: 7,
          delayMinutes: 10
        },
        confidence: 0.7,
        source: 'heuristic'
      };
    }

    // 3. Dependency Missing -> Fallback
    if (insight.failure_type === 'dependency') {
      return {
        strategy_type: 'fallback',
        modifications: {
          payload: { ...currentPayload, use_fallback: true },
          priority: 4, 
          delayMinutes: 30
        },
        confidence: 0.6,
        source: 'heuristic'
      };
    }

    // Default: Abort if confidence is low or security risk
    if (insight.failure_type === 'security' || insight.failure_type === 'logic') {
      return {
        strategy_type: 'abort',
        modifications: {},
        confidence: 1.0,
        source: 'heuristic'
      };
    }

    return {
      strategy_type: 'retry_modified',
      modifications: {
        delayMinutes: 15,
        priority: 6
      },
      confidence: 0.5,
      source: 'heuristic'
    };
  }
}
