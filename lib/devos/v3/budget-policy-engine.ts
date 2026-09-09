import { prisma } from '@/lib/db';
import { BudgetManager, BudgetStatus } from './budget-manager';

export type BudgetAction = 'ALLOW' | 'ALLOW_WITH_DOWNGRADE' | 'DELAY_FOR_SAVINGS' | 'BLOCK_OVER_BUDGET' | 'PRIORITY_OVERRIDE';

export interface BudgetDecision {
  action: BudgetAction;
  reason: string;
  maxAllowedCost?: number;
  enforceDowngrade: boolean;
}

export class BudgetPolicyEngine {
  /**
   * Final judgment for a prospective execution.
   */
  public static async evaluate(
    tenantId: string, 
    estimatedCost: number, 
    priority: number // 1 to 10
  ): Promise<BudgetDecision> {
    
    // 1. Get Policy and Budget Status
    const [policy, budget] = await Promise.all([
      this.getPolicy(tenantId),
      BudgetManager.getBudgetStatus(tenantId)
    ]);

    if (!policy.active) {
      return { action: 'ALLOW', reason: 'POLICY_INACTIVE', enforceDowngrade: false };
    }

    const currentTotalExposure = budget.spent + budget.reserved + estimatedCost;
    const usageRatio = currentTotalExposure / budget.total;

    // --- DECISION TREE ---

    // 2. ABSOLUTE HARD LIMIT (120%)
    if (usageRatio >= (1 + policy.gracePercentage / 100)) {
       return { action: 'BLOCK_OVER_BUDGET', reason: 'HARD_LIMIT_EXCEEDED (120%)', enforceDowngrade: false };
    }

    // 3. SOFT LIMIT (100%) but CRITICAL or OVERRIDE
    if (usageRatio >= 1.0) {
      if (priority >= 9 && policy.allowExecutionUnderCritical) {
        return { action: 'PRIORITY_OVERRIDE', reason: 'CRITICAL_JOB_EMERGENCY_BUDGET', enforceDowngrade: policy.allowAutoDowngrade };
      }
      return { action: 'BLOCK_OVER_BUDGET', reason: 'BUDGET_EXHAUSTED', enforceDowngrade: false };
    }

    // 4. LOW BUDGET (80% - 100%) -> Optimize and Sacrifice low-prio
    if (usageRatio >= 0.8) {
       if (priority <= 4 && policy.autoBlockNonCritical) {
          return { action: 'DELAY_FOR_SAVINGS', reason: 'THROTTLING_LOW_PRIORITY_JOBS', enforceDowngrade: false };
       }
       
       if (policy.allowAutoDowngrade) {
          return { action: 'ALLOW_WITH_DOWNGRADE', reason: 'BUDGET_WARNING_AUTO_DOWNGRADE', enforceDowngrade: true };
       }
    }

    // 5. Normal Operation
    if (estimatedCost > policy.maxCostPerExecution && priority < 8) {
       return { action: 'DELAY_FOR_SAVINGS', reason: 'COST_PER_EXECUTION_EXCEEDS_POLICY', enforceDowngrade: true };
    }

    return { action: 'ALLOW', reason: 'BUDGET_OK', enforceDowngrade: false };
  }

  private static async getPolicy(tenantId: string) {
    let policy = await (prisma as any).devOsBudgetPolicy.findUnique({
      where: { tenantId }
    });

    if (!policy) {
      policy = await (prisma as any).devOsBudgetPolicy.create({
        data: {
          tenantId,
          maxCostPerExecution: 0.5,
          active: true
        }
      });
    }
    return policy;
  }
}
