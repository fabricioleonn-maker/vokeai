import { prisma } from '@/lib/db';
import { getTenantContext, canUseAgent } from '@/lib/core/governance';
import { callLLM, type LLMMessage } from './llm-service';
import type { AgentContext, OrchestratorResponse, PendingAction, AIPersonality } from '@/lib/types';
import { AgentRunner } from '@/lib/core/runner';

// Intent categories for conversational routing
export type IntentCategory = 'GREETING' | 'PRICING_PLANS' | 'SUPPORT' | 'FINANCE' | 'SECRETARY' | 'PRODUCTIVITY' | 'PROMO' | 'EXPLORATION' | 'UNKNOWN';

interface RoutingDecision {
  intent: IntentCategory;
  agent: string;
  model: string;
  confidence: number;
  reason: string;
  allowed_actions: 'execute' | 'explain_only' | 'blocked';
  requires_tools: boolean;
}

export async function processMessage(
  tenantId: string,
  userId: string,
  conversationId: string,
  message: string,
  channel: string = 'web',
  isTestMode: boolean = false
): Promise<OrchestratorResponse> {
  try {
    // 1. Get tenant context (governance)
    const tenantContext = await getTenantContext(tenantId, isTestMode);

    if (!tenantContext) {
      return createErrorResponse('Tenant not found', 'UNKNOWN', 'system');
    }

    if (!isTestMode && tenantContext?.tenant?.status !== 'active') {
      return createErrorResponse('Tenant inactive', 'UNKNOWN', 'system');
    }

    // 1.1 Load AI Personality
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiPersonality: true }
    });
    const aiPersonality = (tenant?.aiPersonality as AIPersonality | null) || null;

    // 2. Load conversation context & History
    let conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { context: true }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { id: conversationId, tenantId, userId, channel, status: 'active' },
        include: { context: true }
      });
      await prisma.conversationContext.create({
        data: { conversationId, summary: '', activeAgent: null, handoffHistory: [], pendingAction: null as any }
      });
    }

    const recentTurns = await prisma.conversationTurn.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const recentMessages = (recentTurns ?? [])?.reverse()?.map((t: any) => ({
      role: t.role as 'user' | 'assistant',
      content: t.content
    }));

    // 3. Save user message turn
    await prisma.conversationTurn.create({
      data: { conversationId, role: 'user', content: message, metadata: { channel, isTestMode } }
    });

    // 4. Build agent context (fetch lastIntent from profile)
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { lastIntent: true }
    });

    const pendingActionData = conversation?.context?.pendingAction as PendingAction | null;
    const agentContext: AgentContext = {
      tenantId,
      userId,
      channel,
      enabledAgents: tenantContext?.enabledAgents ?? [],
      enabledIntegrations: tenantContext?.enabledIntegrations ?? [],
      planLimits: tenantContext?.plan?.limits ?? {},
      userProfile: { isTestMode },
      memorySummary: conversation?.context?.summary ?? '',
      recentMessages,
      pendingAction: pendingActionData ?? undefined,
      lastIntent: userProfile?.lastIntent ?? undefined
    };

    // 5. SILENT ORCHESTRATION (P0.1)
    const routing = await detectRouting(message, agentContext, tenantContext);

    // 6. Execute Agent via Runner (P1.1)
    const isAgentEnabled = canUseAgent(tenantContext as any, routing.agent, isTestMode);
    const agentBasePrompt = await getAgentBasePrompt(routing.agent);

    // Hard fallback: If agent prompt is missing and it's not a simple greeting, it's a configuration error
    if (!agentBasePrompt && routing.intent !== 'GREETING') {
      console.error('CRITICAL: Missing prompt for agent', {
        agent: routing.agent,
        intent: routing.intent,
        tenantId,
        conversationId
      });
      return createErrorResponse('Configuração de agente incompleta.', routing.intent, routing.agent);
    }

    const response = await AgentRunner.run(message, agentContext, {
      agentSlug: routing.agent,
      intent: routing.intent,
      basePrompt: agentBasePrompt,
      personality: aiPersonality,
      model: routing.model
    });

    // Inject orchestration metadata (Routing takes precedence for status/intent)
    response.metadata = {
      ...response.metadata,
      ...routing,
      // Ensure we keep the actual model used by runner if it differs
      model: response.metadata?.model || routing.model
    };

    // 7. Update conversation context
    await prisma.conversationContext.upsert({
      where: { conversationId },
      update: {
        activeAgent: response.agentUsed ?? null,
        pendingAction: response.pendingAction ? (response.pendingAction as unknown as any) : (null as any),
        updatedAt: new Date()
      },
      create: {
        conversationId,
        activeAgent: response.agentUsed ?? null,
        pendingAction: response.pendingAction ? (response.pendingAction as unknown as any) : (null as any),
        summary: '',
        handoffHistory: []
      }
    });

    // Update UserProfile lastIntent (for conversation continuity)
    await prisma.userProfile.update({
      where: { userId },
      data: { lastIntent: routing.intent }
    });

    // 8. Save assistant message turn
    await prisma.conversationTurn.create({
      data: {
        conversationId,
        role: 'assistant',
        content: response.message,
        metadata: { ...response.metadata, isTestMode }
      }
    });

    return response;
  } catch (error: any) {
    // Audit-ready logging (P1.3)
    console.error('CRITICAL: processMessage failed:', {
      error: error.message,
      tenantId,
      userId,
      conversationId,
      intent: 'UNKNOWN',
      agent: 'system'
    });
    return createErrorResponse(`Tivemos um problema técnico. Por favor, tente novamente em instantes.`, 'UNKNOWN', 'system');
  }
}

/**
 * Hybrid Intent Detection (P1.1)
 */
async function detectRouting(
  message: string,
  context: AgentContext,
  tenantContext: any
): Promise<RoutingDecision> {
  const lower = message.toLowerCase();

  // 1.1 Greetings (Fast Path)
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite)/i.test(lower)) {
    return {
      intent: 'GREETING',
      agent: 'agent.support.n1',
      model: 'gpt-4o-mini',
      confidence: 1.0,
      reason: 'Matched greeting regex',
      allowed_actions: 'execute',
      requires_tools: false
    };
  }

  // 1.2 Pricing/Plans (Fast Path)
  if (/plano|preço|preco|valor|quanto custa|assinar|contratar/i.test(lower)) {
    return {
      intent: 'PRICING_PLANS',
      agent: 'agent.sales',
      model: 'gpt-4o-mini',
      confidence: 0.95,
      reason: 'Matched pricing keywords',
      allowed_actions: 'execute',
      requires_tools: false
    };
  }

  // 1.3 Finance (Fast Path)
  if (/fluxo de caixa|entradas|saídas|saidas|extrato|saldo/i.test(lower)) {
    return {
      intent: 'FINANCE',
      agent: 'agent.finance',
      model: 'gpt-4o-mini',
      confidence: 0.95,
      reason: 'Matched finance terminology',
      allowed_actions: 'execute',
      requires_tools: false
    };
  }

  // 1.4 Support/Technical (Fast Path) - Priority over Exploration
  const supportStrong = /não (carrega|abre|funciona|conecta|consigo)|erro|travou|bug|caiu|carregando infinito/i.test(lower);
  const supportWeak =
    /(problema|problemas|dificuldade|dificuldades|instabilidade|falha|falhando|não consigo|nao consigo)/i.test(lower) &&
    /(plataforma|sistema|app|aplicativo|site|conta|login|painel|hotmart)/i.test(lower);
  const internalTools = /(stitch|antigravity|supabase)/i.test(lower);

  const isSupport = supportStrong || supportWeak || internalTools;

  if (isSupport) {
    return {
      intent: 'SUPPORT',
      agent: 'agent.support.n1',
      model: 'gpt-4o-mini',
      confidence: 0.90,
      reason: supportStrong ? 'Matched strong technical support terms' : 'Matched platform difficulty/problem pattern',
      allowed_actions: 'execute',
      requires_tools: false
    };
  }

  // 1.5 Productivity/Agenda (Fast Path)
  if (/agenda|tarefa|prioridade|organizar (meu dia|hoje)|pendência|pendencia|compromisso/i.test(lower)) {
    return {
      intent: 'PRODUCTIVITY',
      agent: 'agent.productivity',
      model: 'gpt-4o-mini',
      confidence: 0.95,
      reason: 'Matched productivity keywords',
      allowed_actions: 'execute',
      requires_tools: false
    };
  }

  // 1.6 Exploration/Test (Refined Fast Path) - Only if not technical and short
  const isShortTest = lower.trim().split(/\s+/).length <= 2;
  const isExplorationPattern = /^(teste|test|asdf|qwerty|123|abc|oii+|opa|hmm|\.\.\.)$/i.test(lower.trim());
  if (isShortTest && isExplorationPattern && !isSupport) {
    return {
      intent: 'EXPLORATION',
      agent: 'agent.opening', // Decoupled from support
      model: 'gpt-4o-mini',
      confidence: 1.0,
      reason: 'Matched refined exploration pattern',
      allowed_actions: 'execute',
      requires_tools: false
    };
  }

  // 1.7 Sticky Intent (Continuity for short follow-ups)
  const words = lower.split(/\s+/).filter(Boolean);
  const isShortFollowup = words.length <= 6;
  const followupPhrases =
    /^(ok|certo|entendi|beleza|sim|não|nao|ainda não|ainda nao|não funcionou|nao funcionou|não deu|nao deu|quero entender melhor|me explica melhor|pode explicar|como assim)$/i
      .test(lower);

  if ((isShortFollowup || followupPhrases) && context?.lastIntent) {
    const last = context.lastIntent as string;
    // Sticky for operational intents
    if (['SUPPORT', 'FINANCE', 'PRODUCTIVITY', 'PRICING_PLANS'].includes(last)) {
      const agentByIntent: Record<string, string> = {
        SUPPORT: 'agent.support.n1',
        FINANCE: 'agent.finance',
        PRODUCTIVITY: 'agent.productivity',
        PRICING_PLANS: 'agent.sales',
      };

      return {
        intent: last as IntentCategory,
        agent: agentByIntent[last] || 'agent.support.n1',
        model: 'gpt-4o-mini',
        confidence: 0.85,
        reason: `Sticky intent from lastIntent=${last} for short follow-up`,
        allowed_actions: 'execute',
        requires_tools: false
      };
    }
  }

  // 2. LLM fallback for ambiguity (P0.1 silent prompt)
  const classificationPrompt = `Classifique a intenção do usuário no VokeAI.
Retorne APENAS um JSON seguindo o contrato:
{
  "intent": "GREETING | PRICING_PLANS | SUPPORT | FINANCE | SECRETARY | PRODUCTIVITY | PROMO | EXPLORATION | UNKNOWN",
  "agent": "agent.support.n1 | agent.sales | agent.finance | agent.secretary | agent.productivity | agent.promohunter",
  "model": "gpt-4o-mini | gpt-4o",
  "confidence": 0.0-1.0,
  "reason": "EXPLORATION se for teste, palavra solta, curiosidade ou algo vago",
  "allowed_actions": "execute | explain_only | blocked",
  "requires_tools": boolean
}

User Message: "${message}"`;

  try {
    const llm = await callLLM({
      systemPrompt: classificationPrompt,
      conversationHistory: [],
      agentConfig: { model: 'gpt-4o-mini', temperature: 0 }
    });

    const decision = JSON.parse(llm.content) as RoutingDecision;

    // Quota Enforcement in allowed_actions
    if (tenantContext.aiUsage?.state === 'EXHAUSTED') {
      decision.allowed_actions = 'explain_only';
    }

    return decision;
  } catch (e: any) {
    console.warn('detectRouting failed, using fallback:', {
      error: e.message,
      tenantId: context.tenantId,
      conversationId: 'internal'
    });
    return {
      intent: 'UNKNOWN',
      agent: 'agent.support.n1',
      model: 'gpt-4o-mini',
      confidence: 0.5,
      reason: 'LLM classification failed, falling back to support',
      allowed_actions: 'execute',
      requires_tools: false
    };
  }
}

async function getAgentBasePrompt(agentSlug: string): Promise<string> {
  try {
    const agent = await prisma.agentNode.findUnique({
      where: { slug: agentSlug }
    });

    if (!agent) return '';

    const config = agent.config as any;
    // Handle both 'base' and 'system_base' and handle JSON-as-string environments
    const parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;
    const prompts = (agent as any).prompts || parsedConfig?.prompts;

    return prompts?.system_base || prompts?.base || parsedConfig?.system_base || parsedConfig?.prompts?.system_base || '';
  } catch (e) {
    console.error(`Error fetching prompt for ${agentSlug}:`, e);
    return '';
  }
}

function createErrorResponse(reason: string, intent: IntentCategory, agent: string): OrchestratorResponse {
  return {
    message: reason.includes('Configuração') ? 'Desculpe, este serviço está temporariamente indisponível.' : reason,
    agentUsed: agent,
    metadata: {
      intent,
      agent,
      model: 'none',
      confidence: 0,
      reason,
      allowed_actions: 'blocked',
      requires_tools: false,
      error: reason
    }
  };
}
