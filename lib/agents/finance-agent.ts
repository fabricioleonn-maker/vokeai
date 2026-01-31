import { financeAdapter } from '@/lib/integrations/finance-adapter';
import { logAudit } from '@/lib/audit/audit-service';
import type { AgentContext, AgentResult, PendingAction, CreateTransactionDto } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FINANCE_INTENTS = [
  'pag', 'pagamento', 'paguei', 'pagar', 'pix', 'transfer', 'boleto',
  'cartão', 'cartao', 'gast', 'gastei', 'despesa', 'lanç', 'lancar',
  'receb', 'recebi', 'entrada', 'fatura', 'conta', 'valor', 'r$', 'reais'
];

export function matchesFinanceIntent(message: string): boolean {
  const lower = message?.toLowerCase() ?? '';
  return FINANCE_INTENTS?.some(intent => lower?.includes?.(intent)) ?? false;
}

function extractAmount(text: string): number | null {
  // Match patterns like "R$ 150", "150 reais", "150,00", "R$150.00"
  const patterns = [
    /r\$\s*([\d.,]+)/i,
    /([\d.,]+)\s*reais/i,
    /([\d.,]+)\s*(?:pra|para|de)/i
  ];
  
  for (const pattern of patterns) {
    const match = text?.match?.(pattern);
    if (match?.[1]) {
      const numStr = match[1]?.replace?.(/\./g, '')?.replace?.(',', '.');
      const num = parseFloat(numStr ?? '0');
      if (!isNaN(num) && num > 0) return num;
    }
  }
  
  // Try to find standalone number
  const numMatch = text?.match?.(/(\d+(?:[.,]\d{2})?)/);
  if (numMatch?.[1]) {
    const numStr = numMatch[1]?.replace?.(',', '.');
    const num = parseFloat(numStr ?? '0');
    if (!isNaN(num) && num > 0) return num;
  }
  
  return null;
}

function extractType(text: string): CreateTransactionDto['type'] {
  const lower = text?.toLowerCase() ?? '';
  
  if (lower?.includes?.('pix')) return 'pix';
  if (lower?.includes?.('cartão') || lower?.includes?.('cartao') || lower?.includes?.('crédito') || lower?.includes?.('credito') || lower?.includes?.('débito') || lower?.includes?.('debito')) return 'card';
  if (lower?.includes?.('boleto')) return 'boleto';
  if (lower?.includes?.('transfer')) return 'transfer';
  if (lower?.includes?.('dinheiro') || lower?.includes?.('especie')) return 'cash';
  
  return 'pix'; // Default
}

function extractDescription(text: string): string {
  // Common patterns
  const patterns = [
    /(?:paguei|gastei|pagar)\s+(?:r\$\s*)?[\d.,]+\s+(?:de\s+)?(.+?)(?:\s+hoje|\s+ontem|$)/i,
    /(?:de|com|no|na|em)\s+(.+?)(?:\s+hoje|\s+ontem|\s+r\$|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = text?.match?.(pattern);
    if (match?.[1]) {
      const desc = match[1]?.trim();
      if ((desc?.length ?? 0) > 2 && (desc?.length ?? 0) < 100) {
        return desc.charAt(0).toUpperCase() + desc.slice(1);
      }
    }
  }
  
  const lower = text?.toLowerCase() ?? '';
  // Extract merchant-like words
  const merchants = ['uber', 'ifood', '99', 'netflix', 'spotify', 'amazon', 'mercado', 'restaurante', 'farmácia', 'posto'];
  for (const merchant of merchants) {
    if (lower?.includes?.(merchant)) {
      return merchant.charAt(0).toUpperCase() + merchant.slice(1);
    }
  }
  
  return 'Pagamento';
}

export async function processFinanceMessage(
  message: string,
  context: AgentContext
): Promise<AgentResult & { pendingAction?: PendingAction }> {
  const lower = message?.toLowerCase() ?? '';
  
  // Check for confirmation responses
  if (context?.pendingAction?.agent === 'finance') {
    if (lower === '1' || lower?.includes?.('confirmar') || lower?.includes?.('sim')) {
      return await executeConfirmedAction(context?.pendingAction, context);
    }
    if (lower === '2' || lower?.includes?.('categoria')) {
      return {
        agentName: 'finance',
        intent: 'adjust_category',
        confidence: 1.0,
        missingInfo: [],
        options: ['Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Moradia', 'SaaS/Assinaturas', 'Outros'],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: 'Qual categoria deseja usar?\n\n1) Alimentação\n2) Transporte\n3) Saúde\n4) Educação\n5) Lazer\n6) Moradia\n7) SaaS/Assinaturas\n8) Outros'
      };
    }
    if (lower === '3' || lower?.includes?.('ajustar valor')) {
      return {
        agentName: 'finance',
        intent: 'adjust_value',
        confidence: 1.0,
        missingInfo: ['novo_valor'],
        options: [],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: 'Qual o valor correto?'
      };
    }
    if (lower === '4' || lower?.includes?.('cancelar') || lower?.includes?.('não')) {
      return {
        agentName: 'finance',
        intent: 'cancelled',
        confidence: 1.0,
        missingInfo: [],
        options: [],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: 'Tudo bem! Lançamento cancelado. Posso ajudar com mais alguma coisa?'
      };
    }
    
    // Check if selecting a category number (1-8)
    const categoryNum = parseInt(lower, 10);
    if (categoryNum >= 1 && categoryNum <= 8) {
      const categories = ['Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Moradia', 'SaaS/Assinaturas', 'Outros'];
      const selectedCategory = categories[categoryNum - 1];
      
      // Update pending action with new category and confirm
      if (context?.pendingAction?.data) {
        (context.pendingAction.data as Record<string, unknown>).category = selectedCategory;
        context.pendingAction.summary = context.pendingAction.summary?.replace?.(/🏷️ Categoria: .+/, `🏷️ Categoria: ${selectedCategory}`);
        return await executeConfirmedAction(context.pendingAction, context);
      }
    }
  }
  
  // Create transaction intent
  if (lower?.includes?.('paguei') || lower?.includes?.('gastei') || lower?.includes?.('pagar') || lower?.includes?.('lançar')) {
    const amount = extractAmount(message);
    
    if (!amount) {
      return {
        agentName: 'finance',
        intent: 'create_transaction',
        confidence: 0.8,
        missingInfo: ['valor'],
        options: [],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: 'Entendi que quer registrar um pagamento. Qual o valor?'
      };
    }
    
    const type = extractType(message);
    const description = extractDescription(message);
    const categorySuggestion = await financeAdapter.categorizeTransaction(description);
    const date = new Date();
    const dateFormatted = format(date, "dd/MM/yyyy", { locale: ptBR });
    
    const typeLabels: Record<string, string> = {
      'pix': 'PIX',
      'card': 'Cartão',
      'boleto': 'Boleto',
      'transfer': 'Transferência',
      'cash': 'Dinheiro'
    };
    
    const pendingAction: PendingAction = {
      type: 'create_transaction',
      agent: 'finance',
      data: {
        type,
        amount,
        category: categorySuggestion?.category ?? 'Outros',
        description,
        date: date.toISOString()
      },
      summary: `💰 Valor: R$ ${amount.toFixed(2).replace('.', ',')}\n📅 Data: ${dateFormatted}\n🏷️ Categoria: ${categorySuggestion?.category ?? 'Outros'}\n💳 Tipo: ${typeLabels[type] ?? type}\n📝 Descrição: ${description}`
    };
    
    return {
      agentName: 'finance',
      intent: 'create_transaction',
      confidence: 0.95,
      missingInfo: [],
      options: ['Confirmar', 'Ajustar categoria', 'Ajustar valor/data', 'Cancelar'],
      proposedActions: [{ action: 'create_transaction', params: pendingAction.data, requiresConfirmation: true }],
      riskFlags: [],
      suggestedUserMessage: `Vou registrar este lançamento:\n\n${pendingAction.summary}\n\nConfirmar?\n1) Confirmar\n2) Ajustar categoria\n3) Ajustar valor/data\n4) Cancelar`,
      pendingAction
    };
  }
  
  // List transactions
  if (lower?.includes?.('extrato') || lower?.includes?.('historico') || lower?.includes?.('histórico') || lower?.includes?.('lançamentos')) {
    try {
      const transactions = await financeAdapter.listTransactions(
        context?.tenantId ?? '',
        context?.userId ?? '',
        {}
      );
      
      const recent = transactions?.slice(0, 5);
      
      if ((recent?.length ?? 0) === 0) {
        return {
          agentName: 'finance',
          intent: 'list_transactions',
          confidence: 0.95,
          missingInfo: [],
          options: [],
          proposedActions: [],
          riskFlags: [],
          suggestedUserMessage: 'Você ainda não tem lançamentos registrados. Gostaria de adicionar um?'
        };
      }
      
      const listFormatted = recent?.map?.((t, i) => 
        `${i + 1}) ${format(new Date(t?.date ?? new Date()), 'dd/MM')} - ${t?.description ?? 'Pagamento'} - R$ ${(t?.amount ?? 0).toFixed(2).replace('.', ',')}`
      )?.join('\n');
      
      const total = recent?.reduce((sum, t) => sum + (t?.amount ?? 0), 0) ?? 0;
      
      return {
        agentName: 'finance',
        intent: 'list_transactions',
        confidence: 0.95,
        missingInfo: [],
        options: [],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: `📊 Últimos lançamentos:\n\n${listFormatted}\n\n💰 Total: R$ ${total.toFixed(2).replace('.', ',')}\n\nPosso ajudar com mais alguma coisa?`
      };
    } catch (error) {
      console.error('Error listing transactions:', error);
    }
  }
  
  // Default: general finance help
  return {
    agentName: 'finance',
    intent: 'general_help',
    confidence: 0.7,
    missingInfo: [],
    options: [],
    proposedActions: [],
    riskFlags: [],
    suggestedUserMessage: 'Posso ajudar com seus lançamentos financeiros! O que gostaria de fazer?\n\n1) Registrar pagamento/despesa\n2) Ver extrato recente\n3) Ver por categoria'
  };
}

async function executeConfirmedAction(
  pendingAction: PendingAction,
  context: AgentContext
): Promise<AgentResult> {
  if (pendingAction?.type === 'create_transaction') {
    try {
      const txnData = pendingAction?.data as { type?: string; amount?: number; category?: string; description?: string; date?: string };
      
      const createTxnDto: CreateTransactionDto = {
        type: (txnData?.type as CreateTransactionDto['type']) ?? 'pix',
        amount: Number(txnData?.amount ?? 0),
        category: String(txnData?.category ?? 'Outros'),
        description: String(txnData?.description ?? 'Pagamento'),
        date: new Date(txnData?.date ?? new Date())
      };
      
      const transaction = await financeAdapter.createTransaction(
        context?.tenantId ?? '',
        context?.userId ?? '',
        createTxnDto
      );
      
      await logAudit({
        tenantId: context?.tenantId ?? '',
        userId: context?.userId,
        agentSlug: 'agent.finance',
        action: 'create_transaction',
        entityType: 'financial_transaction',
        entityId: transaction?.id,
        before: undefined,
        after: { ...(txnData ?? {}) }
      });
      
      return {
        agentName: 'finance',
        intent: 'transaction_created',
        confidence: 1.0,
        missingInfo: [],
        options: [],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: `✅ Lançamento registrado com sucesso!\n\n${pendingAction?.summary ?? ''}\n\nPosso ajudar com mais alguma coisa?`
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return {
        agentName: 'finance',
        intent: 'error',
        confidence: 1.0,
        missingInfo: [],
        options: [],
        proposedActions: [],
        riskFlags: ['execution_error'],
        suggestedUserMessage: 'Desculpe, houve um erro ao registrar o lançamento. Por favor, tente novamente.'
      };
    }
  }
  
  return {
    agentName: 'finance',
    intent: 'unknown_action',
    confidence: 0.5,
    missingInfo: [],
    options: [],
    proposedActions: [],
    riskFlags: [],
    suggestedUserMessage: 'Desculpe, não entendi a ação solicitada. Pode repetir?'
  };
}
