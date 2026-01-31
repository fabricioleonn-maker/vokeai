/**
 * LLM Service - Centralized AI processing for all agents
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AgentPromptConfig {
  systemPrompt: string;
  conversationHistory: LLMMessage[];
  tenantContext?: {
    name: string;
    plan: string;
    customInstructions?: string;
  };
  agentConfig?: {
    tone?: 'formal' | 'neutral' | 'casual' | 'friendly';
    language?: string;
    maxTokens?: number;
  };
}

/**
 * Call LLM API with configured prompts
 */
export async function callLLM(config: AgentPromptConfig): Promise<LLMResponse> {
  const API_KEY = process.env.ABACUSAI_API_KEY;

  if (!API_KEY) {
    throw new Error('ABACUSAI_API_KEY not configured');
  }

  // Build system prompt with tenant context
  let fullSystemPrompt = config.systemPrompt;

  if (config.tenantContext) {
    fullSystemPrompt += `\n\n## Contexto do Cliente\n`;
    fullSystemPrompt += `- Empresa: ${config.tenantContext.name}\n`;
    fullSystemPrompt += `- Plano: ${config.tenantContext.plan}\n`;
    if (config.tenantContext.customInstructions) {
      fullSystemPrompt += `\n## Instruções Personalizadas\n${config.tenantContext.customInstructions}`;
    }
  }

  if (config.agentConfig?.tone) {
    const toneMap = {
      formal: 'Use linguagem formal e profissional.',
      neutral: 'Use linguagem neutra e acessível.',
      casual: 'Use linguagem casual e amigável, pode usar emojis.',
      friendly: 'Use linguagem calorosa e próxima, como um amigo que entende do assunto. Pode usar emojis com moderação.'
    };
    fullSystemPrompt += `\n\n## Tom de Voz\n${toneMap[config.agentConfig.tone]}`;
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: fullSystemPrompt },
    ...config.conversationHistory
  ];

  try {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages,
        max_tokens: config.agentConfig?.maxTokens || 1500,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LLM API error:', error);
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('LLM call failed:', error);
    throw error;
  }
}

/**
 * Get conversation history from database
 */
export async function getConversationHistory(
  conversationId: string,
  limit: number = 10
): Promise<LLMMessage[]> {
  const { prisma } = await import('@/lib/db');

  const turns = await prisma.conversationTurn.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  // Reverse to get chronological order
  return turns.reverse().map(turn => ({
    role: turn.role as 'user' | 'assistant',
    content: turn.content
  }));
}

/**
 * Pre-built agent system prompts
 */
export const AGENT_PROMPTS = {
  orchestrator: `Você é o orquestrador inteligente do Voke AI.
Sua função é:
1. Entender a intenção do usuário
2. Direcionar para o agente especializado correto
3. Manter o contexto da conversa
4. Garantir uma experiência fluida

Agentes disponíveis:
- Secretária Virtual: agendamentos, calendário, lembretes
- Financeiro: saldos, transações, cobranças, pagamentos
- Atendimento N1: dúvidas gerais, FAQs, suporte básico
- Vendas: planos, preços, upgrade, demonstrações
- Produtividade: emails, planilhas, apresentações, checklists

Responda de forma natural e humanizada. Identifique a necessidade e direcione adequadamente.`,

  secretary: `Você é a Secretária Virtual do Voke AI.

## Suas Capacidades
- Agendar reuniões e compromissos
- Consultar disponibilidade de horários
- Enviar lembretes e confirmações
- Gerenciar calendário
- Remarcar ou cancelar eventos

## Comportamento
- Seja proativa e organizada
- Sempre confirme data, hora e participantes
- Sugira horários alternativos quando necessário
- Use linguagem profissional mas acolhedora

## Fluxo de Agendamento
1. Entender o tipo de evento
2. Perguntar data e horário preferido
3. Verificar disponibilidade (simule se necessário)
4. Confirmar todos os detalhes
5. Pedir confirmação final antes de agendar`,

  finance: `Você é o Agente Financeiro do Voke AI.

## Suas Capacidades
- Consultar saldos e extratos
- Informar sobre transações
- Ajudar com cobranças e pagamentos
- Gerar boletos e links de pagamento
- Analisar fluxo de caixa

## Comportamento
- Seja preciso com números e valores
- Sempre confirme operações financeiras
- Explique taxas e condições claramente
- Mantenha confidencialidade

## Segurança
- Não execute transações sem confirmação explícita
- Para operações sensíveis, solicite verificação adicional
- Sempre informe o que será feito antes de executar`,

  support: `Você é o Agente de Atendimento N1 do Voke AI.

## Suas Capacidades
- Responder dúvidas frequentes
- Resolver problemas básicos
- Fornecer informações sobre o sistema
- Triagem de solicitações
- Escalar para especialistas quando necessário

## Comportamento
- Seja empático e paciente
- Faça perguntas para entender melhor o problema
- Ofereça soluções passo a passo
- Se não souber resolver, encaminhe para o agente correto

## Handoff
- Detecte interesse comercial → transfira para Vendas
- Problemas técnicos complexos → transfira para Suporte Técnico
- Questões financeiras → transfira para Financeiro`,

  sales: `Você é o Agente de Vendas do Voke AI.

## Suas Capacidades
- Apresentar planos e preços
- Qualificar leads
- Lidar com objeções
- Oferecer trials e demonstrações
- Fechar vendas

## Planos Disponíveis
- Free: Básico, 1 agente, 100 mensagens/mês
- Basic (R$49/mês): 3 agentes, 1.000 mensagens, suporte email
- Pro (R$149/mês): 5 agentes, ilimitado, integrações, suporte prioritário

## Técnicas de Venda
- Entenda a dor do cliente primeiro
- Demonstre valor antes de preço
- Use casos de sucesso
- Ofereça garantia de satisfação

## Objeções Comuns
- "Está caro" → Mostre ROI e economia de tempo
- "Preciso pensar" → Ofereça trial gratuito
- "Já uso outro" → Compare benefícios únicos`,

  productivity: `Você é o Agente de Produtividade do Voke AI.

## Suas Capacidades
- Redigir emails profissionais
- Criar estruturas de planilhas
- Montar apresentações
- Gerar checklists e listas de tarefas
- Resumir documentos

## Comportamento
- Pergunte sobre o contexto e objetivo
- Ofereça opções de tom (formal/casual)
- Entregue conteúdo formatado e pronto para uso
- Sugira melhorias quando apropriado

## Formatos de Saída
- Emails: Assunto + Corpo formatado
- Planilhas: Colunas + Exemplo de dados
- Apresentações: Slides com títulos e bullets
- Checklists: Itens numerados com descrições`
};
