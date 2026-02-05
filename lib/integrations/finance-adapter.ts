import { prisma } from '@/lib/db';
import type { FinanceAdapter, FinancialTransaction, CreateTransactionDto, TransactionFilters, CategorySuggestion } from '@/lib/types';

const categoryKeywords: Record<string, string[]> = {
  'Alimentação': ['almoço', 'jantar', 'restaurante', 'lanche', 'café', 'comida', 'ifood', 'uber eats', 'mercado', 'supermercado', 'padaria'],
  'Transporte': ['uber', '99', 'taxi', 'gasolina', 'combustível', 'estacionamento', 'pedágio', 'ônibus', 'metrô', 'passagem'],
  'Saúde': ['farmácia', 'remédio', 'médico', 'consulta', 'exame', 'hospital', 'dentista', 'plano de saúde'],
  'Educação': ['curso', 'escola', 'faculdade', 'livro', 'udemy', 'coursera', 'mensalidade'],
  'Lazer': ['cinema', 'show', 'teatro', 'netflix', 'spotify', 'amazon prime', 'disney', 'jogo', 'viagem', 'hotel'],
  'Moradia': ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'internet', 'iptu', 'reforma'],
  'Impostos': ['imposto', 'taxa', 'darf', 'inss', 'irpf', 'icms'],
  'SaaS/Assinaturas': ['assinatura', 'mensalidade', 'plano', 'software', 'app', 'serviço'],
  'Vestuário': ['roupa', 'sapato', 'tênis', 'camisa', 'calça', 'loja'],
  'Comunicação': ['celular', 'telefone', 'operadora', 'tim', 'vivo', 'claro', 'oi']
};

export class MockFinanceAdapter implements FinanceAdapter {
  async createTransaction(
    tenantId: string,
    userId: string,
    transaction: CreateTransactionDto
  ): Promise<FinancialTransaction> {
    /*
    const created = await prisma.financialTransaction.create({
      data: {
        tenantId,
        userId,
        type: transaction?.type ?? 'pix',
        amount: transaction?.amount ?? 0,
        category: transaction?.category ?? 'Outros',
        description: transaction?.description ?? null,
        date: transaction?.date ?? new Date(),
        merchant: transaction?.merchant ?? null,
        installments: transaction?.installments ?? null,
        isRecurring: transaction?.isRecurring ?? false,
        status: 'confirmed'
      }
    });
    */
    const created = { id: 'mock-' + Date.now(), ...transaction, tenantId, userId, date: transaction.date || new Date(), status: 'confirmed' } as any;

    return {
      id: created?.id ?? '',
      tenantId: created?.tenantId ?? tenantId,
      userId: created?.userId ?? userId,
      type: (created?.type as FinancialTransaction['type']) ?? 'pix',
      amount: created?.amount ?? 0,
      category: created?.category ?? 'Outros',
      description: created?.description ?? undefined,
      date: created?.date ?? new Date(),
      status: 'confirmed',
      merchant: created?.merchant ?? undefined,
      installments: created?.installments ?? undefined,
      isRecurring: created?.isRecurring ?? false
    };
  }

  async listTransactions(
    tenantId: string,
    userId: string,
    filters: TransactionFilters
  ): Promise<FinancialTransaction[]> {
    /*
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        tenantId,
        userId,
        ...(filters?.startDate && { date: { gte: filters.startDate } }),
        ...(filters?.endDate && { date: { lte: filters.endDate } }),
        ...(filters?.type && { type: filters.type }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.minAmount && { amount: { gte: filters.minAmount } }),
        ...(filters?.maxAmount && { amount: { lte: filters.maxAmount } })
      },
      orderBy: { date: 'desc' }
    });
    */
    const transactions: any[] = [];

    return transactions?.map((t: any) => ({
      id: t?.id ?? '',
      tenantId: t?.tenantId ?? tenantId,
      userId: t?.userId ?? userId,
      type: (t?.type as FinancialTransaction['type']) ?? 'pix',
      amount: t?.amount ?? 0,
      category: t?.category ?? 'Outros',
      description: t?.description ?? undefined,
      date: t?.date ?? new Date(),
      status: (t?.status as FinancialTransaction['status']) ?? 'confirmed',
      merchant: t?.merchant ?? undefined,
      installments: t?.installments ?? undefined,
      isRecurring: t?.isRecurring ?? false
    })) ?? [];
  }

  async categorizeTransaction(description: string): Promise<CategorySuggestion> {
    const lowerDesc = description?.toLowerCase() ?? '';

    for (const [category, keywords] of Object.entries(categoryKeywords ?? {})) {
      for (const keyword of keywords ?? []) {
        if (lowerDesc?.includes?.(keyword)) {
          return { category, confidence: 0.85 };
        }
      }
    }

    return { category: 'Outros', confidence: 0.5 };
  }
}

export const financeAdapter = new MockFinanceAdapter();
