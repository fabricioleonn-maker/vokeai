import { callLLM, DEVOS_PROMPTS } from '../agents/llm-service';
import { DevOsContext, PlannerOutput } from './types';
import { DevOsAuditService } from './audit-service';

export const PlannerService = {
  async plan(ctx: DevOsContext, objective: string): Promise<PlannerOutput> {
    const startTime = Date.now();
    
    const systemPrompt = DEVOS_PROMPTS.planner;
    
    const contextStr = ctx.projectContext ? `
      Business Goal: ${ctx.projectContext.businessGoal}
      Constraints: ${ctx.projectContext.constraints?.join(', ')}
      Tech Stack: ${ctx.projectContext.techStack?.join(', ')}
      Expected Outcome: ${ctx.projectContext.expectedOutcome}
      Strategy: ${ctx.strategy ?? 'safe'}
    ` : '';

    const userPrompt = `
      Objective: ${objective}
      ${contextStr}
      
      Tasks:
      1. Analyze the objective within the provided context.
      2. Breakdown the objective into technical tasks.
      3. For each task, define: title, description, priority (LOW, MEDIUM, HIGH, CRITICAL), intent, and dependencies.
      4. Estimate risks based on the constraints.

      Format your response as a JSON object:
      {
        "sessionTitle": string,
        "breakdown": [{ "title": string, "description": string, "priority": string, "intent": string, "dependsOn": number[] }],
        "analysis": string,
        "risks": string[]
      }
    `;

    const response = await callLLM({
      systemPrompt,
      conversationHistory: [
        { role: 'user', content: userPrompt }
      ],
      agentConfig: {
        model: ctx.strategy === 'deep' ? 'gpt-4o' : 'gpt-4o-mini',
        temperature: 0.1
      }
    });

    const output: PlannerOutput = JSON.parse(response.content);

    await DevOsAuditService.log({
      sessionId: ctx.sessionId,
      actor: 'planner',
      action: 'generate_plan',
      input: { objective, context: contextStr },
      output,
      tokensUsed: response.usage?.total_tokens ?? 0,
      durationMs: Date.now() - startTime
    });

    return output;
  }
};
