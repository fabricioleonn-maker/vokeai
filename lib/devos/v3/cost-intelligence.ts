export interface CostEstimateContext {
  model: string;
  payload: any;
  jobType: string;
  complexity: 'low' | 'medium' | 'high';
}

export interface CostEstimateResult {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
}

// Approximate costs per 1K tokens for common models (prices illustrative for AI Ops logic)
const PRICING_MOCK: Record<string, { in: number, out: number }> = {
  'gpt-4o': { in: 0.005, out: 0.015 },
  'gpt-4o-mini': { in: 0.00015, out: 0.0006 },
  'claude-3-5-sonnet-20240620': { in: 0.003, out: 0.015 },
  'claude-3-haiku-20240307': { in: 0.00025, out: 0.00125 }
};

export class CostIntelligence {
  /**
   * Estimates the cost of an execution based on payload size and model selected.
   * Helps the model router decide if a job is "too expensive" for its priority.
   */
  public static estimate(context: CostEstimateContext): CostEstimateResult {
    const payloadStr = JSON.stringify(context.payload || {});
    const charCount = payloadStr.length;
    
    // Heuristic: ~4 chars per token for English/JSON
    const baseInputTokens = Math.max(10, Math.ceil(charCount / 4));
    
    // Add tokens based on complexity for prompt instructions
    const complexityModifier = context.complexity === 'high' ? 1000 : context.complexity === 'medium' ? 500 : 100;
    const estimatedInputTokens = baseInputTokens + complexityModifier;

    // Output tokens usually correlate with complexity
    const estimatedOutputTokens = context.complexity === 'high' ? 2000 : context.complexity === 'medium' ? 500 : 100;

    // Pricing lookup
    const pricing = PRICING_MOCK[context.model] || PRICING_MOCK['gpt-4o-mini']; // Default to cheap

    const estimatedCostUsd = (estimatedInputTokens / 1000) * pricing.in + (estimatedOutputTokens / 1000) * pricing.out;

    return {
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCostUsd
    };
  }

  /**
   * Calculates "Retry Waste Risk" - how much cost we've burned retrying this job so far.
   */
  public static calculateRetryWaste(baseCostEstimate: number, previousAttempts: number): number {
    return baseCostEstimate * previousAttempts;
  }
}
