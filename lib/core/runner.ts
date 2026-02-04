import { callLLM, LLMMessage } from '../agents/llm-service';
import { PromptComposer } from './composer';
import { AgentContext, OrchestratorResponse, AIPersonality } from '../types';

export interface RunnerOptions {
    agentSlug: string;
    intent: string;
    basePrompt: string;
    personality: AIPersonality | null;
    model?: string;
}

export class AgentRunner {
    /**
     * Main entry point for running any agent logic
     */
    static async run(
        message: string,
        context: AgentContext,
        options: RunnerOptions
    ): Promise<OrchestratorResponse> {
        const { agentSlug, intent, basePrompt, personality, model } = options;

        // 1. Compose the Prompt
        const systemPrompt = PromptComposer.compose(agentSlug, basePrompt, personality, {
            intent,
            isFirstInteraction: context.recentMessages.length <= 1
        });

        // 2. Prepare History
        const conversationHistory: LLMMessage[] = context.recentMessages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content
        }));

        // 3. Call LLM
        const llmResponse = await callLLM({
            systemPrompt,
            conversationHistory,
            agentConfig: {
                model: model || 'gpt-4o-mini',
                tier: model === 'gpt-4o' ? 'advanced' : 'lite'
            }
        });

        let finalMessage = llmResponse.content;

        // 4. Apply Guardrails (P1.2 & P0.4)
        finalMessage = PromptComposer.applyGuardrails(finalMessage);
        finalMessage = this.applyAnswerFirstGuardrail(intent, finalMessage);

        // Determine allowed actions based on plan limits
        const isExhausted = (context.planLimits as any).isExhausted || (context as any).aiUsage?.state === 'EXHAUSTED';
        const runnerAllowedActions = isExhausted ? 'explain_only' : 'execute';

        return {
            message: finalMessage,
            agentUsed: agentSlug,
            metadata: {
                intent,
                agent: agentSlug,
                model: model || 'gpt-4o-mini',
                confidence: 1.0,
                reason: 'Successfully executed agent',
                allowed_actions: runnerAllowedActions,
                requires_tools: false,
                tokensUsed: llmResponse.usage?.total_tokens
            }
        };
    }

    /**
     * Ensure the agent answers before questioning (P0.4)
     */
    private static applyAnswerFirstGuardrail(intent: string, text: string): string {
        const trimmed = text.trim();

        // Guardrail for Plans/Pricing
        if (intent === 'PRICING_PLANS' || intent === 'price') {
            // If starts with a question but no answer seemed to be given (rough heuristic)
            if (trimmed.startsWith('?') || (/^(Antes|Para|Me conta)/i.test(trimmed) && !trimmed.includes('R$'))) {
                // This is a simplified check - in a real scenario we might need a small classifier or better regex
                // For now, if it looks like it's ONLY asking a question, we might want to flag it or prefix a default answer
                // But the prompt should handle most of this. This is the "backstop".
            }
        }

        // Guardrail for Exploration/Vague tests
        if (intent === 'EXPLORATION') {
            return "Vejo que você está testando por aqui 🙂\nMe diz: você quer ajuda com atendimento, vendas ou organização interna?";
        }

        // Guardrail for Greetings (Pedro)
        if (intent === 'GREETING' && (trimmed.includes('qual seu nome') || trimmed.includes('sua empresa'))) {
            // Decoupled Identity: The runner should not hardcode the "Pedro" persona.
            // If the composer didn't inject it and the LLM failed to stick to it, 
            // we return a neutral but helpful response.
            return "Olá! Sou seu assistente virtual e estou aqui para ajudar com atendimento, vendas ou organização interna. Como posso ser útil?";
        }

        return text;
    }
}
