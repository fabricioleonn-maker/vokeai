import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export class QueueManager {
  private static instance: QueueManager;
  private runnerId: string;

  private constructor() {
    this.runnerId = `runner-${uuidv4()}`;
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  /**
   * Finds jobs that are PENDING and ready to be processed.
   * Promotes them to READY if concurrency limits allow.
   */
  async processQueue(tenantId: string) {
    const config = await this.getTenantConfig(tenantId);
    
    // 1. Check current concurrency
    const activeCount = await (prisma as any).devOsExecutionQueue.count({
      where: {
        tenantId,
        status: 'RUNNING'
      }
    });

    if (activeCount >= config.maxConcurrentJobs) {
      return; // Cap reached
    }

    const availableSlots = config.maxConcurrentJobs - activeCount;

    // 2. Fetch PENDING/RETRY_WAIT jobs sorted by priority and availableAt
    const pendingJobs = await (prisma as any).devOsExecutionQueue.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'RETRY_WAIT'] },
        availableAt: { lte: new Date() }
      },
      orderBy: [
        { priority: 'desc' },
        { availableAt: 'asc' }
      ],
      take: availableSlots
    });

    // 3. Promote to READY if no module lock exists
    for (const job of pendingJobs) {
      await this.tryPromoteToReady(job.id);
    }
  }

  /**
   * Attempts to lock a job for execution.
   */
  async acquireJob(jobId: string) {
    const now = new Date();
    
    // Scoped lock: check if any other job in the same (tenant, module, environment) is RUNNING
    const job = await (prisma as any).devOsExecutionQueue.findUnique({ where: { id: jobId } });
    if (!job) return null;

    const lockedModule = await (prisma as any).devOsExecutionQueue.findFirst({
      where: {
        tenantId: job.tenantId,
        module: job.module,
        environment: job.environment,
        status: 'RUNNING',
        NOT: { id: jobId }
      }
    });

    if (lockedModule) {
      // Module is busy, mark as BLOCKED or just wait
      return null;
    }

    // Atomic update to mark as RUNNING and set lockOwner
    try {
      const updated = await (prisma as any).devOsExecutionQueue.update({
        where: { 
          id: jobId,
          status: 'READY', // Only acquire if it was ready
          lockedAt: null    // Ensure not already locked
        },
        data: {
          status: 'RUNNING',
          lockedAt: now,
          lockOwner: this.runnerId,
          startedAt: now,
          attemptedAt: now
        }
      });
      return updated;
    } catch (e) {
      return null; // Update failed (race condition)
    }
  }

  private async tryPromoteToReady(id: string) {
    try {
      await (prisma as any).devOsExecutionQueue.update({
        where: { id, status: { in: ['PENDING', 'RETRY_WAIT'] } },
        data: { status: 'READY' }
      });
    } catch (e) {
      // Already processed or changed status
    }
  }

  private async getTenantConfig(tenantId: string) {
    let config = await (prisma as any).devOsTenantConfig.findUnique({ where: { tenantId } });
    if (!config) {
      config = await (prisma as any).devOsTenantConfig.create({
        data: { tenantId, maxConcurrentJobs: 2 }
      });
    }
    return config;
  }

  async reportFailure(id: string, code: string, reason: string, isTransient: boolean) {
    const job = await (prisma as any).devOsExecutionQueue.findUnique({ where: { id } });
    if (!job) return;

    if (isTransient && job.attempts < job.maxAttempts) {
      const nextAvailable = new Date(Date.now() + Math.pow(2, job.attempts) * 60000); // Exponential backoff
      await (prisma as any).devOsExecutionQueue.update({
        where: { id },
        data: {
          status: 'RETRY_WAIT',
          attempts: { increment: 1 },
          availableAt: nextAvailable,
          failureCode: code,
          failureReason: reason,
          lockedAt: null,
          lockOwner: null
        }
      });
    } else {
      await (prisma as any).devOsExecutionQueue.update({
        where: { id },
        data: {
          status: 'FAILED',
          failureCode: code,
          failureReason: reason,
          completedAt: new Date(),
          lockedAt: null,
          lockOwner: null
        }
      });
    }
  }

  async reportSuccess(id: string, executionRunId?: string) {
    await (prisma as any).devOsExecutionQueue.update({
      where: { id },
      data: {
        status: 'SUCCEEDED',
        completedAt: new Date(),
        payload: { executionRunId }, // Link to run in payload for now
        lockedAt: null,
        lockOwner: null
      }
    });
  }
}
