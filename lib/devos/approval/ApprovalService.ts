import { prisma } from '@/lib/db';
import { ExecutionDispatcher } from '../v3/execution-dispatcher';
import { DevOsApprovalStatus } from '@prisma/client';

export class ApprovalService {
  /**
   * Grants approval for a pending job and triggers the dispatcher resumption.
   */
  public static async approve(requestId: string, approvedBy: string, reason?: string): Promise<void> {
    const request = await (prisma as any).devOsApprovalRequest.findUnique({
      where: { id: requestId }
    });

    if (!request || request.status !== 'PENDING') {
      throw new Error('Approval request not found or not in PENDING status');
    }

    // 1. Update request status
    await (prisma as any).devOsApprovalRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date()
      }
    });

    // 2. Log decision
    await (prisma as any).devOsApprovalLog.create({
      data: {
        requestId,
        actor: approvedBy,
        action: 'APPROVE',
        reason: reason || 'Approved via Command Center'
      }
    });

    // 3. Trigger Dispatcher resumption
    if (request.runId) {
      await ExecutionDispatcher.resumeExecution(request.runId, approvedBy);
    }
  }

  /**
   * Rejects a pending job, preventing its execution.
   */
  public static async reject(requestId: string, rejectedBy: string, reason: string): Promise<void> {
    const request = await (prisma as any).devOsApprovalRequest.findUnique({
      where: { id: requestId }
    });

    if (!request || request.status !== 'PENDING') {
      throw new Error('Approval request not found or not in PENDING status');
    }

    // 1. Update request status
    await (prisma as any).devOsApprovalRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedReason: reason
      }
    });

    // 2. Log decision
    await (prisma as any).devOsApprovalLog.create({
      data: {
        requestId,
        actor: rejectedBy,
        action: 'REJECT',
        reason
      }
    });

    // 3. Mark JobRun & Queue as FAILED/REJECTED
    if (request.runId) {
      await (prisma as any).devOsJobRun.update({
        where: { id: request.runId },
        data: {
          status: 'FAILED',
          logs: { rejectionReason: reason, rejectedBy }
        }
      });

      // Find queue item to clear it
      const queueItem = await (prisma as any).devOsExecutionQueue.findFirst({
        where: { runId: request.runId }
      });

      if (queueItem) {
        await (prisma as any).devOsExecutionQueue.update({
          where: { id: queueItem.id },
          data: { status: 'FAILED', failureCode: 'APPROVAL_REJECTED' }
        });
      }
    }
  }

  /**
   * Lists all pending approval requests for a tenant or globally.
   */
  public static async listPending(tenantId?: string) {
    return (prisma as any).devOsApprovalRequest.findMany({
      where: {
        status: 'PENDING',
        ...(tenantId ? { tenantId } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
