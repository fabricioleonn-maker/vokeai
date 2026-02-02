
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit/audit-service';
import type { AgentContext, AgentResult, PendingAction } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// AGENTE PROMOHUNTER
// ============================================================================
// Objetivo: Encontrar, validar e alertar sobre promoções.
// Fontes: (Mock inicial) + Scraping futuro.
// ============================================================================

const PROMO_INTENTS = [
    'promoção', 'promocao', 'desconto', 'oferta', 'barato', 'preço', 'preco',
    'cupom', 'liquidação', 'liquidacao', 'black friday', 'monitorar preço',
    'avise quando baixar', 'alerta de preço', 'melhor preço'
];

interface PromoCandidate {
    title: string;
    price: number;
    originalPrice?: number;
    discountPercent?: number;
    store: string;
    url: string;
    imageUrl?: string;
}

// ----------------------------------------------------------------------------
// INTENT RECOGNITION
// ----------------------------------------------------------------------------

export function matchesPromoIntent(message: string): boolean {
    const lower = message.toLowerCase();
    return PROMO_INTENTS.some(intent => lower.includes(intent));
}

// ----------------------------------------------------------------------------
// MOCK SEARCH SOURCE (MVP)
// ----------------------------------------------------------------------------

export async function fetchMockPromos(query: string): Promise<PromoCandidate[]> {
    // Simulating API latency
    await new Promise(resolve => setTimeout(resolve, 800));

    const lowerQuery = query.toLowerCase();

    // Mock database logic
    const mockDb: PromoCandidate[] = [
        { title: 'iPhone 15 128GB', price: 4299, originalPrice: 5499, discountPercent: 21, store: 'Amazon', url: 'https://amazon.com.br/iphone15', imageUrl: 'https://m.media-amazon.com/images/I/71d7rfEXywL._AC_SX679_.jpg' },
        { title: 'Smart TV 55" 4K Samsung', price: 2199, originalPrice: 2899, discountPercent: 24, store: 'Magalu', url: 'https://magalu.com.br/tv55', imageUrl: 'https://a-static.mlcdn.com.br/800x560/smart-tv-55-4k-samsung/magazineluiza/234.jpg' },
        { title: 'Notebook Dell Inspiron i5', price: 3100, originalPrice: 3800, discountPercent: 18, store: 'Mercado Livre', url: 'https://mercadolivre.com.br/dell', imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_967664-MLA51368297750_082022-O.webp' },
        { title: 'Airfryer Mondial 4L', price: 299, originalPrice: 450, discountPercent: 33, store: 'Amazon', url: 'https://amazon.com.br/airfryer', imageUrl: 'https://m.media-amazon.com/images/I/61y8yIqY+gL._AC_SX679_.jpg' },
        { title: 'PlayStation 5 Slim', price: 3400, originalPrice: 3800, discountPercent: 10, store: 'Kabum', url: 'https://kabum.com.br/ps5', imageUrl: 'https://images.kabum.com.br/produtos/fotos/505344/console-playstation-5-slim-sony_1700660600_gg.jpg' }
    ];

    // Simple fuzzy match
    return mockDb.filter(p =>
        p.title.toLowerCase().includes(lowerQuery) ||
        lowerQuery.includes(p.title.toLowerCase().split(' ')[0]) // Match brand/first word
    );
}

// ----------------------------------------------------------------------------
// CORE AGENT LOGIC
// ----------------------------------------------------------------------------

export async function processPromoMessage(
    message: string,
    context: AgentContext
): Promise<AgentResult & { pendingAction?: PendingAction, promoData?: any }> {

    // 1. Detect if user wants to MONITOR/ALERT or just SEARCH
    const isAlertRequest = /avise|monitor|alerta|quando baixar/i.test(message);

    // 2. Extract product term (naive extraction for MVP)
    // Remove keywords and use the rest as query
    const stopWords = ['quero', 'uma', 'um', 'de', 'para', 'na', 'no', 'promoção', 'oferta', 'preço', 'busca', 'encontre', 'mínimo', 'monitorar', 'avise'];
    const words = message.split(' ').filter(w => !stopWords.includes(w.toLowerCase()) && !PROMO_INTENTS.includes(w.toLowerCase()));
    const query = words.join(' ');

    // 3. Log Audit
    await logAudit({
        tenantId: context.tenantId,
        userId: context.userId,
        agentSlug: 'agent.promohunter',
        action: isAlertRequest ? 'create_alert_intent' : 'search_promo',
        entityType: 'promo',
        metadata: { query, isAlertRequest }
    });

    // 4. Handle Alert Creation Flow
    if (isAlertRequest) {
        // If we have a query, confirm alert creation
        if (query.length > 2) {
            return {
                agentName: 'PromoHunter',
                intent: 'create_price_alert',
                confidence: 0.95,
                missingInfo: [],
                options: ['1) Sim, criar alerta', '2) Não, apenas buscar agora'],
                proposedActions: [{ action: 'create_alert', params: { query }, requiresConfirmation: true }],
                riskFlags: [],
                suggestedUserMessage: `Entendi! Você quer ser avisado quando o preço de **${query}** cair. 📉\n\nPosso monitorar isso para você e te avisar no WhatsApp.\n\nConfirma a criação do alerta?`,
                pendingAction: {
                    type: 'confirm_alert',
                    agent: 'promohunter',
                    data: { query },
                    summary: `Confirmar alerta para: ${query}`
                }
            };
        } else {
            // Ask for product name
            return {
                agentName: 'PromoHunter',
                intent: 'ask_product_for_alert',
                confidence: 0.9,
                missingInfo: ['product_name'],
                options: [],
                proposedActions: [],
                riskFlags: [],
                suggestedUserMessage: 'Claro! Posso monitorar preços para você. De qual produto você quer receber alertas? 🕵️‍♂️',
            };
        }
    }

    // 4.5 Handle Menu Selections
    if (/^[1-3]$/.test(query) || /ver mais|comprar|criar alerta/i.test(message)) {
        if (query === '3' || /comprar/i.test(message)) {
            // Handoff to Sales
            return {
                agentName: 'PromoHunter',
                intent: 'handoff_to_sales',
                confidence: 1.0,
                missingInfo: [],
                options: [],
                proposedActions: [],
                riskFlags: [],
                suggestedUserMessage: 'Ótimo! Vou te transferir para nosso especialista de vendas para fechar o pedido com segurança. 🛍️',
                // Orchestrator detects this suggestion or intent and re-routes if configured, 
                // but strictly we should probably use a pendingAction or metadata to signal handoff.
                // For now, reliance on keyword "vendas" or "comprar" in next turn, 
                // BUT current orchestrator might just print this message.
                // A better way is to explicitly ask user "Quer falar com vendas?"
            };
        }
        if (query === '2' || /alerta/i.test(message)) {
            // Ask for product to alert
            return {
                agentName: 'PromoHunter',
                intent: 'ask_product_for_alert',
                confidence: 0.95,
                missingInfo: ['product_name'],
                options: [],
                proposedActions: [],
                riskFlags: [],
                suggestedUserMessage: 'Para qual produto você quer criar o alerta de preço?',
            };
        }
    }

    // 5. Handle Search Flow
    if (query.length < 2) {
        return {
            agentName: 'PromoHunter',
            intent: 'ask_product_search',
            confidence: 0.9,
            missingInfo: ['product_name'],
            options: [],
            proposedActions: [],
            riskFlags: [],
            suggestedUserMessage: 'Olá! Sou seu caçador de promoções. 🏹\n\nQual produto você está procurando hoje?',
        };
    }

    // Perform Search
    const results = await fetchMockPromos(query);

    if (results.length === 0) {
        return {
            agentName: 'PromoHunter',
            intent: 'promo_not_found',
            confidence: 0.9,
            missingInfo: [],
            options: ['1) Criar alerta', '2) Tentar outro termo'],
            proposedActions: [],
            riskFlags: [],
            suggestedUserMessage: `Humm, não encontrei nenhuma promoção imperdível de **${query}** agora. 😕\n\nMas posso ficar de olho para você!\n\nQuer que eu te avise se aparecer algo?`,
            pendingAction: {
                type: 'confirm_alert',
                agent: 'promohunter',
                data: { query },
                summary: `Ofertar alerta para: ${query}`
            }
        };
    }

    // Format Results
    const topResult = results[0];
    const highlights = results.slice(0, 3).map((p, i) =>
        `${i + 1}. **${p.title}**\n   💰 R$ ${p.price} (era R$ ${p.originalPrice})\n   📉 -${p.discountPercent}% na ${p.store}\n   🔗 [Ver Oferta](${p.url})`
    ).join('\n\n');

    return {
        agentName: 'PromoHunter',
        intent: 'promo_results',
        confidence: 0.95,
        missingInfo: [],
        options: ['1) Ver mais ofertas', '2) Criar alerta de preço', '3) Comprar agora'],
        proposedActions: [{ action: 'show_results', params: { count: results.length }, requiresConfirmation: false }],
        riskFlags: [],
        suggestedUserMessage: `Encontrei ${results.length} promoções de **${query}**! 🔥\n\nAqui estão as melhores:\n\n${highlights}\n\nO que achou? Se quiser, posso monitorar se o preço baixa mais.`,
        promoData: { results } // Internal data pass-through
    };
}
