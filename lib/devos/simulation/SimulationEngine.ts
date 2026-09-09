import { PolicyEngine } from '../policy/PolicyEngine';
import { GovernanceRulesEngine } from '../v3/governance-rules-engine';
import { CostIntelligence } from '../v3/cost-intelligence';
import { ExecutionScoringEngine } from '../v3/execution-scoring-engine';
import { ExecutionFingerprint } from '../v3/execution-fingerprint';

export interface SimulationOutput {
  estimatedCost: number;
  estimatedRisk: number;
  approvalRequired: boolean;
  predictedModel: string;
  predictedPath: any[]; // Nodes for React Flow
  warnings: string[];
  blockingIssues: string[];
  policySnapshot: any;
}

export class SimulationEngine {
  /**
   * Pre-execution simulation of a DevOs Job.
   * Predicts behavior, cost, and risk based on active policies.
   */
  public static async simulate(tenantId: string, module: string, payload: any, priority: number): Promise<SimulationOutput> {
    const warnings: string[] = [];
    const blockingIssues: string[] = [];
    
    // 1. Resolve Policy
    const policy = await PolicyEngine.resolve(tenantId);

    // 2. Estimate Cost
    const costEstimate = CostIntelligence.estimate({
      model: 'gpt-4o', // Default for estimation
      payload,
      jobType: module,
      complexity: priority > 80 ? 'high' : 'medium'
    });

    // 3. Evaluate Governance (Predictive)
    const governance = await GovernanceRulesEngine.evaluate(tenantId, module, priority);
    if (!governance.allowed) {
      blockingIssues.push(`Governance Block: ${governance.reason}`);
    }

    // 4. Budget check
    const isAutoApproveAllowed = PolicyEngine.isAutoApproveAllowed(policy, costEstimate.estimatedCostUsd, module);
    if (!isAutoApproveAllowed) {
      warnings.push(`Cost ($${costEstimate.estimatedCostUsd.toFixed(4)}) exceeds auto-approve limit ($${policy.maxAutoApproveCost}).`);
    }

    // 5. Predict Path (Nodes status mapping)
    const predictedPath = this.buildGhostNodes(governance.allowed, isAutoApproveAllowed);

    return {
      estimatedCost: costEstimate.estimatedCostUsd,
      estimatedRisk: priority > 80 ? 0.8 : 0.2, // Heuristic for now
      approvalRequired: !isAutoApproveAllowed || policy.requireApproval.highCost,
      predictedModel: policy.allowedModels[0] || 'gpt-4o-mini',
      predictedPath,
      warnings,
      blockingIssues,
      policySnapshot: {
        maxAutoApproveCost: policy.maxAutoApproveCost,
        riskThreshold: policy.riskThreshold
      }
    };
  }

  private static buildGhostNodes(isAllowed: boolean, isAutoApprove: boolean) {
    const nodes = [
      { id: 'node-input', type: 'INPUT', status: 'DONE', label: 'Input' },
      { 
        id: 'node-governance', 
        type: 'GOVERNANCE', 
        status: isAllowed ? 'DONE' : 'FAILED', 
        label: 'Governance' 
      },
      { 
        id: 'node-budget', 
        type: 'BUDGET', 
        status: !isAllowed ? 'PENDING' : 'DONE', 
        label: 'Budget' 
      },
      { 
        id: 'node-scoring', 
        type: 'SCORING', 
        status: !isAllowed ? 'PENDING' : 'DONE', 
        label: 'Scoring' 
      },
      { 
        id: 'node-approval', 
        type: 'APPROVAL', 
        status: !isAllowed ? 'PENDING' : (isAutoApprove ? 'DONE' : 'RUNNING'), 
        label: 'Approval Gate' 
      },
      { 
        id: 'node-execution', 
        type: 'EXECUTION', 
        status: (isAllowed && isAutoApprove) ? 'PREDICTED' : 'PENDING', 
        label: 'AI Execution (Ghost)' 
      }
    ];

    return nodes;
  }
}
