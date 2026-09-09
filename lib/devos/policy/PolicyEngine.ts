import { prisma } from '@/lib/db';

export interface DevOsPolicyConfig {
  maxAutoApproveCost: number;
  riskThreshold: number;
  allowedModels: string[];
  blockedModels: string[];
  requireApproval: {
    highCost: boolean;
    lowConfidence: boolean;
    destructiveInProd: boolean;
  };
  businessHours: {
    start: string;
    end: string;
    timezone: string;
    enabled: boolean;
  };
  moduleLimits: Record<string, { maxCost: number }>;
  agentPolicies: Record<string, { 
    maxCost: number; 
    requiresApprovalInProd: boolean;
    allowParallel: boolean;
  }>;
  maxAgentChainDepth: number;
  maxParallelAgents: number;
  environmentRules: {
    production: {
      requireApprovalAlways: boolean;
      blockDestructive: boolean;
    };
  };
}

export const DEFAULT_POLICY: DevOsPolicyConfig = {
  maxAutoApproveCost: 5,
  riskThreshold: 70,
  allowedModels: ['gpt-4o-mini', 'gpt-4o'],
  blockedModels: [],
  requireApproval: {
    highCost: true,
    lowConfidence: true,
    destructiveInProd: true
  },
  businessHours: {
    start: "08:00",
    end: "18:00",
    timezone: "America/Sao_Paulo",
    enabled: false
  },
  moduleLimits: {},
  agentPolicies: {},
  maxAgentChainDepth: 4,
  maxParallelAgents: 3,
  environmentRules: {
    production: {
      requireApprovalAlways: false,
      blockDestructive: true
    }
  }
};

export class PolicyEngine {
  /**
   * Resolves the active policy for a tenant.
   * Merges custom tenant policy with system defaults.
   */
  public static async resolve(tenantId: string): Promise<DevOsPolicyConfig> {
    try {
      const tenantPolicy = await (prisma as any).devOsPolicy.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { updatedAt: 'desc' }
      });

      if (!tenantPolicy) return DEFAULT_POLICY;

      const config = tenantPolicy.config as unknown as Partial<DevOsPolicyConfig>;
      
      // Deep merge with defaults
      return {
        ...DEFAULT_POLICY,
        ...config,
        requireApproval: { ...DEFAULT_POLICY.requireApproval, ...config.requireApproval },
        businessHours: { ...DEFAULT_POLICY.businessHours, ...config.businessHours },
        environmentRules: { 
          production: { ...DEFAULT_POLICY.environmentRules.production, ...config.environmentRules?.production } 
        }
      };
    } catch (error) {
      console.error('[PolicyEngine] Error resolving policy, falling back to default:', error);
      return DEFAULT_POLICY;
    }
  }

  /**
   * Checks if a cost is within the auto-approve limit.
   */
  public static isAutoApproveAllowed(config: DevOsPolicyConfig, cost: number, module?: string): boolean {
    const moduleLimit = module ? config.moduleLimits[module]?.maxCost : null;
    const limit = moduleLimit !== null ? Math.min(config.maxAutoApproveCost, moduleLimit) : config.maxAutoApproveCost;
    
    return cost <= limit;
  }

  /**
   * Checks if a model is allowed by policy.
   */
  public static isModelAllowed(config: DevOsPolicyConfig, model: string): boolean {
    if (config.blockedModels.includes(model)) return false;
    if (config.allowedModels.length > 0 && !config.allowedModels.includes(model)) return false;
    return true;
  }
}
