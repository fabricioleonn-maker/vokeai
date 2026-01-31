import { logAudit } from '@/lib/audit/audit-service';
import type { AgentContext, AgentResult, PendingAction } from '@/lib/types';

// Agente de Atendimento N1 (Primeiro Atendimento)
// Responsável por FAQs, triagem e handoff para outros agentes

const SUPPORT_INTENTS = [
  'dúvida', 'duvida', 'pergunta', 'como', 'o que', 'qual', 'onde',
  'problema', 'erro', 'bug', 'não funciona', 'nao funciona',
  'ajuda', 'help', 'suporte', 'atendimento', 'falar', 'humano',
  'reclamação', 'reclamacao', 'informação', 'informacao', 'info'
];

const SALES_KEYWORDS = [
  'preço', 'preco', 'valor', 'quanto custa', 'plano', 'desconto',
  'promoção', 'promocao', 'assinar', 'contratar', 'comprar',
  'upgrade', 'renovar', 'cancelar assinatura', 'proposta'
];

const TECHNICAL_KEYWORDS = [
  'erro', 'bug', 'não funciona', 'nao funciona', 'travou',
  'lento', 'instável', 'instavel', 'crash', 'falha', 'problema técnico'
];

// FAQ Database (mock - em produção viria do Voke AI)
const FAQ_DATABASE: Record<string, string> = {
  'horario_funcionamento': 'Nosso atendimento funciona de segunda a sexta, das 9h às 18h.',
  'canais_contato': 'Você pode nos contatar via WhatsApp, chat web ou email.',
  'prazo_resposta': 'O prazo médio de resposta é de até 24 horas úteis.',
  'formas_pagamento': 'Aceitamos cartão de crédito, boleto e PIX.',
  'cancelamento': 'Para cancelar, acesse seu painel ou fale com nossa equipe de vendas.',
  'trial': 'Oferecemos 7 dias de teste gratuito em todos os planos.',
};

export function matchesSupportIntent(message: string): boolean {
  const lower = message?.toLowerCase() ?? '';
  return SUPPORT_INTENTS?.some(intent => lower?.includes?.(intent)) ?? false;
}

export function shouldHandoffToSales(message: string): boolean {
  const lower = message?.toLowerCase() ?? '';
  return SALES_KEYWORDS?.some(keyword => lower?.includes?.(keyword)) ?? false;
}

export function shouldHandoffToTechnical(message: string): boolean {
  const lower = message?.toLowerCase() ?? '';
  return TECHNICAL_KEYWORDS?.some(keyword => lower?.includes?.(keyword)) ?? false;
}

function detectFaqTopic(message: string): string | null {
  const lower = message?.toLowerCase() ?? '';

  if (lower?.includes?.('horário') || lower?.includes?.('horario') || lower?.includes?.('funciona')) {
    return 'horario_funcionamento';
  }
  if (lower?.includes?.('contato') || lower?.includes?.('falar') || lower?.includes?.('canal')) {
    return 'canais_contato';
  }
  if (lower?.includes?.('prazo') || lower?.includes?.('demora') || lower?.includes?.('resposta')) {
    return 'prazo_resposta';
  }
  if (lower?.includes?.('pagamento') || lower?.includes?.('pagar') || lower?.includes?.('forma')) {
    return 'formas_pagamento';
  }
  if (lower?.includes?.('cancelar') || lower?.includes?.('cancelamento')) {
    return 'cancelamento';
  }
  if (lower?.includes?.('teste') || lower?.includes?.('trial') || lower?.includes?.('grátis') || lower?.includes?.('gratis')) {
    return 'trial';
  }

  return null;
}

export async function processSupportMessage(
  message: string,
  context: AgentContext
): Promise<AgentResult & { pendingAction?: PendingAction; handoff?: { agent: string; reason: string } }> {
  const lower = message?.toLowerCase() ?? '';

  // Check for handoff to sales
  if (shouldHandoffToSales(message)) {
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.support.n1',
      action: 'handoff_to_sales',
      entityType: 'conversation',
      after: { reason: 'sales_keywords_detected', message: message.substring(0, 100) }
    });

    return {
      agentName: 'Atendimento N1',
      intent: 'handoff_sales',
      confidence: 0.9,
      missingInfo: [],
      options: [],
      proposedActions: [{ action: 'handoff', params: { targetAgent: 'agent.sales' }, requiresConfirmation: false }],
      riskFlags: [],
      suggestedUserMessage: 'Entendi que você tem interesse em nossos planos! Vou transferir você para nosso especialista de vendas que poderá ajudar melhor. 🎯\n\nAguarde um momento...',
      handoff: { agent: 'agent.sales', reason: 'Interesse comercial detectado' }
    };
  }

  // Check for handoff to technical support (not implemented in MVP, but structure ready)
  if (shouldHandoffToTechnical(message)) {
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.support.n1',
      action: 'technical_issue_detected',
      entityType: 'conversation',
      after: { reason: 'technical_keywords_detected', message: message.substring(0, 100) }
    });

    return {
      agentName: 'Atendimento N1',
      intent: 'technical_issue',
      confidence: 0.85,
      missingInfo: ['detalhes_do_erro'],
      options: [
        '1) Descrever o problema com mais detalhes',
        '2) Enviar captura de tela',
        '3) Falar com um humano'
      ],
      proposedActions: [{ action: 'collect_info', params: { type: 'technical' }, requiresConfirmation: false }],
      riskFlags: ['technical_support_needed'],
      suggestedUserMessage: 'Entendo que você está enfrentando um problema técnico. 🔧\n\nPara ajudá-lo melhor, preciso de algumas informações:\n\n1) Descreva o que estava fazendo quando o problema ocorreu\n2) Qual mensagem de erro apareceu (se houver)?\n3) Isso acontece sempre ou só às vezes?\n\nOu se preferir:\n4) Falar com um atendente humano',
      pendingAction: {
        type: 'collect_technical_info',
        agent: 'support',
        data: { issueType: 'technical' },
        summary: 'Coletando informações sobre problema técnico'
      }
    };
  }

  // Check for FAQ match
  const faqTopic = detectFaqTopic(message);
  if (faqTopic && FAQ_DATABASE[faqTopic]) {
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.support.n1',
      action: 'faq_answered',
      entityType: 'faq',
      entityId: faqTopic,
      after: { topic: faqTopic }
    });

    return {
      agentName: 'Atendimento N1',
      intent: 'faq',
      confidence: 0.95,
      missingInfo: [],
      options: ['1) Tenho outra dúvida', '2) Falar com vendas', '3) Encerrar'],
      proposedActions: [{ action: 'answer_faq', params: { topic: faqTopic }, requiresConfirmation: false }],
      riskFlags: [],
      suggestedUserMessage: `${FAQ_DATABASE[faqTopic]}\n\nPosso ajudar com mais alguma coisa?\n\n1) Tenho outra dúvida\n2) Falar sobre planos\n3) Isso era tudo, obrigado!`
    };
  }

  // Human handoff request
  if (lower?.includes?.('humano') || lower?.includes?.('pessoa') || lower?.includes?.('atendente')) {
    return {
      agentName: 'Atendimento N1',
      intent: 'human_handoff',
      confidence: 0.95,
      missingInfo: [],
      options: [],
      proposedActions: [{ action: 'human_handoff', params: {}, requiresConfirmation: true }],
      riskFlags: ['human_requested'],
      suggestedUserMessage: 'Entendo que você prefere falar com uma pessoa. 👤\n\nNosso atendimento humano funciona de segunda a sexta, das 9h às 18h.\n\nDeseja:\n1) Deixar uma mensagem para retorno\n2) Agendar um horário de atendimento\n3) Continuar com o assistente virtual'
    };
  }

  // Generic help/welcome
  return {
    agentName: 'Atendimento N1',
    intent: 'general_help',
    confidence: 0.7,
    missingInfo: [],
    options: [
      '1) Dúvidas sobre o produto',
      '2) Problema técnico',
      '3) Informações sobre planos',
      '4) Falar com um humano'
    ],
    proposedActions: [],
    riskFlags: [],
    suggestedUserMessage: 'Olá! Sou o assistente de atendimento. 😊\n\nComo posso ajudar?\n\n1) Dúvidas sobre o produto\n2) Problema técnico\n3) Informações sobre planos e preços\n4) Falar com um atendente humano\n\nDigite o número da opção ou descreva sua necessidade!'
  };
}
