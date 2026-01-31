import { logAudit } from '@/lib/audit/audit-service';
import type { AgentContext, AgentResult, PendingAction } from '@/lib/types';

// Agente de Produtividade / Preenchimento de Dados
// Responsável por e-mails, documentos, planilhas, apresentações

const PRODUCTIVITY_INTENTS = [
  'email', 'e-mail', 'escrever', 'redigir', 'texto', 'mensagem',
  'planilha', 'excel', 'documento', 'doc', 'word', 'relatório', 'relatorio',
  'apresentação', 'apresentacao', 'slide', 'powerpoint', 'ppt',
  'resumo', 'resumir', 'reescrever', 'melhorar', 'formatar',
  'lista', 'checklist', 'ata', 'roteiro'
];

type ContentType = 'email' | 'document' | 'spreadsheet' | 'presentation' | 'summary' | 'checklist';

interface ContentRequest {
  type: ContentType;
  context: string;
  tone?: 'formal' | 'neutral' | 'casual';
  data?: Record<string, unknown>;
}

export function matchesProductivityIntent(message: string): boolean {
  const lower = message?.toLowerCase() ?? '';
  return PRODUCTIVITY_INTENTS?.some(intent => lower?.includes?.(intent)) ?? false;
}

function detectContentType(message: string): ContentType | null {
  const lower = message?.toLowerCase() ?? '';
  
  if (lower?.includes?.('email') || lower?.includes?.('e-mail')) {
    return 'email';
  }
  if (lower?.includes?.('planilha') || lower?.includes?.('excel') || lower?.includes?.('tabela')) {
    return 'spreadsheet';
  }
  if (lower?.includes?.('apresentação') || lower?.includes?.('apresentacao') || lower?.includes?.('slide') || lower?.includes?.('ppt')) {
    return 'presentation';
  }
  if (lower?.includes?.('documento') || lower?.includes?.('doc') || lower?.includes?.('word') || lower?.includes?.('relatório') || lower?.includes?.('relatorio')) {
    return 'document';
  }
  if (lower?.includes?.('resumo') || lower?.includes?.('resumir')) {
    return 'summary';
  }
  if (lower?.includes?.('checklist') || lower?.includes?.('lista') || lower?.includes?.('tarefas')) {
    return 'checklist';
  }
  
  return null;
}

function detectTone(message: string): 'formal' | 'neutral' | 'casual' {
  const lower = message?.toLowerCase() ?? '';
  
  if (lower?.includes?.('formal') || lower?.includes?.('profissional') || lower?.includes?.('corporativo')) {
    return 'formal';
  }
  if (lower?.includes?.('informal') || lower?.includes?.('casual') || lower?.includes?.('amigável') || lower?.includes?.('descontraído')) {
    return 'casual';
  }
  
  return 'neutral';
}

function generateEmailDraft(context: string, tone: 'formal' | 'neutral' | 'casual'): string {
  // Em produção, isso usaria LLM para gerar conteúdo real
  const greetings = {
    formal: 'Prezado(a)',
    neutral: 'Olá',
    casual: 'Oi'
  };
  
  const closings = {
    formal: 'Atenciosamente,',
    neutral: 'Abraços,',
    casual: 'Até mais!'
  };
  
  return `${greetings[tone]},\n\n[Conteúdo baseado em: ${context}]\n\n${closings[tone]}\n[Seu nome]`;
}

function generateSpreadsheetStructure(context: string): { columns: string[]; sampleRows: string[][] } {
  // Detecta tipo de planilha pelo contexto
  const lower = context?.toLowerCase() ?? '';
  
  if (lower?.includes?.('despesa') || lower?.includes?.('gasto') || lower?.includes?.('financeiro')) {
    return {
      columns: ['Data', 'Descrição', 'Categoria', 'Valor', 'Status'],
      sampleRows: [
        ['01/02/2026', 'Exemplo despesa', 'Alimentação', 'R$ 50,00', 'Pago'],
        ['02/02/2026', 'Exemplo despesa 2', 'Transporte', 'R$ 30,00', 'Pendente']
      ]
    };
  }
  
  if (lower?.includes?.('cliente') || lower?.includes?.('contato') || lower?.includes?.('lead')) {
    return {
      columns: ['Nome', 'Email', 'Telefone', 'Empresa', 'Status'],
      sampleRows: [
        ['João Silva', 'joao@email.com', '(11) 99999-9999', 'Empresa ABC', 'Ativo'],
        ['Maria Santos', 'maria@email.com', '(11) 88888-8888', 'Empresa XYZ', 'Prospecto']
      ]
    };
  }
  
  if (lower?.includes?.('tarefa') || lower?.includes?.('projeto') || lower?.includes?.('atividade')) {
    return {
      columns: ['Tarefa', 'Responsável', 'Prazo', 'Prioridade', 'Status'],
      sampleRows: [
        ['Tarefa exemplo 1', 'João', '15/02/2026', 'Alta', 'Em andamento'],
        ['Tarefa exemplo 2', 'Maria', '20/02/2026', 'Média', 'Pendente']
      ]
    };
  }
  
  // Genérico
  return {
    columns: ['Coluna A', 'Coluna B', 'Coluna C', 'Coluna D'],
    sampleRows: [
      ['Dado 1', 'Dado 2', 'Dado 3', 'Dado 4'],
      ['Dado 5', 'Dado 6', 'Dado 7', 'Dado 8']
    ]
  };
}

function generatePresentationOutline(context: string): { title: string; slides: string[] } {
  return {
    title: `Apresentação: ${context.substring(0, 50)}`,
    slides: [
      'Slide 1: Título e Introdução',
      'Slide 2: Contexto / Problema',
      'Slide 3: Solução Proposta',
      'Slide 4: Benefícios / Resultados',
      'Slide 5: Próximos Passos',
      'Slide 6: Perguntas e Contato'
    ]
  };
}

function generateChecklist(context: string): string[] {
  const lower = context?.toLowerCase() ?? '';
  
  if (lower?.includes?.('reunião') || lower?.includes?.('reuniao') || lower?.includes?.('meeting')) {
    return [
      '☐ Definir pauta',
      '☐ Enviar convites',
      '☐ Preparar apresentação',
      '☐ Reservar sala/link',
      '☐ Enviar lembrete',
      '☐ Preparar ata'
    ];
  }
  
  if (lower?.includes?.('projeto') || lower?.includes?.('lançamento') || lower?.includes?.('lancamento')) {
    return [
      '☐ Definir escopo',
      '☐ Criar cronograma',
      '☐ Alocar recursos',
      '☐ Identificar riscos',
      '☐ Comunicar stakeholders',
      '☐ Realizar kickoff'
    ];
  }
  
  return [
    '☐ Item 1',
    '☐ Item 2',
    '☐ Item 3',
    '☐ Item 4',
    '☐ Item 5'
  ];
}

export async function processProductivityMessage(
  message: string,
  context: AgentContext
): Promise<AgentResult & { pendingAction?: PendingAction; generatedContent?: unknown }> {
  const lower = message?.toLowerCase() ?? '';
  
  // Handle confirmation responses
  if (context.pendingAction?.type?.startsWith?.('confirm_') && (lower === '1' || lower?.includes?.('sim') || lower?.includes?.('confirm'))) {
    const pendingData = context.pendingAction.data as unknown as ContentRequest;
    
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.productivity',
      action: `create_${pendingData?.type ?? 'content'}`,
      entityType: pendingData?.type ?? 'content',
      after: { status: 'created', context: pendingData?.context?.substring?.(0, 100) }
    });
    
    return {
      agentName: 'Produtividade',
      intent: 'content_created',
      confidence: 0.95,
      missingInfo: [],
      options: ['1) Criar outro conteúdo', '2) Ajustar este', '3) Isso era tudo'],
      proposedActions: [{ action: 'content_created', params: {}, requiresConfirmation: false }],
      riskFlags: [],
      suggestedUserMessage: `✅ Conteúdo criado com sucesso!\n\nO que mais posso ajudar?\n\n1) Criar outro conteúdo\n2) Fazer ajustes neste\n3) Isso era tudo, obrigado!`
    };
  }
  
  // Detect content type
  const contentType = detectContentType(message);
  const tone = detectTone(message);
  
  // EMAIL
  if (contentType === 'email') {
    const draft = generateEmailDraft(message, tone);
    
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.productivity',
      action: 'draft_email',
      entityType: 'email',
      after: { tone, context: message.substring(0, 100) }
    });
    
    return {
      agentName: 'Produtividade',
      intent: 'create_email',
      confidence: 0.9,
      missingInfo: ['destinatario', 'assunto'],
      options: ['1) Usar este rascunho', '2) Mais formal', '3) Mais casual', '4) Refazer'],
      proposedActions: [{ action: 'create_email', params: { tone }, requiresConfirmation: true }],
      riskFlags: [],
      suggestedUserMessage: `📧 Preparei um rascunho de email (tom ${tone === 'formal' ? 'formal' : tone === 'casual' ? 'casual' : 'neutro'}):\n\n---\n${draft}\n---\n\nO que acha?\n\n1) Está bom, usar este\n2) Deixar mais formal\n3) Deixar mais casual\n4) Refazer com outras informações`,
      pendingAction: {
        type: 'confirm_email',
        agent: 'productivity',
        data: { type: 'email', context: message, tone },
        summary: 'Confirmação do rascunho de email'
      },
      generatedContent: { type: 'email', draft, tone }
    };
  }
  
  // SPREADSHEET
  if (contentType === 'spreadsheet') {
    const structure = generateSpreadsheetStructure(message);
    
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.productivity',
      action: 'draft_spreadsheet',
      entityType: 'spreadsheet',
      after: { columns: structure.columns, context: message.substring(0, 100) }
    });
    
    const columnsText = structure.columns.join(' | ');
    const sampleText = structure.sampleRows.map(row => row.join(' | ')).join('\n');
    
    return {
      agentName: 'Produtividade',
      intent: 'create_spreadsheet',
      confidence: 0.9,
      missingInfo: [],
      options: ['1) Criar planilha', '2) Adicionar colunas', '3) Mudar estrutura'],
      proposedActions: [{ action: 'create_spreadsheet', params: { structure }, requiresConfirmation: true }],
      riskFlags: [],
      suggestedUserMessage: `📊 Preparei a estrutura da planilha:\n\n**Colunas:**\n${columnsText}\n\n**Exemplo de dados:**\n${sampleText}\n\nConfirma a criação?\n\n1) Sim, criar planilha\n2) Adicionar mais colunas\n3) Mudar a estrutura`,
      pendingAction: {
        type: 'confirm_spreadsheet',
        agent: 'productivity',
        data: { type: 'spreadsheet', context: message, structure },
        summary: 'Confirmação da estrutura da planilha'
      },
      generatedContent: { type: 'spreadsheet', structure }
    };
  }
  
  // PRESENTATION
  if (contentType === 'presentation') {
    const outline = generatePresentationOutline(message);
    
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.productivity',
      action: 'draft_presentation',
      entityType: 'presentation',
      after: { slides: outline.slides.length, context: message.substring(0, 100) }
    });
    
    const slidesText = outline.slides.map((s, i) => `  ${i + 1}. ${s.replace(/^Slide \d+: /, '')}`).join('\n');
    
    return {
      agentName: 'Produtividade',
      intent: 'create_presentation',
      confidence: 0.9,
      missingInfo: [],
      options: ['1) Criar apresentação', '2) Adicionar slides', '3) Mudar roteiro'],
      proposedActions: [{ action: 'create_presentation', params: { outline }, requiresConfirmation: true }],
      riskFlags: [],
      suggestedUserMessage: `📽️ Preparei o roteiro da apresentação:\n\n**${outline.title}**\n\n**Slides:**\n${slidesText}\n\nConfirma a criação?\n\n1) Sim, criar apresentação\n2) Adicionar mais slides\n3) Mudar o roteiro`,
      pendingAction: {
        type: 'confirm_presentation',
        agent: 'productivity',
        data: { type: 'presentation', context: message, outline },
        summary: 'Confirmação do roteiro da apresentação'
      },
      generatedContent: { type: 'presentation', outline }
    };
  }
  
  // CHECKLIST
  if (contentType === 'checklist') {
    const items = generateChecklist(message);
    
    await logAudit({
      tenantId: context.tenantId,
      userId: context.userId,
      agentSlug: 'agent.productivity',
      action: 'create_checklist',
      entityType: 'checklist',
      after: { items: items.length, context: message.substring(0, 100) }
    });
    
    return {
      agentName: 'Produtividade',
      intent: 'create_checklist',
      confidence: 0.9,
      missingInfo: [],
      options: ['1) Usar este checklist', '2) Adicionar itens', '3) Personalizar'],
      proposedActions: [{ action: 'create_checklist', params: { items }, requiresConfirmation: false }],
      riskFlags: [],
      suggestedUserMessage: `✅ Criei um checklist para você:\n\n${items.join('\n')}\n\nO que acha?\n\n1) Está perfeito\n2) Adicionar mais itens\n3) Personalizar os itens`,
      generatedContent: { type: 'checklist', items }
    };
  }
  
  // SUMMARY
  if (contentType === 'summary') {
    return {
      agentName: 'Produtividade',
      intent: 'create_summary',
      confidence: 0.85,
      missingInfo: ['texto_para_resumir'],
      options: [],
      proposedActions: [{ action: 'request_text', params: {}, requiresConfirmation: false }],
      riskFlags: [],
      suggestedUserMessage: '📝 Posso criar um resumo para você!\n\nPor favor, cole ou envie o texto que você quer resumir.',
      pendingAction: {
        type: 'await_text',
        agent: 'productivity',
        data: { type: 'summary' },
        summary: 'Aguardando texto para resumir'
      }
    };
  }
  
  // Generic productivity welcome
  return {
    agentName: 'Produtividade',
    intent: 'productivity_welcome',
    confidence: 0.8,
    missingInfo: ['tipo_conteudo'],
    options: [
      '1) Escrever email',
      '2) Criar planilha',
      '3) Criar apresentação',
      '4) Fazer checklist'
    ],
    proposedActions: [],
    riskFlags: [],
    suggestedUserMessage: 'Olá! Sou o agente de Produtividade. 📝\n\nPosso ajudar a criar diversos tipos de conteúdo:\n\n1) ✉️ Escrever ou melhorar emails\n2) 📊 Criar estrutura de planilhas\n3) 📽️ Montar roteiro de apresentações\n4) ✅ Criar checklists\n\nO que você precisa?'
  };
}
