import { PromptAgent } from '../agents/prompt-agent';
import { ValidatorAgent } from '../agents/validator-agent';
import { ExecutionTracker } from '../agents/execution-tracker';
import { PostExecutionValidator } from '../agents/post-execution-validator';
import { prisma } from '@/lib/db';
import { QueueManager } from './queue-manager';
import { CostIntelligence } from './cost-intelligence';
import { BudgetManager } from './budget-manager';
import { BudgetGuard } from './budget-guard';
import { ReplanEngine } from './replan-engine';
import { GovernanceRulesEngine } from './governance-rules-engine';
import { ExecutionScoringEngine } from './execution-scoring-engine';
import { ExecutionFingerprint } from './execution-fingerprint';
import { ApprovalEngine } from '../approval/ApprovalEngine';
import { ExecutionGraphBuilder } from '../graph/ExecutionGraphBuilder';
import { ObservabilityEngine } from '../observability/ObservabilityEngine';
import { MultiAgentOrchestrator } from '../orchestration/MultiAgentOrchestrator';
import { BillingManager } from '../billing/BillingManager';

export class ExecutionDispatcher {
  private static instance: ExecutionDispatcher;
  private queueManager: QueueManager;

  private constructor() {
    this.queueManager = QueueManager.getInstance();
  }

  public static getInstance(): ExecutionDispatcher {
    if (!ExecutionDispatcher.instance) {
      ExecutionDispatcher.instance = new ExecutionDispatcher();
    }
    return ExecutionDispatcher.instance;
  }

  /**
   * Dispatches a queue item through the full governance and execution pipeline.
   */
  async dispatch(queueItemId: string) {
    const queueItem = await this.queueManager.acquireJob(queueItemId);
    const now = new Date();
    
    if (!queueItem) return;

    // 0. SaaS PLAN & CREDIT CHECK (Phase 18)
    const planCheck = await BillingManager.checkPlanLimits(queueItem.tenantId);
    if (!planCheck.allowed) {
      console.warn(`[ExecutionDispatcher] Plan limit blocked execution: ${planCheck.reason}`);
      await this.queueManager.reportFailure(queueItemId, 'PLAN_LIMIT_REACHED', planCheck.reason || 'Insufficient plan capacity');
      return;
    }

    // 1. Create JobRun
    const jobRun = await (prisma as any).devOsJobRun.create({
      data: {
        tenantId: queueItem.tenantId,
        jobId: queueItem.jobId,
        queueId: queueItem.id,
        status: 'RUNNING',
        startedAt: now,
        environment: queueItem.environment,
        executor: 'DevOs-Global-Dispatcher'
      }
    });

    let txRef: string | undefined;

    try {
      // 2. Initialize Visual Graph (Phase 15)
      const graphId = await ExecutionGraphBuilder.createGraph(queueItem.tenantId, queueItem.jobId, jobRun.id);
      await (prisma as any).devOsJobRun.update({
        where: { id: jobRun.id },
        data: { graphId }
      });

      // 3. Load Job Definition
      const jobDef = await (prisma as any).devOsScheduledJob.findUnique({
        where: { id: queueItem.jobId }
      });
      if (!jobDef) throw new Error('Scheduled job definition not found');

      // 4. INPUT Stage
      await ObservabilityEngine.onNodeStart(jobRun.id, 'INPUT', { payload: queueItem.payload });
      await ObservabilityEngine.onNodeEnd(jobRun.id, 'INPUT', 'DONE');

      // 5. GOVERNANCE Stage (Phase 13)
      await ObservabilityEngine.onNodeStart(jobRun.id, 'GOVERNANCE');
      const governance = await GovernanceRulesEngine.evaluate(
        queueItem.tenantId,
        queueItem.module,
        queueItem.priority
      );
      
      if (!governance.allowed) {
        await ObservabilityEngine.onNodeEnd(jobRun.id, 'GOVERNANCE', 'FAILED', { metadata: governance });
        await this.handleFailure(jobRun.id, queueItem.id, 'GOVERNANCE_BLOCKED', governance.reason || 'Safety/Governance Policy Blocked', false);
        return;
      }
      await ObservabilityEngine.onNodeEnd(jobRun.id, 'GOVERNANCE', 'DONE', { metadata: governance });

      // 6. BUDGET Stage (Phase 12)
      await ObservabilityEngine.onNodeStart(jobRun.id, 'BUDGET');
      const baseEstimate = CostIntelligence.estimate({
        model: 'gpt-4o',
        payload: queueItem.payload,
        jobType: jobDef.name,
        complexity: (queueItem.priority > 80 ? 'high' : 'medium') as any
      }).estimatedCostUsd;

      const budgetDecision = await BudgetGuard.protect(
        queueItem.tenantId,
        baseEstimate,
        queueItem.priority,
        jobRun.id,
        jobDef.id
      );

      if (budgetDecision.action === 'BLOCK_OVER_BUDGET') {
        await ObservabilityEngine.onNodeEnd(jobRun.id, 'BUDGET', 'FAILED', { metadata: budgetDecision });
        await this.handleFailure(jobRun.id, queueItem.id, 'BUDGET_EXCEEDED', budgetDecision.reason, false);
        return;
      }
      await ObservabilityEngine.onNodeEnd(jobRun.id, 'BUDGET', 'DONE', { cost: baseEstimate, metadata: budgetDecision });

      // 7. SCORING Stage (Phase 10)
      await ObservabilityEngine.onNodeStart(jobRun.id, 'SCORING');
      const fingerprint = ExecutionFingerprint.generate({
        tenantId: queueItem.tenantId,
        module: queueItem.module,
        environment: queueItem.environment,
        jobType: jobDef.name,
        action: 'EXECUTE',
        payloadSizeTier: ExecutionFingerprint.calculatePayloadTier(queueItem.payload)
      });

      const scoreResult = await ExecutionScoringEngine.evaluate({
        tenantId: queueItem.tenantId,
        windowContext: {
          tenantId: queueItem.tenantId,
          module: queueItem.module,
          priority: queueItem.priority,
          environment: queueItem.environment
        },
        routingContext: {
          fingerprint,
          module: queueItem.module,
          jobType: jobDef.name,
          complexity: (queueItem.priority > 80 ? 'high' : 'medium') as any,
          routingMode: 'balanced', // or 'cost_first' | 'performance_first'
          attempts: queueItem.attempts || 0
        } as any,
        costContext: {
          model: 'gpt-4o',
          payload: queueItem.payload,
          jobType: jobDef.name,
          complexity: (queueItem.priority > 80 ? 'high' : 'medium') as any
        },
        retryWasteCost: CostIntelligence.calculateRetryWaste(baseEstimate, queueItem.attempts || 0),
        maxAllowedCost: 1.0
      } as any);

      await (prisma as any).devOsJobRun.update({
        where: { id: jobRun.id },
        data: {
          executionDecisionScore: scoreResult.finalScore,
          scoreBreakdownJson: scoreResult.breakdown,
          optimizationSource: scoreResult.optimizationSource,
          selectedModel: scoreResult.selectedModel,
          executionFingerprint: fingerprint
        }
      });
      await ObservabilityEngine.onNodeEnd(jobRun.id, 'SCORING', 'DONE', { metadata: scoreResult });

      // 8. APPROVAL Stage (Phase 14)
      await ObservabilityEngine.onNodeStart(jobRun.id, 'APPROVAL');
      const approvalDecision = await ApprovalEngine.evaluate({
        tenantId: queueItem.tenantId,
        module: queueItem.module,
        environment: queueItem.environment,
        estimatedCost: scoreResult.estimatedCostUsd,
        riskScore: Math.abs((scoreResult.breakdown.riskPenalty || 0) * 100),
        confidence: scoreResult.breakdown.successProbability,
        attempts: queueItem.attempts || 0,
        isDestructive: (queueItem.payload as any)?.isDestructive || false
      });

      if (approvalDecision.decision === 'REQUIRE_APPROVAL') {
        await ObservabilityEngine.onNodeEnd(jobRun.id, 'APPROVAL', 'PENDING', { metadata: approvalDecision });
        await (prisma as any).devOsJobRun.update({
          where: { id: jobRun.id },
          data: { status: 'AWAITING_APPROVAL' }
        });
        await (prisma as any).devOsExecutionQueue.update({
          where: { id: queueItem.id },
          data: { status: 'AWAITING_APPROVAL' }
        });
        return;
      }

      if (approvalDecision.decision === 'BLOCK') {
        await ObservabilityEngine.onNodeEnd(jobRun.id, 'APPROVAL', 'FAILED', { metadata: approvalDecision });
        await this.handleFailure(jobRun.id, queueItem.id, 'APPROVAL_REJECTED', approvalDecision.reasons.join(', '), false);
        return;
      }
      await ObservabilityEngine.onNodeEnd(jobRun.id, 'APPROVAL', 'DONE', { metadata: approvalDecision });

      // 9. ORCHESTRATION Stage (Phase 17)
      await ObservabilityEngine.onNodeStart(jobRun.id, 'ORCHESTRATOR');
      const orchestration = await MultiAgentOrchestrator.plan(
        queueItem.tenantId,
        queueItem.jobId,
        jobDef.objective || 'General Action',
        { payload: queueItem.payload, priority: queueItem.priority }
      );

      await ObservabilityEngine.onNodeEnd(jobRun.id, 'ORCHESTRATOR', 'DONE', { metadata: orchestration });

      // 9.5 RESERVE CREDITS (Phase 18)
      txRef = await BillingManager.reserveCredits(
        queueItem.tenantId, 
        queueItem.jobId, 
        scoreResult.estimatedCostUsd
      );

      // 10. AGENT EXECUTION Phase
      let lastResult: any = { payload: queueItem.payload };
      let cumulativeCost = scoreResult.estimatedCostUsd;
      
      for (const agentKey of orchestration.selectedAgents) {
        const agentNodeId = `agent-${agentKey}-${Date.now()}`;
        
        // Add Dynamic Node to Graph
        await ExecutionGraphBuilder.addNode(jobRun.id, {
          id: agentNodeId,
          type: 'AGENT',
          label: `Agent: ${agentKey}`,
          metadata: { agentKey }
        });

        // Add Edge from Orchestrator or last Agent
        const fromNode = orchestration.selectedAgents.indexOf(agentKey) === 0 ? 'node-orchestra' : `agent-${orchestration.selectedAgents[orchestration.selectedAgents.indexOf(agentKey) - 1]}`;
        await ExecutionGraphBuilder.addEdge(jobRun.id, fromNode, agentNodeId);

        await ObservabilityEngine.onNodeStart(jobRun.id, 'AGENT', { agentKey }, agentNodeId);
        
        const startTime = Date.now();
        try {
          const agentResult = await ExecutionTracker.run({
            tenantId: queueItem.tenantId,
            userId: 'system',
            projectId: jobDef.projectId || undefined,
            promptPayload: {
              ...lastResult,
              agent_directive: `Focus on ${agentKey} role.`,
            } as any,
            execution_mode: 'full',
            environment: queueItem.environment as any,
          } as any);

          const duration = Date.now() - startTime;
          const agentCost = 0.05; // Mock agent cost
          cumulativeCost += agentCost;

          await (prisma as any).devOsAgentExecutionLog.create({
            data: {
              tenantId: queueItem.tenantId,
              jobId: queueItem.jobId,
              runId: jobRun.id,
              agentKey,
              status: 'SUCCESS',
              cost: agentCost,
              durationMs: duration,
              outputSummary: JSON.stringify(agentResult).substring(0, 500)
            }
          });

          lastResult = agentResult;
          await ObservabilityEngine.onNodeEnd(jobRun.id, 'AGENT', 'DONE', { cost: agentCost, durationMs: duration }, agentNodeId);
        } catch (agentErr: any) {
          await ObservabilityEngine.onNodeEnd(jobRun.id, 'AGENT', 'FAILED', { metadata: { error: agentErr.message } }, agentNodeId);
          throw agentErr;
        }
      }

      // Add Final Edge to Commit
      const lastAgentNodeId = orchestration.selectedAgents.length > 0 
        ? `agent-${orchestration.selectedAgents[orchestration.selectedAgents.length - 1]}` 
        : 'node-orchestra';
      await ExecutionGraphBuilder.addEdge(jobRun.id, lastAgentNodeId, 'node-commit');

      // 11. COMMIT Stage
      await ObservabilityEngine.onNodeStart(jobRun.id, 'COMMIT');
      const finishedAt = new Date();
      const finalDuration = finishedAt.getTime() - now.getTime();
      
      await (prisma as any).devOsJobRun.update({
        where: { id: jobRun.id },
        data: {
          status: 'SUCCESS',
          completedAt: finishedAt,
          durationMs: finalDuration,
          actualCost: cumulativeCost,
          actualDurationMs: finalDuration
        }
      });
      
      await ObservabilityEngine.onNodeEnd(jobRun.id, 'COMMIT', 'DONE');
      await ObservabilityEngine.recordFinalMetrics(jobRun.id, cumulativeCost, finalDuration);
      
      if (txRef) {
        await BillingManager.finalizeConsumption(queueItem.tenantId, txRef, cumulativeCost);
      }

      await this.queueManager.reportSuccess(queueItem.id, lastResult.executionId || 'ext-' + Date.now());

    } catch (error: any) {
      console.error('[ExecutionDispatcher] Pipeline strategy failure:', error);
      
      if (txRef) {
        console.log(`[ExecutionDispatcher] Releasing credits for transaction: ${txRef}`);
        await BillingManager.releaseCredits(queueItem.tenantId, txRef).catch(e => console.error('Failed to release credits:', e));
      }

      await ObservabilityEngine.onNodeEnd(jobRun.id, 'EXECUTION', 'FAILED', { metadata: { error: error.message } });
      await this.handleFailure(jobRun.id, queueItem.id, error.code || 'UNKNOWN_ERROR', error.message || 'Unknown execution error', true);
    }
  }

  private async handleFailure(runId: string, queueId: string, code: string, reason: string, isTransient: boolean) {
    const finishedAt = new Date();
    await (prisma as any).devOsJobRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        completedAt: finishedAt,
        logs: { error: code, reason }
      }
    });

    await this.queueManager.reportFailure(queueId, code, reason, isTransient);
  }

  /**
   * Resumes execution after manual approval.
   */
  public static async resumeExecution(runId: string, approvedBy: string) {
    const jobRun = await (prisma as any).devOsJobRun.findUnique({
      where: { id: runId }
    });
    if (!jobRun) throw new Error('Job run not found');

    await (prisma as any).devOsJobRun.update({
      where: { id: runId },
      data: { 
        status: 'RUNNING', 
        startedAt: new Date(),
        logs: { state: 'RESUMED_AFTER_APPROVAL', approvedBy }
      }
    });

    await (prisma as any).devOsExecutionQueue.update({
      where: { id: jobRun.queueId },
      data: { status: 'READY' }
    });

    const dispatcher = ExecutionDispatcher.getInstance();
    await dispatcher.dispatch(jobRun.queueId);
  }
}
