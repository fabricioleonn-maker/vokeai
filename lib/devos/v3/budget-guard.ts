import { BudgetManager } from './budget-manager';
import { BudgetPolicyEngine, BudgetDecision } from './budget-policy-engine';

export class BudgetGuard {
  /**
   * Pre-execution safety check. 
   * Validates if the tenant has budget and if the execution follows policies.
   */
  public static async protect(
    tenantId: string,
    estimatedCost: number,
    priority: number,
    runId: string,
    jobId?: string
  ): Promise<BudgetDecision> {
    
    // 1. Evaluate Policy Decision (Dry run against current state)
    const decision = await BudgetPolicyEngine.evaluate(tenantId, estimatedCost, priority);

    if (decision.action === 'BLOCK_OVER_BUDGET') {
      return decision;
    }

    // 2. If allowed (or allowed with downgrade), try to RESERVE the funds
    // If the reservation fails (hard limit reached), override decision to BLOCK
    const reserved = await BudgetManager.reserveBudget(tenantId, estimatedCost, runId, jobId);
    
    if (!reserved) {
      return { 
        action: 'BLOCK_OVER_BUDGET', 
        reason: 'HARD_BUDGET_LIMIT_REACHED_ON_RESERVATION', 
        enforceDowngrade: false 
      };
    }

    return decision;
  }
}
