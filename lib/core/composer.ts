import type { AIPersonality } from '../types';

export class PromptComposer {
    private static MAX_PERSONALITY_CHARS = 1500;

    /**
     * Pedro Template (P0.2)
     * Surgical injection for first greeting contact
     */
    private static getPersonaTemplate(params: {
        agentSlug: string;
        intent: string;
        isFirstInteraction: boolean;
        personality: AIPersonality | null;
    }): string {
        const { agentSlug, intent, isFirstInteraction, personality } = params;
        const name = personality?.customName || 'Pedro';

        // P0.2: Pedro only appears on GREETING intent during FIRST interaction
        // And primarily for the support/opening agent
        const shouldInjectPedro =
            intent === 'GREETING' &&
            isFirstInteraction &&
            (agentSlug === 'agent.support.n1' || agentSlug === 'agent.opening' || !agentSlug);

        if (!shouldInjectPedro) {
            return `## SUA IDENTIDADE\n- Nome: ${name}\n`;
        }

        const now = new Date();
        const hour = now.getHours();
        let period = 'Bom dia';
        if (hour >= 12 && hour < 18) period = 'Boa tarde';
        else if (hour >= 18 || hour < 5) period = 'Boa noite';

        return `## SUA IDENTIDADE
- Nome: ${name}
- PAPEL: Você está no primeiro contato com o usuário.
- MENSAGEM DE ABERTURA (OBRIGATÓRIO): "${period}! Aqui é o ${name} 🙂 Me diz: você quer ajuda com atendimento, vendas ou organização interna?"\n\n`;
    }

    /**
     * Mandatory Do Not Rules (P0.3)
     */
    private static getDontRules(personality: AIPersonality | null): string {
        const customDonts = personality?.dont_rules || '';
        return `## REGRAS DE EXCLUSÃO (MANDATÓRIO)
- NUNCA use listas numeradas (1, 2, 3). Use texto corrido ou marcadores de bolinha (•).
- NUNCA peça dados pessoais (nome, cargo, empresa) na primeira mensagem.
- NUNCA use "nossa equipe" ou "nós da empresa" - você tem VOZ ÚNICA.
${customDonts ? `- ${customDonts}\n` : ''}\n`;
    }

    /**
     * Final Compose Logic
     */
    static compose(
        agentSlug: string,
        basePrompt: string,
        personality: AIPersonality | null,
        context: { intent: string; isFirstInteraction: boolean }
    ): string {
        const identity = this.getPersonaTemplate({
            agentSlug,
            intent: context.intent,
            isFirstInteraction: context.isFirstInteraction,
            personality
        });
        const dontRules = this.getDontRules(personality);

        // Enforce char limit on custom instructions
        const instructions = personality?.personalityInstructions?.slice(0, this.MAX_PERSONALITY_CHARS) || '';

        const prompt = `
## INSTRUÇÕES DO AGENTE (PRIORIDADE MÁXIMA)
${basePrompt}

${identity}

${dontRules}

## PERSONALIDADE DO CLIENTE
${instructions}
Tom: ${personality?.voiceTone || 'friendly'}
Estilo: ${personality?.communicationStyle || 'consultive'}

## DIRETRIZES DE RESPOSTA (ANSWER FIRST - REGRA DE OURO)
- NUNCA use negrito (bold) para destacar títulos, seções ou horários (ex: use "Manhã" em vez de "**Manhã:**").
- NUNCA comece com saudações genéricas como "Olá! Como posso ajudar?".
- NUNCA comece pedindo contexto, detalhes ou permissão para ajudar.
- EXPLORAÇÃO: Se a intenção for EXPLORATION (testes ou mensagens vagas), siga estas REGRAS: 1. Não presuma erro técnico; 2. Não presuma intenção específica; 3. Seja humano e direto; 4. Convide o usuário a seguir, sem pressão. Responda exatamente: "Vejo que você está testando por aqui 🙂 Me conta: você quer ajuda com atendimento, vendas ou organização interna?".
- SEMPRE entregue uma solução, análise, estrutura ou explicação inicial IMEDIATAMENTE.
- SUPORTE TÉCNICO: Sempre mencione a possibilidade de instabilidade no sistema antes de sugerir ações locais. Ex: "Pode ser tanto uma instabilidade pontual quanto algo local. No momento, eu não tenho indicação de uma falha geral aqui — então vamos checar as causas mais comuns do seu lado. Primeiro, tente...".
- PRODUTIVIDADE: Comece propondo uma estrutura de blocos ou priorização.
- VENDAS: Ao final, sugira um próximo passo guiado (ex: "Seu foco é atendimento ou vendas?") em vez de perguntas abertas.
- Demonstre inteligência fazendo inferências lógicas sobre o cenário do usuário.
- Dê a informação (preço, plano, conceito) ANTES de fazer qualquer pergunta de qualificação.
- Se o usuário perguntar algo amplo, explique como o conceito funciona e dê um exemplo prático antes de perguntar o caso dele.
- No máximo UMA pergunta curta e direta ao final da resposta.
`;

        return prompt;
    }

    /**
     * Post-processing Guardrails (P1.2)
     */
    static applyGuardrails(text: string): string {
        // Anti-Numbering Guardrail (Regex to find numbers followed by dot/parenthesis at start of line)
        // Replaces "1) Text" or "1. Text" with "• Text"
        let processed = text.replace(/(^|\n)\s*\d+[.)]\s+/g, '$1• ');

        // Remove double spaces/newlines if any
        processed = processed.replace(/\n{3,}/g, '\n\n');

        return processed.trim();
    }
}
