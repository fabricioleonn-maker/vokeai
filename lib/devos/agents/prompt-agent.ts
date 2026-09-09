import { callLLM } from '../../agents/llm-service';
import { prisma } from '../../db';
import {
  PromptAgentInput,
  PromptAgentOutput,
  StructuredPrompt,
  RiskLevel,
} from './prompt-agent.types';

// ========================
// PromptAgent v1.1
// Security-First Intent Expansion Engine
// Consumes free-form user intent → emits structured technical prompt
// ========================

const PROMPT_AGENT_SYSTEM = `
Você é o PromptAgent v1.2, um orquestrador arquitetural de IA especializado no Synkra/DevOS Engineering OS.

## MISSÃO
Sua missão é transformar intenções de usuários em linguagem natural em prompts técnicos estruturados e rigorosos OU detectar vagueza e solicitar esclarecimentos.

## PROTOCOLO DE ESCLARECIMENTO
Se a INTENÇÃO_DO_USUÁRIO for vaga, ambígua ou carecer de direção técnica (ex: "teste", "ajuda", "fazer algo"), você NÃO deve gerar um plano. Em vez disso, retorne um JSON de solicitação de esclarecimento. Todas as perguntas devem ser em Português (Brasil).

### Formato JSON de Esclarecimento:
{
  "status": "clarification_needed",
  "clarification_questions": ["pergunta em português", ...],
  "vagueness_score": 0.0 a 1.0 (1.0 = ruído total)
}

## FORMATO JSON DE SUCESSO
Se a intenção for clara, retorne um JSON de prompt técnico estruturado. **Todos os valores de texto devem ser em Português (Brasil)**:
{
  "status": "success",
  "objective": "objetivo técnico detalhado",
  "scope": "escopo da operação",
  "execution_rules": ["regra 1", ...],
  "constraints": ["restrição 1", ...],
  "success_criteria": ["critério 1", ...],
  "non_goals": ["o que não fazer", ...],
  "execution_plan": ["passo 1", ...],
  "estimated_impact": "low" | "medium" | "high",
  "requires_human_review_reason": "razão da revisão humana",
  "risk_level": "low" | "medium" | "high",
  "suggested_agents": ["agent_id", ...]
}

## REGISTRO DE AGENTES (para suggested_agents)
- devos-coder: mudanças de arquivo, refatoração
- devos-db-admin: migrações, esquema, queries
- devos-security-audit: varredura de vulnerabilidades, revisão de políticas
- devos-tester: testes unitários, E2E, integração
`;

/**
 * Builds the user-facing prompt for the LLM
 */
function buildUserPrompt(input: PromptAgentInput): string {
  return `
INTENÇÃO ORIGINAL DO USUÁRIO: "${input.intent}"

CONTEXTO DO PROJETO:
- Projeto: ${input.context.project}
- Módulo: ${input.context.module}  
- Ambiente: ${input.context.environment}
- Tenant: ${input.tenantId}

Transforme esta intenção em um prompt técnico estruturado seguindo o formato JSON obrigatório.
Aplique todas as regras de segurança, classifique o nível de risco e expanda intenções vagas com segurança.
Responda obrigatoriamente em Português (Brasil).
`.trim();
}

/**
 * Validates the LLM output for security compliance
 */
function applySecurityGuardrails(prompt: StructuredPrompt): StructuredPrompt {
  const FORBIDDEN_TOKENS = ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE TABLE', 'FORCE-RESET-DB', 'DELETE FROM'];

  // Scan all string fields for destructive patterns
  const allText = JSON.stringify(prompt).toUpperCase();
  if (FORBIDDEN_TOKENS.some(t => allText.includes(t.toUpperCase()))) {
    throw new Error('[PromptAgent] Violação de segurança: operação proibida detectada no prompt gerado.');
  }

  // Enforce base constraints are always present
  const baseConstraints = [
    'A execução é estritamente limitada ao projeto e módulo especificados.',
    'Nenhuma operação destrutiva de banco de dados (DROP, TRUNCATE, RESET) é permitida.',
    'Nenhuma modificação nos dados de produção existentes.',
    'Todas as alterações exigem revisão e aprovação explícita antes da execução.',
    'O isolamento de Tenant deve ser mantido em todas as operações.',
  ];

  prompt.constraints = [
    ...baseConstraints,
    ...prompt.constraints.filter(c => !baseConstraints.some(b => c.includes(b.slice(0, 20))))
  ];

  // Prod environment always escalates risk
  return prompt;
}

// ========================
// Main PromptAgent Service
// ========================
export const PromptAgent = {
  version: 'v1.1' as const,

  async process(input: PromptAgentInput): Promise<PromptAgentOutput> {
    const startTime = Date.now();

    let generatedPrompt: StructuredPrompt;
    let riskLevel: RiskLevel = 'medium';

    const systemPrompt = PROMPT_AGENT_SYSTEM;
    const userPrompt = buildUserPrompt(input);

    try {
      // 1. Call LLM with the specialized PromptAgent system prompt
      const llmResponse = await callLLM({
        systemPrompt,
        conversationHistory: [{ role: 'user', content: userPrompt }],
        agentConfig: {
          model: 'gpt-4o-mini',          // Efficient: PromptAgent doesn't need deep reasoning
          temperature: 0.1,              // Strict: deterministic output
          maxTokens: 1500,
        }
      });

      // 2. Parse LLM JSON response with high resilience
      const rawContent = llmResponse.content.trim();
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      const rawJson = jsonMatch ? jsonMatch[0] : rawContent;

      let parsed: any;
      try {
        parsed = JSON.parse(rawJson);
      } catch (parseErr) {
        console.error('[PromptAgent] JSON Parse failed. Content snippet:', rawJson.substring(0, 100));
        throw new Error('Failed to parse structured response from AI model.');
      }

      if (parsed.status === 'clarification_needed') {
        return {
          agent: 'PromptAgent',
          version: 'v1.2',
          status: 'clarification_needed',
          prompt: {
            objective: '',
            scope: '',
            execution_rules: [],
            constraints: [],
            success_criteria: [],
            non_goals: [],
            execution_plan: [],
            estimated_impact: 'low',
            requires_human_review_reason: '',
          },
          risk_level: 'low',
          requires_approval: false,
          clarification_questions: parsed.clarification_questions || [],
          metadata: {
            tenantId: input.tenantId,
            userId: input.userId,
            originalIntent: input.intent,
            project: input.context.project,
            module: input.context.module,
            environment: input.context.environment,
            timestamp: new Date().toISOString(),
            processingMs: Date.now() - startTime,
            vaguenessScore: parsed.vagueness_score,
          },
        };
      }

      generatedPrompt = {
        objective: parsed.objective,
        scope: parsed.scope,
        execution_rules: parsed.execution_rules || [],
        constraints: parsed.constraints || [],
        success_criteria: parsed.success_criteria || [],
        non_goals: parsed.non_goals || [],
        execution_plan: parsed.execution_plan || [],
        estimated_impact: parsed.estimated_impact || 'medium',
        requires_human_review_reason: parsed.requires_human_review_reason || 'Operation requires explicit human approval before execution.',
      };

      riskLevel = parsed.risk_level || 'medium';

      // 3. Apply security guardrails on generated prompt
      generatedPrompt = applySecurityGuardrails(generatedPrompt);

      // 4. Escalate risk for production environment
      if (input.context.environment === 'prod' && riskLevel !== 'high') {
        riskLevel = 'high';
      }

      const processingMs = Date.now() - startTime;

      // 5. Persist the generation log
      await logPromptGeneration({
        tenantId: input.tenantId,
        userId: input.userId,
        originalIntent: input.intent,
        project: input.context.project,
        module: input.context.module,
        environment: input.context.environment,
        generatedPrompt,
        riskLevel,
        processingMs,
      }).catch(e => console.error('[PromptAgent] Log persist failed:', e));

      const output: PromptAgentOutput = {
        agent: 'PromptAgent',
        version: 'v1.2',
        status: 'success',
        prompt: generatedPrompt,
        risk_level: riskLevel,
        requires_approval: true,
        metadata: {
          tenantId: input.tenantId,
          userId: input.userId,
          originalIntent: input.intent,
          project: input.context.project,
          module: input.context.module,
          environment: input.context.environment,
          timestamp: new Date().toISOString(),
          processingMs,
        },
      };

      console.log('[PromptAgent] Final Output constructed with prompt keys:', Object.keys(output.prompt || {}));
      
      if (!output.prompt) {
        console.error('[PromptAgent] CRITICAL: prompt object is MISSING before return');
        throw new Error('Internal state error: prompt payload lost during generation.');
      }

      return output;

    } catch (err: any) {
      const processingMs = Date.now() - startTime;

      // Log failure
      await logPromptGeneration({
        tenantId: input.tenantId,
        userId: input.userId,
        originalIntent: input.intent,
        project: input.context.project,
        module: input.context.module,
        environment: input.context.environment,
        error: err.message,
        processingMs,
      }).catch(() => {});  // Silent on log failure to avoid masking original error

      return {
        agent: 'PromptAgent',
        version: 'v1.2',
        status: 'error',
        prompt: {
          objective: '',
          scope: '',
          execution_rules: [],
          constraints: [],
          success_criteria: [],
          non_goals: [],
          execution_plan: [],
          estimated_impact: 'high',
          requires_human_review_reason: 'Processing failed — manual review required before any execution.',
        },
        risk_level: 'high',
        requires_approval: true,
        error: `[PromptAgent] Processing failed: ${err.message}`,
        metadata: {
          tenantId: input.tenantId,
          userId: input.userId,
          originalIntent: input.intent,
          project: input.context.project,
          module: input.context.module,
          environment: input.context.environment,
          timestamp: new Date().toISOString(),
          processingMs,
        },
      };
    }
  }
};

// ========================
// Persistence Layer
// Stored in AIUsageLog (existing model, no migration needed)
// ========================
async function logPromptGeneration(data: {
  tenantId: string;
  userId: string;
  originalIntent: string;
  project: string;
  module: string;
  environment: string;
  generatedPrompt?: StructuredPrompt;
  riskLevel?: RiskLevel;
  error?: string;
  processingMs: number;
}) {
  try {
    // Add a race condition to prevent Prisma lock from stalling the whole agent
    const logPromise = prisma.aIUsageLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        model: 'gpt-4o-mini',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        purpose: 'prompt_agent_v1',
        metadata: {
          originalIntent: data.originalIntent,
          project: data.project,
          module: data.module,
          environment: data.environment,
          riskLevel: data.riskLevel ?? null,
          generatedPrompt: data.generatedPrompt ?? null,
          error: data.error ?? null,
          processingMs: data.processingMs,
        } as any,
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Prisma log timeout')), 2000)
    );

    await Promise.race([logPromise, timeoutPromise]);
  } catch (e) {
    console.error('[PromptAgent] Audit log skipped or failed (likely DB lock):', e);
  }
}
