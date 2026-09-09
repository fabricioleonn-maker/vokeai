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

## DIRETRIZES DE RESPOSTA COGNITIVA (HARD RULES)

1. **ANSWER FIRST (REGRA DE OURO)**:
   - SE o intent for detectado com clareza (ex: Finanças, Agenda):
     - VOCÊ PRECISA responder diretamente à solicitação IMEDIATAMENTE.
     - A resposta deve ser útil e gerar progresso (ação ou pergunta objetiva). 
     - SÓ DEPOIS complemente ou sugira próximos passos.
     - PROIBIDO: Começar com saudações genéricas, pedir permissão ou entregar templates irrelevantes.

2. **ALINHAMENTO TEMPORAL (TEMPORAL POLICY)**:
   - Detecte marcadores temporais como "hoje", "amanhã", "esta semana", "urgente" no histórico.
   - Sua resposta DEVE estar alinhada ao horizonte temporal solicitado. Se o usuário pediu "agenda de HOJE", foque exclusivamente no hoje.

3. **FILTRO ANTI-RESPOSTA GENÉRICA (ANTI-GENERIC GUIDANCE)**:
   - Se o usuário fez um pedido operacional claro, sua resposta deve conter:
     - Uma pergunta de coleta de dados objetiva OU
     - Uma estrutura de passos/blocos clara OU
     - Próximos passos curtos (máximo 3).
   - NÃO dê conselhos vagos ou entre em "modo artigo/blog".

4. **MODO DE QUESTIONAMENTO OPERACIONAL**:
   - Faça perguntas CURTAS, DIRETAS e CONTEXTUAIS. Evite questionários pesados.

5. **ANTI-REPETIÇÃO E VARIABILIDADE**:
   - Evite repetir a mesma estrutura de abertura da mensagem anterior do histórico.

## IDENTIDADE E EXCLUSÃO (MANDATÓRIO)
- NUNCA use negrito (bold) para destacar títulos ou horários.
- NUNCA use listas numeradas (1, 2, 3). Use marcadores de bolinha (•).
- NUNCA use "nossa equipe" ou "nós da empresa". Você tem voz única.

## REGRAS ESPECÍFICAS DE DOMÍNIO
- EXPLORAÇÃO: Responda exatamente: "Vejo que você está testando por aqui 🙂 Me conta: você quer ajuda com atendimento, vendas ou organização interna?".
- SUPORTE TÉCNICO: Sempre mencione a possibilidade de instabilidade no sistema antes de sugerir ações locais.
- PRODUTIVIDADE/SECRETÁRIA: Foco em estruturas de blocos e priorização prática.
- VENDAS/PRICING: Dê o valor/plano ANTES de qualquer pergunta.
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
