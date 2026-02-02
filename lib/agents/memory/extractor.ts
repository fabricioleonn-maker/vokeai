/**
 * Knowledge Extraction System
 * Automatically extracts facts, preferences, and context from conversations
 */

import { prisma } from '@/lib/db';

interface ExtractionResult {
    facts: Array<{
        type: string;
        category?: string;
        entity?: string;
        description: string;
        confidence: number;
    }>;
    preferences: Record<string, any>;
    topics: string[];
    intent: string;
    sentiment: string;
    agentUsed?: string;
}

/**
 * Extract knowledge from a conversation turn using LLM
 */
export async function extractKnowledge(
    conversationId: string,
    userMessage: string,
    assistantResponse: string,
    tenantId: string,
    userId: string,
    metadata?: {
        channel?: string;
        agentUsed?: string;
    }
): Promise<void> {
    try {
        // 1. Chama LLM para extrair insights estruturados
        const extraction = await extractWithLLM(userMessage, assistantResponse, tenantId);

        // 2. Salva fatos estruturados
        if (extraction.facts && extraction.facts.length > 0) {
            await Promise.all(
                extraction.facts.map(fact =>
                    prisma.knowledgeFact.create({
                        data: {
                            tenantId,
                            type: fact.type,
                            category: fact.category,
                            entity: fact.entity,
                            fact: fact.description,
                            source: conversationId,
                            confidence: fact.confidence,
                            metadata: {
                                extractedBy: 'auto',
                                userId,
                                channel: metadata?.channel,
                                timestamp: new Date().toISOString()
                            }
                        }
                    })
                )
            );

            console.log(`✅ Extracted ${extraction.facts.length} knowledge facts`);
        }

        // 3. Atualiza perfil do usuário
        if (extraction.preferences || extraction.topics?.length > 0) {
            const existingProfile = await prisma.userProfile.findUnique({
                where: { userId }
            });

            const updatedPreferences = {
                ...(existingProfile?.preferences as object || {}),
                ...extraction.preferences
            };

            const existingInterests = (existingProfile?.interests || []) as string[];
            const newInterests = Array.from(
                new Set([...existingInterests, ...(extraction.topics || [])])
            );

            await prisma.userProfile.upsert({
                where: { userId },
                update: {
                    preferences: updatedPreferences,
                    interests: newInterests,
                    sentiment: extraction.sentiment || existingProfile?.sentiment,
                    lastIntent: extraction.intent,
                    lastAgentUsed: metadata?.agentUsed
                },
                create: {
                    userId,
                    tenantId,
                    preferences: extraction.preferences || {},
                    interests: extraction.topics || [],
                    sentiment: extraction.sentiment || 'neutral',
                    lastIntent: extraction.intent,
                    lastAgentUsed: metadata?.agentUsed
                }
            });

            console.log(`✅ Updated user profile for ${userId}`);
        }

        // 4. Gera e salva embedding para busca vetorial
        // TODO: Integrar com AbacusAI ou OpenAI embeddings
        // const embedding = await generateEmbedding(userMessage);
        // await saveEmbedding(conversationId, userMessage, embedding, ...);

    } catch (error) {
        console.error('Error extracting knowledge:', error);
        // Não falha silenciosamente - logging é crucial
    }
}

import { callLLM } from '../llm-service';

// ...

/**
 * Use LLM to extract structured insights from conversation
 */
async function extractWithLLM(
    userMsg: string,
    assistantMsg: string,
    tenantId: string
): Promise<ExtractionResult> {
    // Get tenant context for better extraction
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
            businessSector: true,
            businessType: true,
            glossary: true,
            productsServices: true
        }
    });

    const sectorContext = tenant?.businessSector
        ? `Esta empresa atua no setor de ${tenant.businessSector}.`
        : '';
    const glossaryContext = tenant?.glossary
        ? `Glossário de termos: ${JSON.stringify(tenant.glossary)}`
        : '';

    const systemPrompt = `
Você é um extrator de conhecimento especializado. Analise esta conversa e extraia insights valiosos.

${sectorContext}
${glossaryContext}

Extraia e retorne um JSON estruturado com:

{
  "facts": [
    {
      "type": "user_preference | business_context | product_info | conversation_outcome | sector_knowledge",
      "category": "sales | support | finance | general | product | service",
      "entity": "Nome da pessoa/produto/serviço sobre o qual é o fato",
      "description": "Descrição clara do fato",
      "confidence": 0.0 a 1.0
    }
  ],
  "preferences": {
    "contact_method": "whatsapp | email | phone",
    "best_time": "morning | afternoon | evening",
    "language_style": "formal | casual",
    "key": "value"
  },
  "topics": ["topic1", "topic2"],
  "intent": "sales_inquiry | support_request | information | complaint | feedback | general",
  "sentiment": "positive | neutral | negative"
}

REGRAS:
1. Extraia apenas fatos CONCRETOS mencionados na conversa
2. NÃO invente informações
3. Se não houver fatos relevantes, retorne array vazio
4. Confidence alto (>0.8) apenas para fatos explícitos
5. Use o glossário para identificar termos específicos do setor

Retorne APENAS o JSON.
`.trim();

    try {
        const conversationHistory = [
            { role: 'user', content: `Usuário: "${userMsg}"\nAssistente: "${assistantMsg}"` }
        ] as any[];

        const response = await callLLM({
            systemPrompt,
            conversationHistory,
            agentConfig: {
                maxTokens: 1000,
                temperature: 0.3
            }
        });

        const content = response.content || '{}';

        // Parse JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('No JSON found in LLM response');
            return {
                facts: [],
                preferences: {},
                topics: [],
                intent: 'general',
                sentiment: 'neutral'
            };
        }

        const extracted = JSON.parse(jsonMatch[0]);
        return {
            facts: extracted.facts || [],
            preferences: extracted.preferences || {},
            topics: extracted.topics || [],
            intent: extracted.intent || 'general',
            sentiment: extracted.sentiment || 'neutral'
        };

    } catch (error) {
        console.error('Error in extractWithLLM:', error);
        return {
            facts: [],
            preferences: {},
            topics: [],
            intent: 'general',
            sentiment: 'neutral'
        };
    }
}

/**
 * Generate embedding vector for semantic search
 * TODO: Integrate with embedding provider
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    // Placeholder - integrate with OpenAI or AbacusAI embeddings
    // For now, return empty array
    console.warn('generateEmbedding not yet implemented');
    return [];
}

/**
 * Save conversation embedding for vector search
 */
export async function saveEmbedding(
    conversationId: string,
    turnId: string | null,
    text: string,
    embedding: number[],
    metadata: {
        tenantId: string;
        userId: string;
        agentUsed?: string;
        channel?: string;
        intent?: string;
        sentiment?: string;
        topics?: string[];
    }
): Promise<void> {
    if (embedding.length === 0) {
        return; // Skip if embeddings not implemented yet
    }

    await prisma.conversationEmbedding.create({
        data: {
            conversationId,
            turnId,
            tenantId: metadata.tenantId,
            userId: metadata.userId,
            text,
            embedding,
            agentUsed: metadata.agentUsed,
            channel: metadata.channel,
            intent: metadata.intent,
            sentiment: metadata.sentiment,
            topics: metadata.topics || []
        }
    });
}
