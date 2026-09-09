import { ExecutionWindowAdvisor, WindowContext, WindowAdvice } from './execution-window-advisor';
import { TenantProfiler, TenantProfile } from './tenant-profiler';
import { ModelRoutingEngine, RoutingContext, RoutingDecision } from './model-routing-engine';
import { GlobalModelAdvisor, GlobalStrategyAdvisor } from './global-advisors';
import { GlobalFingerprintEngine } from './global-fingerprint';
import { CostIntelligence, CostEstimateContext } from './cost-intelligence';

export interface ScoringContext {
  tenantId: string; // Added for Phase 11 reciprocity and context
  windowContext: WindowContext;
  routingContext: RoutingContext;
  costContext: CostEstimateContext;
  retryWasteCost: number; // Burned cost so far
  maxAllowedCost: number; // Tenant limit
  budgetConstrained?: boolean; // Added for Phase 12
}

export interface ScoreBreakdown {
  successProbability: number; // 0.0 to 1.0 (confidence from router)
  costPenalty: number; // 0.0 to -0.5
  latencyPenalty: number; // 0.0 to -0.5 (from window advisor congestion)
  priorityBoost: number; // 0.0 to +0.5
  riskPenalty: number; // Added for Phase 14 - 0.0 to -1.0
  performanceScore: number; // Added for Phase 14 - 0.0 to 1.0 (alias for success prob)
}

export type ExecutionAction = 'EXECUTE' | 'DELAY' | 'BLOCK' | 'PROMOTE';

export interface ScoringDecision {
  finalScore: number;
  breakdown: ScoreBreakdown;
  action: ExecutionAction;
  reason: string;
  recommendedWindowSlot?: string;
  selectedModel: string;
  estimatedCostUsd: number;
  optimizationSource: 'LOCAL' | 'GLOBAL' | 'HEURISTIC';
  tenantPersona?: string; // Added for Phase 13
}

export class ExecutionScoringEngine {
  /**
   * The core of Phase 10 logic.
   * Derives a holistic ROI execution score to prevent wasteful retries and optimize scheduling.
   */
  public static async evaluate(context: ScoringContext): Promise<ScoringDecision> {
    // 1. Get Component Advice
    const tenantProfile = await TenantProfiler.getProfile(context.tenantId);
    const routingDecision = await ModelRoutingEngine.selectModel({
      ...context.routingContext,
      budgetConstrained: context.budgetConstrained,
      persona: tenantProfile.persona
    });
    const windowAdvice = await ExecutionWindowAdvisor.analyze(context.windowContext);
    
    // 3. Weighting Logic (ADAPTIVE - Phase 13)
    let weightPerformance = 0.6;
    let weightCost = 0.3;
    let weightReliability = 0.1;

    if (tenantProfile.persona === 'COST_OPTIMIZED') {
      weightPerformance = 0.3;
      weightCost = 0.6;
    } else if (tenantProfile.persona === 'PERFORMANCE_MAX') {
      weightPerformance = 0.8;
      weightCost = 0.1;
    }
    
    // Dynamically calculate cost based on routing decision model
    const actualCostContext: CostEstimateContext = {
      ...context.costContext,
      model: routingDecision.selectedModel
    };
    const costEstimate = CostIntelligence.estimate(actualCostContext);

    // 2. Compute Penalties & Boosts
    let successProbability = routingDecision.confidence;
    let optimizationSource: 'LOCAL' | 'GLOBAL' | 'HEURISTIC' = 'LOCAL';
    let selectedModel = routingDecision.selectedModel;

    // --- PHASE 11: GLOBAL FALLBACK ---
    if (successProbability < 0.4) {
       const globalFingerprint = GlobalFingerprintEngine.generate({
         jobType: context.routingContext.jobType || 'unknown',
         module: context.routingContext.module,
         environment: context.windowContext.environment || 'production',
         complexityTier: context.routingContext.complexity || 'medium',
         payloadSizeTier: GlobalFingerprintEngine.calculatePayloadTier(context.costContext.payload),
         errorCode: context.routingContext.errorCode
       });

       const globalModelAdvice = await GlobalModelAdvisor.suggestModel(globalFingerprint, context.tenantId);
       
       if (globalModelAdvice && globalModelAdvice.confidence > successProbability) {
          successProbability = globalModelAdvice.confidence;
          selectedModel = globalModelAdvice.model;
          optimizationSource = 'GLOBAL';
       }
    }

    if (successProbability < 0.2) {
      optimizationSource = 'HEURISTIC';
    }
    
    // Cost Penalty: higher ratio to max allowed cost = higher penalty. Max -0.4
    let costRatio = costEstimate.estimatedCostUsd / (context.maxAllowedCost || 1.0);
    // Amplify if we carry a lot of retry waste (throwing good money after bad)
    if (context.retryWasteCost > context.maxAllowedCost / 2) {
      costRatio *= 1.5;
    }
    const costPenalty = Math.max(-0.4, -(costRatio * 0.2));

    // Latency Penalty: Inverse of window efficiency
    const latencyPenalty = Math.max(-0.3, -(1.0 - windowAdvice.efficiencyScore));

    // Priority Boost: 0.05 per priority tier above 5
    const priorityBoost = Math.max(0, (context.windowContext.priority - 5) * 0.05);

    // 3. Final Calculation
    const riskScore = context.routingContext.complexity === 'high' ? 0.4 : 0.1; 
    const riskPenalty = -riskScore;
    const finalScore = successProbability + costPenalty + latencyPenalty + priorityBoost + riskPenalty;

    const breakdown: ScoreBreakdown = {
      successProbability,
      costPenalty,
      latencyPenalty,
      priorityBoost,
      riskPenalty,
      performanceScore: successProbability
    };

    // 4. Determine Action
    let action: ExecutionAction = 'EXECUTE';
    let reason = 'SCORE_OPTIMAL';

    if (finalScore < 0.4 && context.windowContext.priority < 8) {
      // Very poor efficiency, too expensive or too congested for non-critical jobs
      action = 'BLOCK';
      reason = 'SCORE_TOO_LOW_FOR_ROI';
    } 
    else if (windowAdvice.advice === 'delay_execution' || windowAdvice.advice === 'move_to_low_cost_window') {
      action = 'DELAY';
      reason = `DEFERRED_TO_WINDOW_${windowAdvice.targetWindowSlot}`;
    }
    else if (routingDecision.reason === 'PROMOTION_DUE_TO_RETRIES') {
      action = 'PROMOTE';
      reason = 'MODEL_PROMOTED_FOR_RECOVERY';
    }

    // Critical Bypass
    if (context.windowContext.priority >= 9 && action === 'BLOCK') {
      action = 'EXECUTE';
      reason = 'CRITICAL_BYPASS_INEFFICIENCY';
    }
    // 6. Return standard decision
    return {
      finalScore: Math.max(0, Math.min(100, Math.round(finalScore * 100))), 
      breakdown,
      action,
      reason: reason || 'Optimal execution derived',
      recommendedWindowSlot: windowAdvice.targetWindowSlot,
      selectedModel,
      estimatedCostUsd: costEstimate.estimatedCostUsd,
      optimizationSource,
      tenantPersona: tenantProfile.persona
    };
  }
}
