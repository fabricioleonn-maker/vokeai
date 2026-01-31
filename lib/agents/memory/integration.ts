/**
 * Enhanced Orchestrator with AI Memory System
 * Integrates knowledge extraction and context enrichment
 */

import { processMessage as processMessageOriginal } from '../orchestrator';
import { buildEnrichedContext, formatContextForPrompt } from '../memory/context-builder';
import { extractKnowledge } from '../memory/extractor';
import { prisma } from '@/lib/db';

/**
 * Process message with AI memory integration
 * Wraps original orchestrator with memory capabilities
 */
export async function processMessageWithMemory(
    tenantId: string,
    userId: string,
    conversationId: string,
    message: string,
    channel: string = 'web',
    isTestMode: boolean = false
) {
    // 1. Build enriched context BEFORE processing
    const enrichedContext = await buildEnrichedContext(tenantId, userId, message);

    // 2. Format context for injection
    const contextPrompt = formatContextForPrompt(enrichedContext);

    // 3. Log context being used (debugging)
    console.log('🧠 Enriched Context Preview:', {
        factsCount: enrichedContext.knownFacts.length,
        userInterests: enrichedContext.userInterests,
        businessSector: enrichedContext.businessProfile.sector,
        historyCount: enrichedContext.relevantHistory.length
    });

    // 4. TODO: Inject context into agent prompts
    // For now, process normally
    const response = await processMessageOriginal(
        tenantId,
        userId,
        conversationId,
        message,
        channel,
        isTestMode
    );

    // 5. Extract knowledge AFTER getting response
    if (response.message) {
        try {
            await extractKnowledge(
                conversationId,
                message,
                response.message,
                tenantId,
                userId,
                {
                    channel,
                    agentUsed: response.agentUsed
                }
            );
        } catch (error) {
            console.error('Error extracting knowledge:', error);
            // Don't fail the whole request if extraction fails
        }
    }

    return response;
}

/**
 * Inject enriched context into agent prompt
 * Call this before sending to LLM
 */
export function enrichSystemPrompt(
    basePrompt: string,
    enrichedContext: ReturnType<typeof formatContextForPrompt>
): string {
    return `
${basePrompt}

═══════════════════════════════════════════════════════════
CONTEXTO ENRIQUECIDO (Use este conhecimento para personalizar sua resposta)
═══════════════════════════════════════════════════════════

${enrichedContext}

═══════════════════════════════════════════════════════════

INSTRUÇÕES:
1. Use TODOS os fatos e preferências acima para personalizar sua resposta
2. Mencione contexto relevante quando apropriado ("Como discutimos anteriormente...")
3. Respeite o tom de voz e glossário da empresa
4. Adapte seu estilo ao setor empresarial indicado
5. NÃO mencione explicitamente que você tem "memória" ou "contexto" - use naturalmente

Responda agora considerando TODO este contexto:
  `.trim();
}
