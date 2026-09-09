import { PerformanceMiner } from './performance-miner';
import dayjs from 'dayjs';
import { prisma } from '@/lib/db';

export type WindowAdvice = 'execute_now' | 'delay_execution' | 'move_to_low_cost_window' | 'promote_priority';

export interface WindowContext {
  tenantId: string;
  module: string;
  priority: number;
  environment: string;
}

export interface WindowRecommendation {
  advice: WindowAdvice;
  targetWindowSlot?: string;
  reason: string;
  efficiencyScore: number;
}

export class ExecutionWindowAdvisor {
  /**
   * Evaluates the current operational window and advises on execution timing.
   * If the window is congested or historically slow, and the job is low priority, 
   * the advisor will recommend delaying to save costs and avoid throttling.
   */
  public static async analyze(context: WindowContext): Promise<WindowRecommendation> {
    const currentSlot = PerformanceMiner.getWindowSlot(new Date());

    // In a prod system, we would fetch DevOsExecutionMetricSnapshot for this slot.
    // We'll mock the metric fetch here for the Engine architecture to operate gracefully.
    const snapshot = await (prisma as any).devOsExecutionMetricSnapshot.findFirst({
      where: {
        tenantId: context.tenantId,
        module: context.module,
        windowSlot: currentSlot
      }
    });

    // 1. Critical Jobs bypass window delays
    if (context.priority >= 8) {
      return {
        advice: 'execute_now',
        reason: 'CRITICAL_PRIORITY_BYPASS',
        efficiencyScore: 1.0
      };
    }

    // 2. High congestion detected (high avg latency or high abort rate)
    if (snapshot) {
      const isHighlyCongested = snapshot.avgLatencyMs > 5000 || snapshot.abortRate > 0.2;
      
      if (isHighlyCongested && context.priority <= 4) {
        // Find next hour as suggestion
        const nextHourSlot = PerformanceMiner.getWindowSlot(dayjs().add(1, 'hour').toDate());
        return {
          advice: 'delay_execution',
          targetWindowSlot: nextHourSlot,
          reason: 'CONGESTION_DELAYS_LOW_PRIORITY',
          efficiencyScore: 0.4
        };
      }
    }

    // 3. Off-peak check (simple heuristic for Night Time savings)
    const hour = dayjs().hour();
    const isOffPeak = hour >= 22 || hour <= 6;
    
    if (isOffPeak && context.priority <= 3) {
      // It's already off peak, great time to run low priority background tasks
      return {
        advice: 'execute_now',
        reason: 'OFF_PEAK_IDEAL_FOR_BATCH',
        efficiencyScore: 0.95
      };
    } else if (!isOffPeak && context.priority <= 2) {
      // Extremely low priority? Maybe move it to off-peak to save money on premium models
      return {
        advice: 'move_to_low_cost_window',
        targetWindowSlot: '01:00-02:00', // Mocked off-peak target
        reason: 'MOVE_NON_ESSENTIAL_TO_OFF_PEAK',
        efficiencyScore: 0.5
      };
    }

    // Default: Execute Now
    return {
      advice: 'execute_now',
      reason: 'WINDOW_NORMAL',
      efficiencyScore: 0.8
    };
  }
}
