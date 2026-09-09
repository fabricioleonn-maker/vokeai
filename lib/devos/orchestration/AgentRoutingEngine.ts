import { DevOsPolicyConfig } from '../policy/PolicyEngine';

export interface RoutingInput {
  intent: string;
  context: any;
  availableAgents: any[];
  policy: DevOsPolicyConfig;
}

export class AgentRoutingEngine {
  /**
   * Decides which agent(s) should handle the request based on intent and policy.
   */
  public static async analyze(input: RoutingInput) {
    const { intent, availableAgents, policy } = input;
    const reasons: string[] = [];
    
    // Simple Keyword-based Intent Mapping for now (Phase 17 MVP)
    const matchingAgents = availableAgents.filter(agent => {
      const allowedIntents = agent.allowedIntents as string[] || [];
      return allowedIntents.some(i => intent.toLowerCase().includes(i.toLowerCase()));
    });

    if (matchingAgents.length === 0) {
      // Logic for fallback to a generalist
      const generalist = availableAgents.find(a => a.role === 'generalist') || availableAgents[0];
      return {
        mode: 'SINGLE_AGENT' as const,
        agents: [generalist],
        plan: [{ stage: 1, agents: [generalist.agentKey] }],
        estimatedCost: 0.2,
        estimatedRisk: 0.1,
        reasons: ['No specific intent match, routed to generalist/fallback.']
      };
    }

    // Decision on mode (Sequential if more than 1 agent matched)
    let mode: 'SINGLE_AGENT' | 'SEQUENTIAL' | 'PARALLEL' = 'SINGLE_AGENT';
    if (matchingAgents.length > 2) mode = 'PARALLEL';
    else if (matchingAgents.length > 1) mode = 'SEQUENTIAL';

    return {
      mode,
      agents: matchingAgents,
      plan: matchingAgents.map((a, i) => ({ stage: i + 1, agents: [a.agentKey] })),
      estimatedCost: matchingAgents.length * 0.3, // Heuristic
      estimatedRisk: matchingAgents.length > 2 ? 0.4 : 0.2,
      reasons: [`Matched ${matchingAgents.length} agents via intent analysis.`]
    };
  }
}
