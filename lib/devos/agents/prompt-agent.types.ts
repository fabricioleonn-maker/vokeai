// ========================
// PromptAgent — Type Definitions
// ========================

export type RiskLevel = 'low' | 'medium' | 'high';
export type Environment = 'dev' | 'staging' | 'prod';

export interface PromptAgentInput {
  intent: string;
  context: {
    project: string;
    module: string;
    environment: Environment;
  };
  tenantId: string;
  userId: string;
}

export interface StructuredPrompt {
  objective: string;
  scope: string;
  execution_rules: string[];
  constraints: string[];
  success_criteria: string[];
  non_goals: string[];
  // v1.1 additions
  execution_plan: string[];
  estimated_impact: 'low' | 'medium' | 'high';
  requires_human_review_reason: string;
}

export interface PromptAgentOutput {
  agent: 'PromptAgent';
  version: 'v1.2';
  status: 'success' | 'error' | 'clarification_needed';
  prompt: StructuredPrompt;
  risk_level: RiskLevel;
  requires_approval: boolean;
  clarification_questions?: string[];
  metadata: {
    tenantId: string;
    userId: string;
    originalIntent: string;
    project: string;
    module: string;
    environment: Environment;
    timestamp: string;
    processingMs: number;
    vaguenessScore?: number;
  };
  error?: string;
}
