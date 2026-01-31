/**
 * Context Builder
 * Retrieves and assembles rich context for AI agents
 */

import { prisma } from '@/lib/db';

export interface EnrichedContext {
    // Business Profile
    businessProfile: {
        sector?: string;
        type?: string;
        size?: string;
        targetAudience?: string;
        products?: any[];
        glossary?: Record<string, string>;
        brandVoice?: Record<string, any>;
    };

    // Knowledge Base
    knownFacts: string[];
    factEntities: Array<{ entity: string; facts: string[] }>;

    // User Context
    userPreferences: Record<string, any>;
    userInterests: string[];
    userSentiment?: string;
    lastIntent?: string;

    // Historical Context
    relevantHistory: Array<{
        text: string;
        similarity?: number;
        when: string;
    }>;

    // Business Rules
    businessRules: Array<{
        name: string;
        description?: string;
        action: string;
        payload: any;
    }>;

    // Personality
    personality: any;
}

/**
 * Build enriched context for an AI agent
 */
export async function buildEnrichedContext(
    tenantId: string,
    userId: string,
    message: string,
    options?: {
        maxFacts?: number;
        maxHistory?: number;
        includeRules?: boolean;
    }
): Promise<EnrichedContext> {
    const maxFacts = options?.maxFacts || 10;
    const maxHistory = options?.maxHistory || 5;
    const includeRules = options?.includeRules !== false;

    // Run queries in parallel for performance
    const [
        tenant,
        facts,
        userProfile,
        businessRules
    ] = await Promise.all([
        // 1. Get tenant business profile
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                aiPersonality: true,
                businessSector: true,
                businessType: true,
                companySize: true,
                targetAudience: true,
                productsServices: true,
                glossary: true,
                brandVoice: true
            }
        }),

        // 2. Get relevant knowledge facts
        getRelevantFacts(tenantId, message, maxFacts),

        // 3. Get user profile
        prisma.userProfile.findUnique({
            where: { userId },
            select: {
                preferences: true,
                interests: true,
                sentiment: true,
                lastIntent: true,
                lastTopic: true
            }
        }),

        // 4. Get active business rules
        includeRules
            ? prisma.businessRule.findMany({
                where: {
                    tenantId,
                    active: true
                },
                select: {
                    name: true,
                    description: true,
                    action: true,
                    payload: true,
                    priority: true
                },
                orderBy: { priority: 'desc' },
                take: 10
            })
            : Promise.resolve([])
    ]);

    // 5. Get relevant conversation history (vector search)
    // TODO: Implement when embeddings are ready
    const relevantHistory = await getRelevantHistory(tenantId, userId, message, maxHistory);

    // 6. Group facts by entity
    const factsByEntity = groupFactsByEntity(facts);

    return {
        businessProfile: {
            sector: tenant?.businessSector || undefined,
            type: tenant?.businessType || undefined,
            size: tenant?.companySize || undefined,
            targetAudience: tenant?.targetAudience || undefined,
            products: (tenant?.productsServices as any[]) || [],
            glossary: (tenant?.glossary as Record<string, string>) || {},
            brandVoice: (tenant?.brandVoice as Record<string, any>) || {}
        },

        knownFacts: facts.map(f => f.fact),
        factEntities: factsByEntity,

        userPreferences: (userProfile?.preferences as Record<string, any>) || {},
        userInterests: userProfile?.interests || [],
        userSentiment: userProfile?.sentiment || undefined,
        lastIntent: userProfile?.lastIntent || undefined,

        relevantHistory,

        businessRules: businessRules.map(r => ({
            name: r.name,
            description: r.description || undefined,
            action: r.action,
            payload: r.payload
        })),

        personality: tenant?.aiPersonality || {}
    };
}

/**
 * Get relevant knowledge facts based on message content
 */
async function getRelevantFacts(
    tenantId: string,
    message: string,
    limit: number
): Promise<Array<{ fact: string; entity?: string; confidence: number }>> {
    // Extract potential entities/keywords from message
    const keywords = extractKeywords(message);

    if (keywords.length === 0) {
        // No keywords, get recent high-confidence facts
        const facts = await prisma.knowledgeFact.findMany({
            where: {
                tenantId,
                active: true
            },
            select: {
                fact: true,
                entity: true,
                confidence: true
            },
            orderBy: [
                { confidence: 'desc' },
                { createdAt: 'desc' }
            ],
            take: limit
        });

        return facts;
    }

    // Search facts by entity or full-text
    const facts = await prisma.knowledgeFact.findMany({
        where: {
            tenantId,
            active: true,
            OR: [
                // Match entities
                ...keywords.map(keyword => ({
                    entity: { contains: keyword, mode: 'insensitive' as const }
                })),
                // Match fact content
                ...keywords.map(keyword => ({
                    fact: { contains: keyword, mode: 'insensitive' as const }
                }))
            ]
        },
        select: {
            fact: true,
            entity: true,
            confidence: true
        },
        orderBy: { confidence: 'desc' },
        take: limit
    });

    return facts;
}

/**
 * Get relevant conversation history
 * TODO: Implement vector similarity search
 */
async function getRelevantHistory(
    tenantId: string,
    userId: string,
    _message: string,
    limit: number
): Promise<Array<{ text: string; similarity?: number; when: string }>> {
    // Placeholder: Get recent conversations for now
    // In production, use vector similarity search

    const recentConversations = await prisma.conversation.findMany({
        where: {
            tenantId,
            userId,
            status: 'active'
        },
        include: {
            turns: {
                where: { role: 'user' },
                take: 1,
                orderBy: { createdAt: 'desc' }
            }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
    });

    return recentConversations
        .filter(conv => conv.turns.length > 0)
        .map(conv => ({
            text: conv.turns[0].content.substring(0, 200),
            when: conv.updatedAt.toISOString()
        }));
}

/**
 * Group facts by entity for organized display
 */
function groupFactsByEntity(
    facts: Array<{ fact: string; entity?: string; confidence: number }>
): Array<{ entity: string; facts: string[] }> {
    const grouped = new Map<string, string[]>();

    for (const f of facts) {
        const entity = f.entity || 'Geral';
        if (!grouped.has(entity)) {
            grouped.set(entity, []);
        }
        grouped.get(entity)!.push(f.fact);
    }

    return Array.from(grouped.entries()).map(([entity, facts]) => ({
        entity,
        facts
    }));
}

/**
 * Extract keywords from message for fact matching
 */
function extractKeywords(message: string): string[] {
    // Simple keyword extraction
    // TODO: Use NLP for better extraction

    const words = message
        .toLowerCase()
        .replace(/[^\w\sáàâãéêíóôõúç]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3); // Only words with 4+ chars

    // Remove common stop words
    const stopWords = new Set([
        'para', 'com', 'sobre', 'quando', 'como', 'qual', 'quais',
        'onde', 'porque', 'esse', 'essa', 'este', 'esta', 'isso',
        'você', 'vocês', 'eles', 'elas', 'mais', 'menos', 'muito'
    ]);

    return words
        .filter(w => !stopWords.has(w))
        .slice(0, 5); // Max 5 keywords
}

/**
 * Format context for injection into agent prompt
 */
export function formatContextForPrompt(context: EnrichedContext): string {
    const sections: string[] = [];

    // Business Profile
    if (context.businessProfile.sector) {
        sections.push(`## PERFIL DA EMPRESA
Setor: ${context.businessProfile.sector}
Tipo: ${context.businessProfile.type || 'N/A'}
Público-alvo: ${context.businessProfile.targetAudience || 'N/A'}`);

        if (context.businessProfile.products?.length > 0) {
            sections.push(`
Produtos/Serviços:
${context.businessProfile.products.map((p: any, i: number) => `${i + 1}. ${typeof p === 'string' ? p : p.name || JSON.stringify(p)}`).join('\n')}`);
        }

        if (Object.keys(context.businessProfile.glossary || {}).length > 0) {
            sections.push(`
Glossário Específico:
${Object.entries(context.businessProfile.glossary!).map(([term, def]) => `- ${term}: ${def}`).join('\n')}`);
        }
    }

    // Known Facts
    if (context.knownFacts.length > 0) {
        sections.push(`## CONHECIMENTO ACUMULADO
${context.knownFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
    }

    // User Context
    if (Object.keys(context.userPreferences).length > 0 || context.userInterests.length > 0) {
        sections.push(`## SOBRE O USUÁRIO`);

        if (Object.keys(context.userPreferences).length > 0) {
            sections.push(`Preferências: ${JSON.stringify(context.userPreferences, null, 2)}`);
        }

        if (context.userInterests.length > 0) {
            sections.push(`Interesses conhecidos: ${context.userInterests.join(', ')}`);
        }

        if (context.userSentiment) {
            sections.push(`Sentimento geral: ${context.userSentiment}`);
        }
    }

    // Historical Context
    if (context.relevantHistory.length > 0) {
        sections.push(`## CONVERSAS ANTERIORES RELEVANTES
${context.relevantHistory.map((h, i) => `[${i + 1}] ${h.text}... (${new Date(h.when).toLocaleDateString('pt-BR')})`).join('\n\n')}`);
    }

    // Business Rules
    if (context.businessRules.length > 0) {
        sections.push(`## REGRAS DE NEGÓCIO
${context.businessRules.map((r, i) => `${i + 1}. ${r.name}${r.description ? `: ${r.description}` : ''}`).join('\n')}`);
    }

    return sections.join('\n\n');
}
