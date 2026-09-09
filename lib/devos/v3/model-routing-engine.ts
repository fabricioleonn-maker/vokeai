import { PerformanceMiner, PerformanceStats } from './performance-miner';

export type RoutingMode = 'cost_first' | 'performance_first' | 'balanced';
export type ComplexityTier = 'low' | 'medium' | 'high';

export interface RoutingContext {
  fingerprint: string;
  module: string;
  jobType?: string; // Added for Phase 11
  complexity: ComplexityTier;
  routingMode: RoutingMode;
  attempts: number;
  errorCode?: string; // Added for Phase 11
  budgetConstrained?: boolean; // Added for Phase 12 Auto-Downgrade
  persona?: string; // Added for Phase 13 Dynamic Routing
}

export interface RoutingDecision {
  selectedModel: string;
  reason: string;
  confidence: number;
  routingMode: RoutingMode;
  isHeuristic: boolean;
}

export class ModelRoutingEngine {
  // Pool of available models grouped logically
  private static readonly CHEAP_MODEL = 'gpt-4o-mini';
  private static readonly PREMIUM_MODEL = 'gpt-4o'; // Or claude-3-5-sonnet

  /**
   * Evaluates historical performance and current context to decide which model to use.
   */
  public static async selectModel(context: RoutingContext): Promise<RoutingDecision> {
    
    // 1. Fetch historical efficiency for this exact fingerprint
    const history = await PerformanceMiner.getModelPerformanceForFingerprint(context.fingerprint);

    // 2. High Attempts? Promote immediately, bypassing efficiency checks.
    // If a job failed multiple times, cheap models aren't working. Structural promotion.
    if (context.attempts >= 2 && !context.budgetConstrained) { // Budget constraint prevents promotion
      return {
        selectedModel: this.PREMIUM_MODEL,
        reason: 'PROMOTION_DUE_TO_RETRIES',
        confidence: 0.9,
        routingMode: 'performance_first',
        isHeuristic: true
      };
    }

    // --- PHASE 12: BUDGET CONSTRAINT ---
    if (context.budgetConstrained) {
       return {
         selectedModel: this.CHEAP_MODEL,
         reason: 'BUDGET_ENFORCED_DOWNGRADE',
         confidence: 0.6,
         routingMode: 'cost_first',
         isHeuristic: true
       };
    }

    // --- PHASE 13: PERSONA-BASED ROUTING ---
    if (context.persona === 'COST_OPTIMIZED' && context.complexity !== 'high') {
      return {
        selectedModel: this.CHEAP_MODEL,
        reason: 'PERSONA_ENFORCED_COST_OPTIMIZATION',
        confidence: 0.8,
        routingMode: 'cost_first',
        isHeuristic: true
      };
    }

    if (context.persona === 'PERFORMANCE_MAX' && context.complexity !== 'low') {
      return {
        selectedModel: this.PREMIUM_MODEL,
        reason: 'PERSONA_ENFORCED_PERFORMANCE_MAX',
        confidence: 0.95,
        routingMode: 'performance_first',
        isHeuristic: true
      };
    }

    // 3. Evaluate History based on routing policy
    if (history.length > 0) {
      // Sort history to find the most successful model that satisfies our criteria
      
      if (context.routingMode === 'performance_first') {
        const bestPerformant = history.sort((a, b) => b.successRate - a.successRate)[0];
        if (bestPerformant.successRate > 0.8) {
          return {
            selectedModel: bestPerformant.model,
            reason: `HISTORY_HIGH_SUCCESS (${Math.round(bestPerformant.successRate * 100)}%)`,
            confidence: 0.85,
            routingMode: context.routingMode,
            isHeuristic: false
          };
        }
      } 
      
      else if (context.routingMode === 'cost_first') {
        // Find the cheapest model that still maintains acceptable success (> 60%)
        const cheapCandidates = history.filter(h => h.successRate > 0.6).sort((a, b) => a.avgCost - b.avgCost);
        if (cheapCandidates.length > 0) {
          return {
            selectedModel: cheapCandidates[0].model,
            reason: `HISTORY_COST_OPTIMIZED (${Math.round(cheapCandidates[0].successRate * 100)}% success)`,
            confidence: 0.8,
            routingMode: context.routingMode,
            isHeuristic: false
          };
        }
      }
      
      else {
        // Balanced: best success-to-cost ratio
        // Score = Success / Cost
        const balancedCandidates = history.filter(h => h.avgCost > 0).sort((a, b) => (b.successRate / b.avgCost) - (a.successRate / a.avgCost));
        if (balancedCandidates.length > 0 && balancedCandidates[0].successRate > 0.7) {
          return {
            selectedModel: balancedCandidates[0].model,
            reason: `HISTORY_BALANCED_ROI`,
            confidence: 0.8,
            routingMode: context.routingMode,
            isHeuristic: false
          };
        }
      }
    }

    // 4. Fallback to Heuristics (Cold Start / Insufficient History)
    return this.applyHeuristicFallback(context);
  }

  private static applyHeuristicFallback(context: RoutingContext): RoutingDecision {
    if (context.routingMode === 'cost_first') {
      return {
        selectedModel: this.CHEAP_MODEL,
        reason: 'HEURISTIC_COST_FIRST',
        confidence: 0.5,
        routingMode: context.routingMode,
        isHeuristic: true
      };
    }

    if (context.routingMode === 'performance_first') {
      return {
        selectedModel: this.PREMIUM_MODEL,
        reason: 'HEURISTIC_PERFORMANCE_FIRST',
        confidence: 0.5,
        routingMode: context.routingMode,
        isHeuristic: true
      };
    }

    // Balanced Heuristics:
    if (context.complexity === 'high') {
      return {
        selectedModel: this.PREMIUM_MODEL,
        reason: 'HEURISTIC_HIGH_COMPLEXITY',
        confidence: 0.6,
        routingMode: context.routingMode,
        isHeuristic: true
      };
    }

    // Default for balanced, low/medium complexity
    return {
      selectedModel: this.CHEAP_MODEL,
      reason: 'HEURISTIC_DEFAULT_BALANCED',
      confidence: 0.7,
      routingMode: context.routingMode,
      isHeuristic: true
    };
  }
}
