import { LLMService } from '../agents/llm-service';
import { PromptComposer } from '../core/composer';
import { DevOsContext, OrchestratorOutput } from './types';
import { DevOsAuditService } from './audit-service';

export const OrchestratorService = {
  async decide(ctx: DevOsContext, data: { sessionId: string, tasks: any[], objective: string }): Promise<OrchestratorOutput> {
    const startTime = Date.now();
    
    // Deterministic Layer (handled by Engine usually, but here as fallback)
    const pendingCritical = data.tasks.find(t => t.priority === 'CRITICAL' && t.status === 'PENDING');
    if (pendingCritical) {
      return {
        nextTaskId: pendingCritical.id,
        reason: 'Priority CRITICAL task detected (Deterministic)',
        suggestedSequence: [pendingCritical.id]
      };
    }

    // Cognitive Layer (LLM)
    const systemPrompt = PromptComposer.composePersona('orchestrator');
    const userPrompt = `
      Current Objective: ${data.objective}
      Current Tasks Status: ${JSON.stringify(data.tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })))}
      
      Decide which task to execute next based on technical dependencies and priority.
      
      Format:
      {
        "nextTaskId": string,
        "reason": string,
        "suggestedSequence": string[]
      }
    `;

    const response = await LLMService.call({
      prompt: userPrompt,
      system: systemPrompt,
      tenantId: ctx.tenantId,
      userId: ctx.userId
    });

    const output: OrchestratorOutput = JSON.parse(response.content);

    await DevOsAuditService.log({
      sessionId: ctx.sessionId,
      actor: 'orchestrator',
      action: 'decide_next_task',
      input: { taskCount: data.tasks.length },
      output,
      tokensUsed: response.usage.total_tokens,
      durationMs: Date.now() - startTime
    });

    return output;
  }
};
