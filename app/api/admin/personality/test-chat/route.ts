import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/agents/llm-service';

export async function POST(req: NextRequest) {
    try {
        const { message, config } = await req.json();

        // Construir o prompt dinamicamente baseado na config da tela (WIZARD MODE)
        // Isso ignora o que está salvo no banco para permitir teste rápido
        let systemPrompt = `Você é uma IA em fase de teste de personalidade.
    
    SUA PERSONALIDADE ATUAL:
    - Tom de Voz: ${config.voiceTone}
    - Estilo de Comunicação: ${config.communicationStyle}
    
    INSTRUÇÕES ESPECÍFICAS:
    ${config.personalityInstructions}
    
    CONTEXTO DO NEGÓCIO:
    ${config.businessContext}
    
    EXEMPLOS DO QUE FALAR:
    ${config.positiveExamples.filter((e: string) => e).map((e: string) => `- "${e}"`).join('\n')}
    
    EXEMPLOS DO QUE NÃO FALAR:
    ${config.negativeExamples.filter((e: string) => e).map((e: string) => `- "${e}"`).join('\n')}
    
    IMPORTANTE:
    - Responda apenas o que foi perguntado, mantendo a personalidade.
    - Se o usuário perguntar quem é você, use a saudação configurada se fizer sentido.
    `;

        // Usar o service existente mas com prompt injetado
        const response = await callLLM({
            systemPrompt,
            conversationHistory: [{ role: 'user', content: message }],
            agentConfig: {
                model: 'gpt-4o-mini', // ou gemini-flash
                temperature: 0.7,
                maxTokens: 500
            }
        });

        return NextResponse.json({ reply: response.content });

    } catch (error) {
        console.error('Test Chat Error:', error);
        return NextResponse.json({ reply: 'Erro ao processar teste. Verifique logs.' }, { status: 500 });
    }
}
