import { prisma } from '@/lib/db';

export interface TenantContext {
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
  plan: {
    id: string;
    slug: string;
    name: string;
    tier: string;
    limits: Record<string, unknown>;
    features: Record<string, unknown>;
  } | null;
  enabledAgents: string[];
  enabledIntegrations: string[];
  agentConfigs: Map<string, {
    enabled: boolean;
    customPrompt?: string;
    behaviorOverride: Record<string, unknown>;
    allowedIntegrations: string[];
  }>;
  integrationConfigs: Map<string, {
    enabled: boolean;
    allowedAgents: string[];
  }>;
}

export async function getTenantContext(tenantId: string, isTestMode: boolean = false): Promise<TenantContext | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      plan: true,
      agentConfigs: true,
      integrationConfigs: true
    }
  });

  if (!tenant) return null;

  const agentConfigs = new Map<string, {
    enabled: boolean;
    customPrompt?: string;
    behaviorOverride: Record<string, unknown>;
    allowedIntegrations: string[];
  }>();

  for (const config of tenant?.agentConfigs ?? []) {
    agentConfigs.set(config?.agentSlug ?? '', {
      enabled: isTestMode ? true : (config?.enabled ?? false),
      customPrompt: config?.customPrompt ?? undefined,
      behaviorOverride: (config?.behaviorOverride as Record<string, unknown>) ?? {},
      allowedIntegrations: config?.allowedIntegrations ?? []
    });
  }

  const integrationConfigs = new Map<string, {
    enabled: boolean;
    allowedAgents: string[];
  }>();

  for (const config of tenant?.integrationConfigs ?? []) {
    integrationConfigs.set(config?.integrationSlug ?? '', {
      enabled: isTestMode ? true : (config?.enabled ?? false),
      allowedAgents: config?.allowedAgents ?? []
    });
  }

  let enabledAgents = Array.from(agentConfigs?.entries() ?? [])
    .filter(([, cfg]) => cfg?.enabled)
    .map(([slug]) => slug);

  if (isTestMode && enabledAgents.length === 0) {
    // Force core agents in test mode if none are configured
    enabledAgents = ['agent.secretary', 'agent.finance', 'agent.support.n1', 'agent.sales', 'agent.productivity'];
  }

  const enabledIntegrations = Array.from(integrationConfigs?.entries() ?? [])
    .filter(([, cfg]) => cfg?.enabled)
    .map(([slug]) => slug);

  return {
    tenant: {
      id: tenant?.id ?? tenantId,
      slug: tenant?.slug ?? '',
      name: tenant?.name ?? '',
      status: tenant?.status ?? 'active' // Test mode implies active
    },
    plan: tenant?.plan ? {
      id: tenant.plan?.id ?? '',
      slug: tenant.plan?.slug ?? '',
      name: tenant.plan?.name ?? '',
      tier: isTestMode ? 'enterprise' : (tenant.plan?.tier ?? 'free'),
      limits: isTestMode ? { messagesPerMonth: 999999, agentsCount: 10 } : ((tenant.plan?.limits as Record<string, unknown>) ?? {}),
      features: isTestMode ? { all: true } : ((tenant.plan?.features as Record<string, unknown>) ?? {})
    } : null,
    enabledAgents,
    enabledIntegrations,
    agentConfigs,
    integrationConfigs
  };
}

export function canUseAgent(context: TenantContext, agentSlug: string, isTestMode: boolean = false): boolean {
  if (isTestMode) return true;
  if (context?.tenant?.status !== 'active') return false;
  return context?.enabledAgents?.includes?.(agentSlug) ?? false;
}

export function canUseIntegration(context: TenantContext, integrationSlug: string, isTestMode: boolean = false): boolean {
  if (isTestMode) return true;
  if (context?.tenant?.status !== 'active') return false;
  return context?.enabledIntegrations?.includes?.(integrationSlug) ?? false;
}

export function getAgentConfig(context: TenantContext, agentSlug: string) {
  return context?.agentConfigs?.get?.(agentSlug) ?? null;
}
