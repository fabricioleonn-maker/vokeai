import { prisma } from '@/lib/db';

export type BudgetRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BudgetForecast {
  predictedSpend: number;
  totalBudget: number;
  riskLevel: BudgetRisk;
  daysRemaining: number;
}

export class CostForecastEngine {
  /**
   * Projects end-of-cycle spend based on current run rate.
   */
  public static async analyze(tenantId: string): Promise<BudgetForecast> {
    const budget = await (prisma as any).devOsBudget.findUnique({
      where: { tenantId }
    });

    if (!budget) {
      return { predictedSpend: 0, totalBudget: 50, riskLevel: 'LOW', daysRemaining: 30 };
    }

    const now = new Date();
    const start = budget.budgetCycleStart;
    const end = budget.budgetCycleEnd;

    const totalDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    const elapsedDays = Math.max(1, (now.getTime() - start.getTime()) / (1000 * 3600 * 24));
    const remainingDays = Math.max(0, totalDays - elapsedDays);

    const burnRatePerDay = budget.currentSpend / elapsedDays;
    const predictedSpend = budget.currentSpend + (burnRatePerDay * remainingDays);

    let riskLevel: BudgetRisk = 'LOW';
    const ratio = predictedSpend / budget.monthlyBudget;

    if (ratio >= 1.2) riskLevel = 'CRITICAL';
    else if (ratio >= 1.0) riskLevel = 'HIGH';
    else if (ratio >= 0.8) riskLevel = 'MEDIUM';

    // Update the budget record with prediction
    await (prisma as any).devOsBudget.update({
      where: { tenantId },
      data: { predictedSpend }
    });

    return {
      predictedSpend,
      totalBudget: budget.monthlyBudget,
      riskLevel,
      daysRemaining: Math.round(remainingDays)
    };
  }
}
