import { LLMService } from '../agents/llm-service';
import { PromptComposer } from '../core/composer';
import { DevOsContext, ExecutorOutput } from './types';
import { DevOsAuditService } from './audit-service';

export const ExecutorService = {
  async run(ctx: DevOsContext, data: { taskId: string, taskTitle: string, taskDescription: string, intent: string, sessionContext: string, mode: 'suggest' | 'apply' }): Promise<ExecutorOutput> {
    const startTime = Date.now();
    
    // Mode v1 is 'suggest' only
    const systemPrompt = PromptComposer.composePersona('executor');
    const userPrompt = `
      Context: ${data.sessionContext}
      Objective: ${data.taskTitle} - ${data.taskDescription}
      Intent: ${data.intent}
      Mode: ${data.mode}

      Tasks for Executor:
      1. Search and Read relevant files (read-only).
      2. Analyze existing patterns.
      3. Generate a complete suggestion of code/changes.
      
      Format:
      {
        "suggestion": string,
        "suggestedFiles": string[],
        "searchResults": any[],
        "confidence": number,
        "limitations": string[]
      }
    `;

    const response = await LLMService.call({
      prompt: userPrompt,
      system: systemPrompt,
      tenantId: ctx.tenantId,
      userId: ctx.userId
    });

    const output: ExecutorOutput = JSON.parse(response.content);

    await DevOsAuditService.log({
      sessionId: ctx.sessionId,
      taskId: data.taskId,
      actor: 'executor',
      action: 'execute_task',
      input: { mode: data.mode },
      output,
      tokensUsed: response.usage.total_tokens,
      durationMs: Date.now() - startTime
    });

    return output;
  }
};
