import { logAudit } from '@/lib/audit/audit-service';
import type { AgentContext, AgentResult, PendingAction } from '@/lib/types';

// Agente de Vendas Humanizado
// Responsável por qualificação, objeções, negociação e CTA

const SALES_INTENTS = [
  'preço', 'preco', 'valor', 'quanto', 'custa', 'plano', 'planos',
  'desconto', 'promoção', 'promocao', 'oferta', 'proposta',
  'assinar', 'contratar', 'comprar', 'adquirir', 'upgrade',
  'renovar', 'mensal', 'anual', 'trial', 'teste'
];

// Planos disponíveis (mock - em produção viria do Voke AI)
const PLANS = {
  free: {
    name: 'Gratuito',
    price: 0,
    features: ['1 agente ativo', '100 mensagens/mês', 'Suporte por email'],
    cta: 'Ideal para testar a plataforma'
  },
  basic: {
    name: 'Basic',
    price: 99,
    features: ['2 agentes ativos', '1.000 mensagens/mês', 'Suporte prioritário', 'Integrações básicas'],
    cta: 'Perfeito para pequenas empresas'
  },
  pro: {
    name: 'Pro',
    price: 299,
    features: ['Agentes ilimitados', 'Mensagens ilimitadas', 'Suporte 24/7', 'Todas as integrações', 'API completa'],
    cta: 'Para empresas que precisam escalar'
  }
};

type FunnelStage = 'awareness' | 'interest' | 'consideration' | 'intent' | 'evaluation' | 'purchase';

interface SalesContext {
  stage: FunnelStage;
  objections: string[];
  interests: string[];
  budget?: string;
  urgency?: string;
}

export function matchesSalesIntent(message: string): boolean {
  const lower = message?.toLowerCase() ?? '';
  return SALES_INTENTS?.some(intent => lower?.includes?.(intent)) ?? false;
}

function detectObjection(message: string): string | null {
  const lower = message?.toLowerCase() ?? '';

  if (lower?.includes?.('caro') || lower?.includes?.('muito') || lower?.includes?.('não tenho') || lower?.includes?.('nao tenho')) {
    return 'price';
  }
  if (lower?.includes?.('depois') || lower?.includes?.('agora não') || lower?.includes?.('agora nao') || lower?.includes?.('pensar')) {
    return 'timing';
  }
  if (lower?.includes?.('concorrente') || lower?.includes?.('outra') || lower?.includes?.('comparar')) {
    return 'competition';
  }
  if (lower?.includes?.('não preciso') || lower?.includes?.('nao preciso') || lower?.includes?.('não sei') || lower?.includes?.('nao sei')) {
    return 'need';
  }
  if (lower?.includes?.('funciona') || lower?.includes?.('confiável') || lower?.includes?.('confiavel') || lower?.includes?.('seguro')) {
    return 'trust';
  }

  return null;
}

function handleObjection(objection: string): string {
  const responses: Record<string, string> = {
    price: 'Entendo sua preocupação com o investimento! 💰\n\nVale considerar que nossos clientes economizam em média 20 horas por mês com automação. Isso equivale a muito mais do que o valor do plano.\n\nAlém disso, você pode começar com o plano gratuito e fazer upgrade quando quiser!',
    timing: 'Sem problemas! O timing é importante. 📅\n\nQue tal começar com nosso trial de 7 dias sem compromisso? Assim você pode testar com calma e decidir depois.',
    competition: 'Ótimo que você está pesquisando! 🔍\n\nNosso diferencial está na flexibilidade dos agentes e na facilidade de customização. Posso mostrar uma comparação rápida se quiser.',
    need: 'Perfeito, vamos entender melhor suas necessidades! 🎯\n\nMe conta: qual é o maior desafio do seu dia a dia que você gostaria de automatizar?',
    trust: 'Segurança é prioridade para nós! 🔒\n\nTemos certificação SOC 2, dados criptografados e backup diário. Além disso, oferecemos SLA de 99.9% de uptime.'
  };

  return responses[objection] ?? 'Entendo sua preocupação. Posso ajudar a esclarecer qualquer dúvida!';
}

function detectInterest(message: string): string | null {
  const lower = message?.toLowerCase() ?? '';

  if (lower?.includes?.('agenda') || lower?.includes?.('compromisso') || lower?.includes?.('reunião')) {
    return 'scheduling';
  }
  if (lower?.includes?.('financeiro') || lower?.includes?.('despesa') || lower?.includes?.('pagamento')) {
    return 'finance';
  }
  if (lower?.includes?.('atendimento') || lower?.includes?.('cliente') || lower?.includes?.('suporte')) {
    return 'support';
  }
  if (lower?.includes?.('venda') || lower?.includes?.('lead') || lower?.includes?.('conversão')) {
    return 'sales';
  }
  if (lower?.includes?.('documento') || lower?.includes?.('email') || lower?.includes?.('produtividade')) {
    return 'productivity';
  }

  return null;
}

export async function processSalesMessage(
  message: string,
  context: AgentContext
): Promise<AgentResult & { pendingAction?: PendingAction; salesContext?: SalesContext }> {
  const lower = message?.toLowerCase() ?? '';

  // Handle confirmation responses
  if (context.pendingAction?.type === 'confirm_interest' && (lower === '1' || lower?.includes?.('sim'))) {
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.sales',
      action: 'lead_qualified',
      entityType: 'lead',
      after: { status: 'qualified', interest: 'confirmed' }
    });

    return {
      agentName: 'Vendas',
      intent: 'qualified_lead',
      confidence: 0.95,
      missingInfo: [],
      options: ['1) Começar trial gratuito', '2) Ver planos', '3) Agendar demonstração'],
      proposedActions: [{ action: 'qualify_lead', params: {}, requiresConfirmation: false }],
      riskFlags: [],
      suggestedUserMessage: 'Excelente! 🎉 Fico feliz que tenha interesse!\n\nQual seria o melhor próximo passo para você?\n\n1) Começar o trial gratuito de 7 dias\n2) Ver detalhes dos planos e preços\n3) Agendar uma demonstração personalizada',
      salesContext: { stage: 'intent', objections: [], interests: [] }
    };
  }

  // Check for objections first
  const objection = detectObjection(message);
  if (objection) {
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.sales',
      action: 'objection_handled',
      entityType: 'sales_conversation',
      after: { objection_type: objection }
    });

    const response = handleObjection(objection);

    return {
      agentName: 'Vendas',
      intent: 'handle_objection',
      confidence: 0.85,
      missingInfo: [],
      options: ['1) Saber mais', '2) Ver planos', '3) Falar depois'],
      proposedActions: [{ action: 'handle_objection', params: { type: objection }, requiresConfirmation: false }],
      riskFlags: ['objection_detected'],
      suggestedUserMessage: `${response}\n\nPosso ajudar com mais alguma informação?\n\n1) Quero saber mais\n2) Ver os planos disponíveis\n3) Prefiro pensar e voltar depois`,
      salesContext: { stage: 'consideration', objections: [objection], interests: [] }
    };
  }

  // Show plans
  if (lower?.includes?.('plano') || lower?.includes?.('preço') || lower?.includes?.('preco') || lower?.includes?.('valor') || lower === '2') {
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.sales',
      action: 'plans_viewed',
      entityType: 'sales_conversation',
      after: { action: 'view_plans' }
    });

    const plansText = Object.entries(PLANS).map(([key, plan]) => {
      const price = plan.price === 0 ? 'Grátis' : `R$ ${plan.price}/mês`;
      return `**${plan.name}** - ${price}\n${plan.features.map(f => `  • ${f}`).join('\n')}\n  _${plan.cta}_`;
    }).join('\n\n');

    return {
      agentName: 'Vendas',
      intent: 'show_plans',
      confidence: 0.95,
      missingInfo: [],
      options: ['1) Quero o Basic', '2) Quero o Pro', '3) Começar grátis', '4) Tenho dúvidas'],
      proposedActions: [{ action: 'show_plans', params: {}, requiresConfirmation: false }],
      riskFlags: [],
      suggestedUserMessage: `Nossos planos foram pensados para diferentes necessidades! 📋\n\n${plansText}\n\nQual plano te interessa mais?\n\n1) Quero o Basic\n2) Quero o Pro\n3) Começar com o gratuito\n4) Tenho algumas dúvidas`,
      salesContext: { stage: 'evaluation', objections: [], interests: [] }
    };
  }

  // Trial/Demo request
  if (lower?.includes?.('trial') || lower?.includes?.('teste') || lower?.includes?.('demonstração') || lower?.includes?.('demonstracao') || lower === '1' || lower === '3') {
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.sales',
      action: 'trial_interest',
      entityType: 'lead',
      after: { action: 'trial_request' }
    });

    return {
      agentName: 'Vendas',
      intent: 'trial_request',
      confidence: 0.95,
      missingInfo: ['email'],
      options: [],
      proposedActions: [{ action: 'start_trial', params: {}, requiresConfirmation: true }],
      riskFlags: [],
      suggestedUserMessage: 'Ótima escolha! 🚀\n\nO trial de 7 dias dá acesso completo ao plano Pro, sem compromisso e sem precisar de cartão de crédito.\n\nPara ativar seu trial, preciso apenas do seu email de trabalho. Pode me informar?',
      pendingAction: {
        type: 'collect_email',
        agent: 'sales',
        data: { intent: 'trial' },
        summary: 'Coletando email para trial'
      },
      salesContext: { stage: 'purchase', objections: [], interests: [] }
    };
  }

  // Detect interest area for personalization
  const interest = detectInterest(message);

  // Generic sales welcome
  return {
    agentName: 'Vendas',
    intent: 'sales_welcome',
    confidence: 0.8,
    missingInfo: ['necessidade_principal'],
    options: [
      '1) Automatizar agenda',
      '2) Controlar finanças',
      '3) Melhorar atendimento',
      '4) Ver planos'
    ],
    proposedActions: [{ action: 'qualify', params: {}, requiresConfirmation: false }],
    riskFlags: [],
    suggestedUserMessage: interest
      ? `Que legal que você se interessa por ${interest === 'scheduling' ? 'automação de agenda' : interest === 'finance' ? 'controle financeiro' : interest === 'support' ? 'atendimento' : interest === 'sales' ? 'vendas' : 'produtividade'}! 🎯\n\nNossos agentes de IA podem ajudar muito nessa área.\n\nQuer ver como funciona na prática?\n\n1) Sim, me mostre!\n2) Ver os planos primeiro\n3) Tenho algumas dúvidas`
      : 'Olá! Sou o especialista de vendas. 🤝\n\nPosso ajudar a encontrar a solução ideal para você!\n\nO que você mais precisa automatizar hoje?\n\n1) Agenda e compromissos\n2) Controle financeiro\n3) Atendimento ao cliente\n4) Quero ver os planos disponíveis',
    pendingAction: interest ? {
      type: 'confirm_interest',
      agent: 'sales',
      data: { interest },
      summary: `Interesse em ${interest} detectado`
    } : undefined,
    salesContext: { stage: interest ? 'interest' : 'awareness', objections: [], interests: interest ? [interest] : [] }
  };
}
