import { prisma } from '@/lib/db';
import { PolicyEngine } from '../policy/PolicyEngine';

export interface OnboardingData {
  companyName: string;
  segment: string;
  objectives: string[];
  selectedPacks: string[];
  operationalProfile: 'conservative' | 'balanced' | 'aggressive';
}

export class OnboardingService {
  /**
   * Saves partial onboarding data to the database.
   */
  public static async saveProgress(tenantId: string, step: number, data: Partial<OnboardingData>) {
    const onboarding = await (prisma as any).devOsOnboarding.findUnique({
      where: { tenantId }
    });

    const currentData = onboarding?.data || {};
    const updatedData = { ...currentData, ...data };

    return await (prisma as any).devOsOnboarding.upsert({
      where: { tenantId },
      update: {
        currentStep: step,
        data: updatedData
      },
      create: {
        tenantId,
        currentStep: step,
        data: updatedData
      }
    });
  }

  /**
   * Finalizes the onboarding and applies all configurations.
   */
  public static async finalize(tenantId: string) {
    const onboarding = await (prisma as any).devOsOnboarding.findUnique({
      where: { tenantId }
    });

    if (!onboarding || onboarding.completed) return;

    const data = onboarding.data as unknown as OnboardingData;

    // 1. Configure Policy based on Operational Profile
    await this.applyPolicyPreset(tenantId, data.operationalProfile);

    // 2. Activate Default Agents based on Segment/Packs
    await this.provisionAgents(tenantId, data.selectedPacks);

    // 3. Mark as completed
    await (prisma as any).devOsOnboarding.update({
      where: { tenantId },
      data: { completed: true }
    });
    
    // 4. Initial Wallet Gift
    await (prisma as any).devOsWallet.upsert({
      where: { tenantId },
      update: {},
      create: { 
        tenantId,
        balance: 5.0 // Welcome bonus for successful onboarding
      }
    });
  }

  private static async applyPolicyPreset(tenantId: string, profile: string) {
    let config = {
      maxAutoApproveCost: 1.0,
      riskThreshold: 0.3,
      requireApprovalRules: ['cost > 5', 'high_risk']
    };

    if (profile === 'balanced') {
      config = {
        maxAutoApproveCost: 5.0,
        riskThreshold: 0.5,
        requireApprovalRules: ['cost > 20', 'extreme_risk']
      };
    } else if (profile === 'aggressive') {
      config = {
        maxAutoApproveCost: 20.0,
        riskThreshold: 0.8,
        requireApprovalRules: ['extreme_risk']
      };
    }

    await (prisma as any).devOsPolicy.upsert({
      where: { tenantId },
      update: { config },
      create: { tenantId, name: 'Default SaaS Policy', config }
    });
  }

  private static async provisionAgents(tenantId: string, packs: string[]) {
    // Basic dynamic provisioning for the MVP
    for (const pack of packs) {
      const agentKey = `agent-${pack}-${tenantId.slice(0, 4)}`;
      await (prisma as any).devOsAgentRegistry.upsert({
        where: { agentKey },
        update: { isActive: true },
        create: {
          tenantId,
          agentKey,
          name: `Expert in ${pack}`,
          role: 'specialist',
          specialization: pack,
          description: `Automatically provisioned agent for ${pack} operations.`,
          allowedIntents: [pack, 'support', 'info']
        }
      });
    }
  }
}
