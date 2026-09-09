import { prisma } from '@/lib/db';
import { PolicyEngine, DevOsPolicyConfig } from '../policy/PolicyEngine';
import { AgentRoutingEngine } from '@/lib/devos/orchestration/AgentRoutingEngine';
import { HandoffProtocol } from '@/lib/devos/orchestration/HandoffProtocol';

export type OrchestrationMode = "SINGLE_AGENT" | "SEQUENTIAL" | "PARALLEL" | "SUPERVISED";

export interface OrchestrationResult {
  orchestrationMode: OrchestrationMode;
  selectedAgents: string[];
  flowPlan: any[];
  expectedCost: number;
  expectedRisk: number;
  reasons: string[];
}

export class MultiAgentOrchestrator {
  /**
   * Orchestrates the agent execution flow for a given job.
   */
  public static async plan(
    tenantId: string,
    jobId: string,
    intent: string,
    context: any
  ): Promise<OrchestrationResult> {
    const reasons: string[] = [];
    
    // 1. Resolve Policy
    const policy = await PolicyEngine.resolve(tenantId);
    
    // 2. Fetch Available Agents for this Tenant
    const availableAgents = await (prisma as any).devOsAgentRegistry.findMany({
      where: { tenantId, isActive: true }
    });

    if (availableAgents.length === 0) {
      reasons.push('No active agents found in registry for this tenant.');
      return this.fallbackResult(reasons);
    }

    // 3. Routing Analysis
    const routing = await AgentRoutingEngine.analyze({
      intent,
      context,
      availableAgents,
      policy
    });

    return {
      orchestrationMode: routing.mode,
      selectedAgents: routing.agents.map((a: any) => a.agentKey),
      flowPlan: routing.plan,
      expectedCost: routing.estimatedCost,
      expectedRisk: routing.estimatedRisk,
      reasons: routing.reasons
    };
  }

  private static fallbackResult(reasons: string[]): OrchestrationResult {
    return {
      orchestrationMode: 'SINGLE_AGENT',
      selectedAgents: ['global-dispatcher-agent'],
      flowPlan: [],
      expectedCost: 0.1,
      expectedRisk: 0.1,
      reasons
    };
  }
}
