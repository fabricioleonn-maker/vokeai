import { prisma } from '@/lib/db';
import { getTenantContext, canUseAgent } from '@/lib/core/governance';
import { matchesSecretaryIntent } from './secretary-agent';
import { matchesFinanceIntent } from './finance-agent';
import { matchesSupportIntent, shouldHandoffToSales, shouldHandoffToTechnical } from './support-agent';
import { matchesSalesIntent } from './sales-agent';
import { matchesProductivityIntent } from './productivity-agent';
import { callLLM, getConversationHistory, AGENT_PROMPTS, type LLMMessage } from './llm-service';
import type { AgentContext, OrchestratorResponse, PendingAction, AIPersonality } from '@/lib/types';
import { Prisma } from '@prisma/client';

// Intent categories for conversational routing
type IntentCategory = 'curiosity' | 'comparison' | 'decision' | 'execution' | 'complaint' | 'question' | 'price' | 'plan' | 'general';

const AGENT_CAPABILITIES: Record<string, { name: string; description: string; benefits: string[]; useCases: string[] }> = {
  'agent.secretary': {
    name: 'Agenda Inteligente',
    description: 'gestão de agenda e agendamentos',
    benefits: [
      'Agendamento automático de reuniões',
      'Lembretes e notificações',
      'Integração com Google Calendar',
      'Reagendamento inteligente'
    ],
    useCases: [
      'Você recebe muitos contatos por dia e precisa organizar',
      'Quer automatizar marcação de reuniões e consultas',
      'Precisa de lembretes automáticos para compromissos'
    ]
  },
  'agent.finance': {
    name: 'Controle Financeiro',
    description: 'controle financeiro e transações',
    benefits: [
      'Registro de receitas e despesas',
      'Relatórios financeiros automáticos',
      'Alertas de contas a pagar',
      'Integração bancária'
    ],
    useCases: [
      'Você quer ter visão clara das finanças do negócio',
      'Precisa controlar entradas e saídas automaticamente',
      'Quer relatórios sem precisar de contador toda hora'
    ]
  },
  'agent.support.n1': {
    name: 'Atendimento',
    description: 'suporte ao cliente',
    benefits: [
      'Respostas instantâneas 24/7',
      'FAQs inteligentes',
      'Encaminhamento automático',
      'Histórico de atendimentos'
    ],
    useCases: [
      'Você recebe muitas perguntas repetitivas',
      'Quer atender clientes fora do horário comercial',
      'Precisa organizar demandas por prioridade'
    ]
  },
  'agent.sales': {
    name: 'Vendas',
    description: 'qualificação de leads e vendas',
    benefits: [
      'Qualificação automática de leads',
      'Follow-up personalizado',
      'Scripts de vendas inteligentes',
      'Análise de objeções'
    ],
    useCases: [
      'Você quer fechar mais vendas com menos esforço',
      'Precisa qualificar leads antes de investir tempo',
      'Quer follow-ups automáticos que funcionam'
    ]
  },
  'agent.productivity': {
    name: 'Produtividade',
    description: 'criação de conteúdo e documentos',
    benefits: [
      'Geração de e-mails profissionais',
      'Criação de planilhas',
      'Checklists automáticas',
      'Resumos e relatórios'
    ],
    useCases: [
      'Você perde tempo escrevendo e-mails repetitivos',
      'Precisa criar documentos e relatórios rapidamente',
      'Quer templates prontos para usar no dia a dia'
    ]
  }
};

export async function processMessage(
  tenantId: string,
  userId: string,
  conversationId: string,
  message: string,
  channel: string = 'web',
  isTestMode: boolean = false
): Promise<OrchestratorResponse> {
  // 1. Get tenant context (governance) + AI Personality
  const tenantContext = await getTenantContext(tenantId, isTestMode);

  if (!tenantContext) {
    return {
      message: 'Desculpe, não foi possível identificar sua conta. Por favor, tente novamente.',
      metadata: { error: 'tenant_not_found' }
    };
  }

  if (!isTestMode && tenantContext?.tenant?.status !== 'active') {
    return {
      message: 'Sua conta está temporariamente inativa. Entre em contato com o suporte para mais informações.',
      metadata: { error: 'tenant_inactive' }
    };
  }

  // 1.1 Load AI Personality (ALWAYS applied)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { aiPersonality: true }
  });
  const aiPersonality = (tenant?.aiPersonality as AIPersonality | null) || null;

  // 2. Load conversation context
  let conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { context: true }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        id: conversationId,
        tenantId,
        userId,
        channel,
        status: 'active'
      },
      include: { context: true }
    });

    await prisma.conversationContext.create({
      data: {
        conversationId,
        summary: '',
        activeAgent: null,
        handoffHistory: [],
        pendingAction: null as any
      }
    });
  }

  // 3. Get recent messages for context
  const recentTurns = await prisma.conversationTurn.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  const recentMessages = (recentTurns ?? [])?.reverse()?.map((t: { role: string; content: string }) => ({
    role: t.role as 'user' | 'assistant',
    content: t.content
  }));

  // 4. Save user message turn
  await prisma.conversationTurn.create({
    data: {
      conversationId,
      role: 'user',
      content: message,
      metadata: { channel, isTestMode }
    }
  });

  // 5. Build agent context with personality
  const pendingActionData = conversation?.context?.pendingAction as PendingAction | null;

  const agentContext: AgentContext = {
    tenantId,
    userId,
    channel,
    enabledAgents: tenantContext?.enabledAgents ?? [],
    enabledIntegrations: tenantContext?.enabledIntegrations ?? [],
    planLimits: tenantContext?.plan?.limits ?? {},
    userProfile: { isTestMode }, // Pass down for LLM awareness if needed
    memorySummary: conversation?.context?.summary ?? '',
    recentMessages,
    pendingAction: pendingActionData ?? undefined
  };

  // 5.1 Detect user intent BEFORE routing (REGRA OBRIGATÓRIA)
  const userIntent = detectUserIntent(message);

  // 6. Route to appropriate agent with personality
  let response: OrchestratorResponse;
  let agentUsed: string | undefined;
  let newPendingAction: PendingAction | undefined;

  // Check if there's a pending action that needs handling
  if (pendingActionData) {
    const agentSlugMap: Record<string, string> = {
      'secretary': 'agent.secretary',
      'finance': 'agent.finance',
      'support': 'agent.support.n1',
      'sales': 'agent.sales',
      'productivity': 'agent.productivity'
    };

    const agentSlug = agentSlugMap[pendingActionData?.agent ?? ''];

    if (agentSlug) {
      const isAgentEnabled = canUseAgent(tenantContext, agentSlug, isTestMode);
      response = await processWithLLM(message, agentSlug, agentContext, tenantContext, isAgentEnabled, aiPersonality, userIntent);
      agentUsed = agentSlug;
    } else {
      response = await routeToAgent(message, agentContext, tenantContext, aiPersonality, userIntent);
      agentUsed = response?.agentUsed;
      newPendingAction = response?.pendingAction;
    }
  } else {
    response = await routeToAgent(message, agentContext, tenantContext, aiPersonality, userIntent);
    agentUsed = response?.agentUsed;
    newPendingAction = response?.pendingAction;
  }

  // 7. Update conversation context
  await prisma.conversationContext.upsert({
    where: { conversationId },
    update: {
      activeAgent: agentUsed ?? null,
      pendingAction: newPendingAction ? (newPendingAction as unknown as any) : (null as any),
      updatedAt: new Date()
    },
    create: {
      conversationId,
      activeAgent: agentUsed ?? null,
      pendingAction: newPendingAction ? (newPendingAction as unknown as any) : (null as any),
      summary: '',
      handoffHistory: []
    }
  });

  // 8. Save assistant message turn (NUNCA expor nome do agente ao usuário)
  await prisma.conversationTurn.create({
    data: {
      conversationId,
      role: 'assistant',
      content: response?.message ?? 'Desculpe, não consegui processar sua mensagem.',
      metadata: {
        agentUsed: agentUsed ?? null, // Internal only, never shown to user
        requiresConfirmation: response?.requiresConfirmation ?? false,
        userIntent,
        isTestMode
      }
    }
  });

  return response;
}

// Detect user intent before responding (REGRA OBRIGATÓRIA)
function detectUserIntent(message: string): IntentCategory {
  const lowerMessage = message.toLowerCase();

  // Complaint detection
  if (/problema|erro|não funciona|travou|reclamação|insatisfeito|péssimo|horrível/i.test(lowerMessage)) {
    return 'complaint';
  }

  // Comparison/evaluation
  if (/qual a diferença|comparar|melhor opção|qual escolher|versus|vs|diferença entre/i.test(lowerMessage)) {
    return 'comparison';
  }

  // Decision/action
  if (/quero|preciso|vou|contratar|assinar|comprar|fazer upgrade|upgrade/i.test(lowerMessage)) {
    return 'decision';
  }

  // Price objection
  if (/preço|valor|custo|quanto custa|pagar|caro|paguei|preço salgado/i.test(lowerMessage)) {
    return 'price';
  }

  // Plan questions
  if (/plano|assinatura|tier|pacote|limite|capacidade|agentes inclusos/i.test(lowerMessage)) {
    return 'plan';
  }

  // Execution request
  if (/agenda|registra|cria|envia|faz|marca|cancela|transfere/i.test(lowerMessage)) {
    return 'execution';
  }

  // Question
  if (/como|quando|onde|por que|quanto|qual|o que é|funciona/i.test(lowerMessage)) {
    return 'question';
  }

  // Curiosity
  if (/curioso|interessante|me conta|explica|saber mais|conhecer/i.test(lowerMessage)) {
    return 'curiosity';
  }

  return 'general';
}

// Handle handoff between agents using LLM (NEVER expose agent names to user)
async function handleHandoff(
  targetAgent: string,
  message: string,
  context: AgentContext,
  tenantContext: Awaited<ReturnType<typeof getTenantContext>>,
  aiPersonality: AIPersonality | null,
  userIntent: IntentCategory
): Promise<{ response: OrchestratorResponse; agentUsed?: string; pendingAction?: PendingAction }> {
  const isAgentEnabled = canUseAgent(tenantContext!, targetAgent);

  // Always process with LLM - even if agent not enabled (consultive mode)
  const response = await processWithLLM(message, targetAgent, context, tenantContext, isAgentEnabled, aiPersonality, userIntent);

  return {
    response,
    agentUsed: targetAgent
  };
}

async function routeToAgent(
  message: string,
  context: AgentContext,
  tenantContext: Awaited<ReturnType<typeof getTenantContext>>,
  aiPersonality: AIPersonality | null,
  userIntent: IntentCategory
): Promise<OrchestratorResponse> {
  // Check for plan/pricing questions FIRST - need strategic question before listing
  if (isPlanRelatedQuestion(message)) {
    return await handlePlanQuestion(message, context, tenantContext, aiPersonality, userIntent);
  }

  // Detect intent using keywords (fast path)
  let detectedAgent: string | null = null;

  if (matchesSecretaryIntent(message)) {
    detectedAgent = 'agent.secretary';
  } else if (matchesFinanceIntent(message)) {
    detectedAgent = 'agent.finance';
  } else if (matchesSalesIntent(message)) {
    detectedAgent = 'agent.sales';
  } else if (matchesProductivityIntent(message)) {
    detectedAgent = 'agent.productivity';
  } else if (matchesSupportIntent(message)) {
    detectedAgent = 'agent.support.n1';
  }

  // Check for handoff signals from support
  if (shouldHandoffToSales(message)) {
    detectedAgent = 'agent.sales';
  }

  // If agent detected, route (LLM handles consultive mode if not enabled)
  if (detectedAgent) {
    const isAgentEnabled = canUseAgent(tenantContext!, detectedAgent);
    return await processWithLLM(message, detectedAgent, context, tenantContext, isAgentEnabled, aiPersonality, userIntent);
  }

  // No clear intent - use general assistant mode
  return await processWithLLM(message, 'agent.support.n1', context, tenantContext, true, aiPersonality, userIntent);
}

// Check if message is about plans/pricing
function isPlanRelatedQuestion(message: string): boolean {
  const planKeywords = /plano|planos|preço|preços|valor|valores|quanto custa|mensalidade|assinatura|pacote|upgrade|premium|pro|básico|free|gratuito/i;
  return planKeywords.test(message);
}

// Handle plan questions with STRATEGIC QUESTIONING (REGRA OBRIGATÓRIA)
async function handlePlanQuestion(
  message: string,
  context: AgentContext,
  tenantContext: Awaited<ReturnType<typeof getTenantContext>>,
  aiPersonality: AIPersonality | null,
  userIntent: IntentCategory
): Promise<OrchestratorResponse> {
  // Check if we already asked a strategic question in recent messages
  const alreadyAskedStrategicQuestion = context.recentMessages?.some(m =>
    m.role === 'assistant' && /seu maior desafio|usa mais para|recebe muitos contatos/i.test(m.content)
  );

  // Build consultive plan prompt
  const systemPrompt = buildPlanConsultivePrompt(tenantContext, aiPersonality, alreadyAskedStrategicQuestion);

  // Build conversation history
  const conversationHistory: LLMMessage[] = context.recentMessages?.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  })) || [];

  conversationHistory.push({ role: 'user', content: message });

  try {
    const llmResponse = await callLLM({
      systemPrompt,
      conversationHistory,
      tenantContext: {
        name: tenantContext?.tenant?.name || 'Cliente',
        plan: tenantContext?.plan?.name || 'Free'
      },
      agentConfig: {
        tone: aiPersonality?.voiceTone || 'friendly',
        maxTokens: 1500
      }
    });

    return {
      message: llmResponse.content,
      agentUsed: 'agent.sales',
      metadata: {
        tokensUsed: llmResponse.usage?.total_tokens,
        planConsultive: true,
        userIntent
      }
    };
  } catch (error) {
    // Fallback with strategic question
    return {
      message: alreadyAskedStrategicQuestion
        ? `Entendi! Deixa eu te explicar de um jeito que faça sentido pro seu negócio... 😊\n\nPosso te mostrar como cada funcionalidade se encaixa no seu dia a dia. O que mais tá te tomando tempo hoje?`
        : `Antes de falar de planos, me conta um pouco: você usa mais pra atendimento, vendas ou organização interna? Assim consigo te mostrar o que realmente faz sentido pra você 😊`,
      agentUsed: 'agent.sales',
      metadata: { fallback: true, planConsultive: true }
    };
  }
}

// Build prompt for plan questions (REGRA OBRIGATÓRIA: perguntar antes de listar)
function buildPlanConsultivePrompt(
  tenantContext: Awaited<ReturnType<typeof getTenantContext>>,
  aiPersonality: AIPersonality | null,
  alreadyAsked: boolean
): string {
  const personalityInstructions = aiPersonality?.personalityInstructions || '';
  const situationHandler = aiPersonality?.situationHandlers?.planQuestion || '';
  const voiceTone = aiPersonality?.voiceTone || 'friendly';

  const toneGuide = {
    formal: 'profissional e respeitoso, mas nunca frio',
    neutral: 'equilibrado e objetivo, mas acolhedor',
    casual: 'descontraído e acessível',
    friendly: 'caloroso, próximo e genuíno'
  };

  let basePrompt = `Você é um consultor especializado que ajuda clientes a escolherem a melhor solução.

REGRAS ABSOLUTAS:
- NUNCA liste planos como uma tabela ou lista genérica
- NUNCA diga "Temos o plano Basic, Pro e Premium" de cara
- NUNCA use linguagem de landing page ou marketing
- NUNCA pressione para upgrade
- Mantenha uma VOZ ÚNICA (você não é "a equipe" ou "nós da empresa")

TOM DE VOZ: ${toneGuide[voiceTone]}

${personalityInstructions ? `PERSONALIDADE CONFIGURADA:\n${personalityInstructions}\n` : ''}
${situationHandler ? `INSTRUÇÃO ESPECÍFICA PARA PLANOS:\n${situationHandler}\n` : ''}`;

  if (!alreadyAsked) {
    basePrompt += `
PRIMEIRA PERGUNTA ESTRATÉGICA (OBRIGATÓRIO):
Antes de falar de planos, faça UMA pergunta para entender o contexto:
- "Hoje você usa mais pra atendimento, vendas ou os dois?"
- "Você recebe muitos contatos por dia ou é mais tranquilo?"
- "Qual seu maior desafio hoje: responder rápido ou fechar mais vendas?"

Escolha a pergunta mais adequada ao contexto e faça de forma natural.`;
  } else {
    basePrompt += `
CONTEXTO JÁ COLETADO:
O cliente já respondeu a pergunta estratégica. Agora:
1. Explique as funcionalidades BASEADO no que ele disse
2. Relacione cada recurso com o PROBLEMA DELE
3. Use casos de uso práticos, não recursos técnicos
4. Se mencionar planos, seja por CASO DE USO:
   - "Pra quem precisa só do básico..."
   - "Se você quer automatizar também..."
   - "Quando o volume aumentar..."

Exemplo bom: "Pelo que você me contou, parece que o maior ganho seria automatizar os agendamentos. Isso já resolve boa parte do problema. Quer que eu te mostre como funciona na prática?"

Exemplo ruim: "Nosso plano Pro inclui 5 agentes, 1000 conversas/mês e integração com WhatsApp."`;
  }

  return basePrompt;
}

// Process message using LLM for intelligent responses
// isAgentEnabled: true = full execution mode, false = consultive mode (explain, guide, no auto-actions)
// aiPersonality: ALWAYS applied (Personality > Script > Generic Rule)
async function processWithLLM(
  message: string,
  agentSlug: string,
  context: AgentContext,
  tenantContext: Awaited<ReturnType<typeof getTenantContext>>,
  isAgentEnabled: boolean = true,
  aiPersonality: AIPersonality | null = null,
  userIntent: IntentCategory = 'general'
): Promise<OrchestratorResponse> {
  try {
    // Build system prompt with personality FIRST (REGRA: Personality > Script > Generic)
    let systemPrompt = buildUnifiedPrompt(agentSlug, isAgentEnabled, aiPersonality, tenantContext, userIntent);

    // Build conversation history
    const conversationHistory: LLMMessage[] = context.recentMessages?.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    })) || [];

    // Add current message
    conversationHistory.push({ role: 'user', content: message });

    // Get tenant custom config if available
    const tenantAgentConfig = await prisma.tenantAgentConfig.findFirst({
      where: {
        tenantId: context.tenantId,
        agentSlug
      }
    });

    const customInstructions = tenantAgentConfig?.customPrompt || undefined;
    const behaviorOverride = (tenantAgentConfig?.behaviorOverride as Record<string, unknown>) || {};

    // Determine tone (personality > config > default)
    const tone = aiPersonality?.voiceTone || behaviorOverride.tone as 'formal' | 'neutral' | 'casual' || 'friendly';

    // Call LLM
    const llmResponse = await callLLM({
      systemPrompt,
      conversationHistory,
      tenantContext: {
        name: tenantContext?.tenant?.name || 'Cliente',
        plan: tenantContext?.plan?.name || 'Free',
        customInstructions: isAgentEnabled ? customInstructions : undefined
      },
      agentConfig: {
        tone,
        maxTokens: 1500
      }
    });

    return {
      message: llmResponse.content,
      agentUsed: agentSlug,
      metadata: {
        tokensUsed: llmResponse.usage?.total_tokens,
        model: 'gpt-4.1-mini',
        consultiveMode: !isAgentEnabled,
        userIntent
      }
    };
  } catch (error) {
    console.error('LLM processing error:', error);

    // Fallback - still consultive if not enabled
    if (!isAgentEnabled) {
      return buildConsultiveFallback(agentSlug, tenantContext, aiPersonality);
    }

    // Humanized fallback with personality
    const greeting = aiPersonality?.customGreeting || 'Olá! Como posso ajudar você hoje?';

    return {
      message: greeting,
      agentUsed: agentSlug,
      metadata: { fallback: true }
    };
  }
}

// Build unified prompt with personality (PRIORITY: Personality > Script > Generic)
function buildUnifiedPrompt(
  agentSlug: string,
  isAgentEnabled: boolean,
  aiPersonality: AIPersonality | null,
  tenantContext: Awaited<ReturnType<typeof getTenantContext>>,
  userIntent: IntentCategory
): string {
  const agentInfo = AGENT_CAPABILITIES[agentSlug] || {
    name: 'Assistente',
    description: 'assistência geral',
    benefits: ['Ajuda com suas necessidades'],
    useCases: ['Resolver problemas do dia a dia']
  };

  const voiceTone = aiPersonality?.voiceTone || 'friendly';
  const communicationStyle = aiPersonality?.communicationStyle || 'consultive';

  const toneGuide = {
    formal: 'Profissional e respeitoso. Use "você" e mantenha cordialidade.',
    neutral: 'Equilibrado e objetivo. Seja claro e direto, mas acolhedor.',
    casual: 'Descontraído e acessível. Use expressões naturais.',
    friendly: 'Caloroso e próximo. Como um amigo que entende do assunto.'
  };

  const styleGuide = {
    direct: 'Vá direto ao ponto. Responda a pergunta primeiro, depois explique se necessário.',
    consultive: 'Ouça primeiro, entenda o contexto, depois oriente. Faça perguntas quando necessário.',
    empathetic: 'Valide os sentimentos. Mostre compreensão antes de resolver.'
  };

  // BASE PROMPT - REGRAS UNIVERSAIS (NUNCA QUEBRE)
  let prompt = `Você é um assistente virtual especializado. Sua missão é ajudar de forma humana e consultiva.

═══════════════════════════════════════
REGRAS UNIVERSAIS (PROIBIÇÕES ABSOLUTAS)
═══════════════════════════════════════
❌ NUNCA diga "Sou o agente de vendas/suporte/etc" - o usuário NÃO vê troca de agentes
❌ NUNCA liste planos/recursos de forma genérica sem contexto
❌ NUNCA responda como erro de sistema ou mensagem técnica
❌ NUNCA use "não está no seu plano" de forma seca
❌ NUNCA pressione para upgrade ou venda
❌ NUNCA use linguagem de marketing ou landing page
❌ NUNCA diga "nossa equipe" ou "nós da empresa" - você tem VOZ ÚNICA

✅ SEMPRE mantenha conversa humana e natural
✅ SEMPRE entenda a intenção ANTES de responder
✅ SEMPRE ofereça valor antes de vender
✅ SEMPRE seja útil, mesmo se não puder executar a ação

═══════════════════════════════════════
SEU TOM E ESTILO
═══════════════════════════════════════
TOM DE VOZ: ${toneGuide[voiceTone]}
ESTILO: ${styleGuide[communicationStyle]}
`;

  // Add personality instructions if configured (PRIORITY 1)
  if (aiPersonality?.personalityInstructions) {
    prompt += `
═══════════════════════════════════════
PERSONALIDADE CONFIGURADA (PRIORIDADE MÁXIMA)
═══════════════════════════════════════
${aiPersonality.personalityInstructions}
`;
  }

  // Add business context if available
  if (aiPersonality?.businessContext) {
    prompt += `
═══════════════════════════════════════
CONTEXTO DO NEGÓCIO
═══════════════════════════════════════
${aiPersonality.businessContext}
`;
  }

  // Add positive examples
  if (aiPersonality?.positiveExamples?.length) {
    prompt += `
═══════════════════════════════════════
EXEMPLOS DE COMO RESPONDER (INSPIRAÇÃO)
═══════════════════════════════════════
${aiPersonality.positiveExamples.map((ex, i) => `${i + 1}. "${ex}"`).join('\n')}
`;
  }

  // Add negative examples
  if (aiPersonality?.negativeExamples?.length) {
    prompt += `
═══════════════════════════════════════
O QUE NUNCA FAZER (EVITE)
═══════════════════════════════════════
${aiPersonality.negativeExamples.map((ex, i) => `${i + 1}. ❌ "${ex}"`).join('\n')}
`;
  }

  // Add intent-specific handling
  prompt += `
═══════════════════════════════════════
INTENÇÃO DETECTADA: ${userIntent.toUpperCase()}
═══════════════════════════════════════
${getIntentGuidance(userIntent, aiPersonality)}
`;

  // Add agent-specific context
  if (!isAgentEnabled) {
    // CONSULTIVE MODE - can talk, can't execute
    prompt += `
═══════════════════════════════════════
MODO CONSULTIVO (${agentInfo.name})
═══════════════════════════════════════
O cliente está perguntando sobre ${agentInfo.description}.

VOCÊ PODE:
- Explicar como funciona
- Dar orientações práticas
- Mostrar exemplos e casos de uso
- Responder dúvidas conceituais
- Sugerir como resolver manualmente

VOCÊ NÃO PODE (neste momento):
- Executar ações automáticas (agendar, registrar, criar, etc)

COMO LIDAR:
Se o cliente pedir uma ação específica, explique como ele pode fazer manualmente
e mencione naturalmente que com upgrade a automação fica disponível.

Exemplo: "Claro! Deixa eu te explicar como funciona [explica]. 
Por enquanto você pode fazer assim [passo a passo manual]. 
E se quiser automatizar isso no futuro, é só me avisar que mostro as opções 😊"

CASOS DE USO DESTA FUNCIONALIDADE:
${agentInfo.useCases.map(uc => `• ${uc}`).join('\n')}
`;
  } else {
    // FULL EXECUTION MODE
    prompt += `
═══════════════════════════════════════
ÁREA DE ATUAÇÃO: ${agentInfo.name}
═══════════════════════════════════════
Você pode ajudar com: ${agentInfo.description}

CAPACIDADES DISPONÍVEIS:
${agentInfo.benefits.map(b => `• ${b}`).join('\n')}

Mantenha o foco nesta área, mas sempre de forma humana e consultiva.
`;
  }

  // Final reminder
  prompt += `
═══════════════════════════════════════
LEMBRE-SE SEMPRE
═══════════════════════════════════════
• Pareça um profissional experiente conversando, não um chatbot
• Use frases curtas e naturais
• Guie com opções claras quando apropriado
• Crie valor antes de qualquer menção a upgrade
• O cliente deve confiar em você e querer evoluir naturalmente
`;

  return prompt;
}

// Get guidance based on user intent
function getIntentGuidance(intent: IntentCategory, aiPersonality: AIPersonality | null): string {
  switch (intent) {
    case 'complaint':
      const complaintHandler = aiPersonality?.situationHandlers?.complaint;
      return complaintHandler || `RECLAMAÇÃO DETECTADA - Prioridade: Acolher
1. Valide o sentimento ("entendo sua frustração")
2. Peça desculpas se apropriado
3. Foque em resolver, não em justificar
4. Não fique na defensiva`;

    case 'price':
      const priceHandler = aiPersonality?.situationHandlers?.priceObjection;
      return priceHandler || `OBJEÇÃO DE PREÇO - Prioridade: Mostrar Valor
1. Não baixe o preço de cara
2. Mostre o ROI (economia de tempo/dinheiro)
3. Relacione com os benefícios do negócio dele
4. Mantenha a postura de consultor especializado`;

    case 'plan':
      const planHandler = aiPersonality?.situationHandlers?.planQuestion;
      return planHandler || `DÚVIDA DE PLANO - Prioridade: Simplificar e Consultar
1. Não liste recursos técnicos secos
2. Pergunte qual o objetivo dele ANTES de recomendar
3. Mostre o que ele ganha em cada nível de forma prática
4. Sugira o passo natural de evolução`;

    case 'comparison':
      return `COMPARAÇÃO DETECTADA - Prioridade: Contextualizar
1. Entenda O QUE ele quer comparar
2. Relacione com o CASO DE USO dele
3. Não liste features - fale de resultados
4. Ajude a tomar decisão informada`;

    case 'decision':
      return `DECISÃO DETECTADA - Prioridade: Facilitar
1. O cliente parece pronto para agir
2. Seja direto e facilite o próximo passo
3. Confirme o entendimento antes de executar
4. Não crie barreiras desnecessárias`;

    case 'execution':
      return `EXECUÇÃO DETECTADA - Prioridade: Agir ou Orientar
1. O cliente quer FAZER algo
2. Se puder: execute ou inicie o processo
3. Se não puder: explique como fazer manualmente
4. Seja prático e objetivo`;

    case 'question':
      const techHandler = aiPersonality?.situationHandlers?.technicalIssue;
      return (techHandler ? `DÚVIDA TÉCNICA: ${techHandler}\n` : '') + `PERGUNTA DETECTADA - Prioridade: Esclarecer
1. Responda a pergunta de forma clara
2. Use exemplos práticos
3. Ofereça informação adicional se útil
4. Pergunte se ficou claro`;

    case 'curiosity':
      return `CURIOSIDADE DETECTADA - Prioridade: Educar
1. Aproveite para explicar bem
2. Mostre casos de uso práticos
3. Gere interesse genuíno
4. Convide para explorar mais`;

    default:
      return `CONVERSA GERAL - Prioridade: Engajar
1. Seja natural e acolhedor
2. Tente entender o que o cliente precisa
3. Faça uma pergunta se necessário
4. Mantenha a conversa fluindo`;
  }
}

// Fallback for consultive mode when LLM fails
function buildConsultiveFallback(
  agentSlug: string,
  tenantContext: Awaited<ReturnType<typeof getTenantContext>>,
  aiPersonality: AIPersonality | null
): OrchestratorResponse {
  const agentInfo = AGENT_CAPABILITIES[agentSlug] || {
    name: 'este recurso',
    description: 'funcionalidade avançada',
    benefits: [],
    useCases: []
  };

  // Use custom greeting if available
  if (aiPersonality?.customGreeting) {
    return {
      message: aiPersonality.customGreeting,
      agentUsed: agentSlug,
      metadata: {
        fallback: true,
        consultiveMode: true
      }
    };
  }

  const voiceTone = aiPersonality?.voiceTone || 'friendly';
  const greeting = voiceTone === 'formal'
    ? 'Olá! Fico feliz em poder ajudar.'
    : 'Oi! Que bom te ver por aqui 😊';

  return {
    message: `${greeting}

Você perguntou sobre ${agentInfo.description}. Posso te explicar como funciona e te orientar sobre as melhores práticas.

${agentInfo.useCases.length > 0 ? `Isso é muito útil quando ${agentInfo.useCases[0]?.toLowerCase()}.` : ''}

Me conta mais sobre o que você precisa e vamos resolver juntos!`,
    agentUsed: agentSlug,
    metadata: {
      fallback: true,
      consultiveMode: true
    }
  };
}
