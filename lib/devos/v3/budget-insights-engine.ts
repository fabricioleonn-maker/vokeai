import { prisma } from '@/lib/db';
import { CostForecastEngine } from './cost-forecast-engine';

export interface FinancialInsight {
  type: 'OPTIMIZATION' | 'WARNING' | 'OPPORTUNITY';
  title: string;
  description: string;
  potentialSavings?: number;
}

export class BudgetInsightsEngine {
  /**
   * Generates proactive financial insights for a tenant.
   */
  public static async generate(tenantId: string): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = [];
    
    // 1. Check Forecast
    const forecast = await CostForecastEngine.analyze(tenantId);
    if (forecast.riskLevel === 'CRITICAL' || forecast.riskLevel === 'HIGH') {
      insights.push({
        type: 'WARNING',
        title: 'Budget Exhaustion Imminent',
        description: `Your current burn rate suggests you will exceed your budget in approximately ${forecast.daysRemaining} days.`,
      });
    }

    // 2. Check Retry Waste (from historical DevOsJobRun)
    const recentRuns = await (prisma as any).devOsJobRun.findMany({
      where: { 
        tenantId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } // Last 7 days
      },
      select: { actualCost: true, attempts: true, status: true }
    });

    const totalCost = recentRuns.reduce((acc: number, r: any) => acc + (r.actualCost || 0), 0);
    const retryWaste = recentRuns.reduce((acc: number, r: any) => {
      if (r.attempts > 1 && r.status === 'SUCCESS') {
        const costPerAttempt = (r.actualCost || 0) / r.attempts;
        return acc + (costPerAttempt * (r.attempts - 1));
      }
      return acc;
    }, 0);

    if (retryWaste > totalCost * 0.15) {
      insights.push({
        type: 'OPTIMIZATION',
        title: 'High Retry Waste Detected',
        description: `${Math.round((retryWaste / totalCost) * 100)}% of your spend is coming from execution retries. Improving prompt stability could save you significant budget.`,
        potentialSavings: retryWaste
      });
    }

    // 3. Model Downgrade Opportunity
    const premiumModels = recentRuns.filter((r: any) => r.selectedModel === 'gpt-4o').length;
    if (premiumModels > 20) {
      insights.push({
        type: 'OPPORTUNITY',
        title: 'Model Optimization Opportunity',
        description: 'You are frequently using premium models for standard tasks. Enabling "Auto-Downgrade" for low-priority jobs could reduce costs by up to 40%.',
        potentialSavings: totalCost * 0.2
      });
    }

    return insights;
  }
}
