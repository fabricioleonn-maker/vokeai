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

        // 4. Apply Guardrails & Post-Checks (Cognitive Hardening)
        const guardrails = await this.executeGuardrails(message, llmResponse.content, intent, context);

        // 5. Fallback Orchestration
        let fallbackType: 'none' | 'clarify_once' | 'regenerate_once' = 'none';

        if (guardrails.verdict === 'HARD_FAIL') {
            // Attempt 1: Regenerate with "stay-on-intent" instruction
            const retryResponse = await callLLM({
                systemPrompt: systemPrompt + "\n\nCRITICAL: A resposta anterior foi sinalizada como fora de domínio ou temporalmente desalinhada. REGENERE focando exclusivamente no intent detectado e no horizonte temporal solicitado. Cumpra a regra ANSWER FIRST.",
                conversationHistory,
                agentConfig: { model: model || 'gpt-4o-mini', tier: 'lite' }
            });

            const retryGuardrail = await this.executeGuardrails(message, retryResponse.content, intent, context);
            if (retryGuardrail.verdict === 'HARD_FAIL' || retryGuardrail.verdict === 'SOFT_FAIL') {
                // Persistent failure -> Fallback to Clarify-1
                finalMessage = "Entendi o seu pedido, mas para ser mais preciso: você está se referindo a [assunto do intent] ou gostaria de tratar de outra coisa?";
                fallbackType = 'clarify_once';
            } else {
                finalMessage = retryResponse.content;
                fallbackType = 'regenerate_once';
            }
        } else if (guardrails.verdict === 'SOFT_FAIL') {
            // Keep message + append short alignment question
            finalMessage = `${llmResponse.content}\n\nConsegui te ajudar com isso ou você tinha algo mais específico em mente sobre ${intent.toLowerCase()}?`;
            fallbackType = 'clarify_once';
        }

        // Apply visual/formatting cleanup
        finalMessage = PromptComposer.applyGuardrails(finalMessage);

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
                reason: 'Executed with cognitive hardening',
                allowed_actions: runnerAllowedActions,
                requires_tools: false,
                tokensUsed: llmResponse.usage?.total_tokens,
                // Telemetry (P1.3)
                telemetry: {
                    coherence: guardrails,
                    fallback_type: fallbackType,
                    loop_guard_triggered: guardrails.loop_guard_triggered
                }
            }
        };
    }

    /**
     * Executes all runtime cognitive checks
     */
    private static async executeGuardrails(input: string, output: string, intent: string, context: AgentContext) {
        const domainScore = this.calculateDomainCoherence(output, intent);
        const temporalScore = this.calculateTemporalAlignment(input, output);
        const loopTriggered = this.detectLoop(output, context.recentMessages);

        // Verdict Logic
        let verdict: 'PASS' | 'SOFT_FAIL' | 'HARD_FAIL' = 'PASS';
        if (domainScore < 0.45 || (temporalScore < 0.40 && temporalScore !== -1)) {
            verdict = 'HARD_FAIL';
        } else if (domainScore < 0.60 || (temporalScore < 0.55 && temporalScore !== -1)) {
            verdict = 'SOFT_FAIL';
        }

        return {
            domain_score: domainScore,
            temporal_score: temporalScore,
            loop_guard_triggered: loopTriggered,
            verdict
        };
    }

    /**
     * Heuristic Domain Coherence (coherence_ruleset_v1)
     */
    private static calculateDomainCoherence(text: string, intent: string): number {
        const lower = text.toLowerCase();
        const keywords: Record<string, string[]> = {
            'FINANCE': ['saldo', 'extrato', 'fluxo', 'caixa', 'pagamento', 'conta', 'receita', 'despesa', 'valor', 'r$'],
            'SECRETARY': ['agenda', 'compromisso', 'reunião', 'calendário', 'horário', 'marcar', 'agendar', 'confirmar'],
            'SUPPORT': ['ajuda', 'erro', 'acesso', 'senha', 'problema', 'suporte', 'configurar'],
            'SALES': ['preço', 'plano', 'valor', 'assinatura', 'comprar', 'contratar', 'demonstração'],
            'PRODUCTIVITY': ['tarefa', 'prioridade', 'organizar', 'email', 'checklist', 'documento', 'planilha']
        };

        const targetKeywords = keywords[intent] || [];
        if (targetKeywords.length === 0) return 1.0; // Intent without rules passes by default

        const matches = targetKeywords.filter(kw => lower.includes(kw));
        return matches.length / Math.min(targetKeywords.length, 3); // Normalized score (max 3 hits)
    }

    /**
     * Temporal Alignment Check
     */
    private static calculateTemporalAlignment(input: string, output: string): number {
        const markers = ['hoje', 'amanhã', 'amanha', 'semana', 'mês', 'mes', 'prazo', 'urgente'];
        const inputMarkers = markers.filter(m => input.toLowerCase().includes(m));

        if (inputMarkers.length === 0) return -1; // No temporal context requested

        const outputMarkers = markers.filter(m => output.toLowerCase().includes(m));
        const matched = inputMarkers.filter(m => outputMarkers.includes(m));

        return matched.length / inputMarkers.length;
    }

    /**
     * Anti-Loop Jaccard Similarity (Simplified)
     */
    private static detectLoop(current: string, history: { content: string }[]): boolean {
        if (history.length === 0) return false;
        const lastAssistant = history[history.length - 1]?.content || '';
        if (!lastAssistant) return false;

        const currentWords = new Set(current.toLowerCase().split(/\s+/));
        const lastWords = new Set(lastAssistant.toLowerCase().split(/\s+/));

        const intersection = new Set([...currentWords].filter(x => lastWords.has(x)));
        const union = new Set([...currentWords, ...lastWords]);

        const similarity = intersection.size / union.size;
        return similarity > 0.70; // High similarity threshold
    }
}
