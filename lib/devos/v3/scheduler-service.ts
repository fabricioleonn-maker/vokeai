import { prisma } from '@/lib/db';
import { QueueManager } from './queue-manager';
import { ExecutionDispatcher } from './execution-dispatcher';
import dayjs from 'dayjs';

export class GlobalScheduler {
  private static instance: GlobalScheduler;

  private constructor() {}

  public static getInstance(): GlobalScheduler {
    if (!GlobalScheduler.instance) {
      GlobalScheduler.instance = new GlobalScheduler();
    }
    return GlobalScheduler.instance;
  }

  /**
   * Periodic ticker that populates the execution queue.
   * Should be called by a cron job or a long-running interval (e.g. every 1 min).
   */
  async tick() {
    const now = new Date();
    
    // 1. Fetch active jobs that are due
    const activeJobs = await (prisma as any).devOsScheduledJob.findMany({
      where: {
        enabled: true,
        OR: [
          { nextRunAt: { lte: now } },
          { nextRunAt: null }
        ]
      }
    });

    for (const job of activeJobs) {
      await this.queueJob(job.id, now);
    }

    // 2. Dispatch pending items for all tenants (Global Dispatcher)
    const uniqueTenants = await (prisma as any).devOsExecutionQueue.findMany({
      where: { status: { in: ['PENDING', 'READY', 'RETRY_WAIT'] } },
      select: { tenantId: true },
      distinct: ['tenantId']
    });

    for (const { tenantId } of uniqueTenants) {
      await QueueManager.getInstance().processQueue(tenantId);
      
      const readyJobs = await (prisma as any).devOsExecutionQueue.findMany({
        where: { tenantId, status: 'READY' }
      });

      for (const job of readyJobs) {
        // Dispatch asynchronously
        ExecutionDispatcher.getInstance().dispatch(job.id).catch(err => {
          console.error(`[GlobalScheduler] Error dispatching job ${job.id}:`, err);
        });
      }
    }
  }

  /**
   * Manually triggers a job into the queue.
   */
  async manualTrigger(jobId: string, tenantId: string) {
    const now = new Date();
    await this.queueJob(jobId, now, 'manual');
    await QueueManager.getInstance().processQueue(tenantId);
  }

  /**
   * Logic to insert a job into the queue with deduplication.
   */
  private async queueJob(jobId: string, scheduledDate: Date, source: 'schedule' | 'manual' = 'schedule') {
    const job = await (prisma as any).devOsScheduledJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    // Standardize the scheduled date to the current minute
    const scheduledAt = dayjs(scheduledDate).second(0).millisecond(0).toDate();

    try {
      await (prisma as any).devOsExecutionQueue.create({
        data: {
          tenantId: job.tenantId,
          jobId: job.id,
          status: 'PENDING',
          environment: job.environment,
          priority: source === 'manual' ? 10 : 5,
          triggerSource: source,
          scheduledAt,
          availableAt: scheduledDate,
          module: job.module || 'auto-scheduler'
        }
      });

      // Update nextRunAt based on cron expression
      const nextRun = this.calculateNextRun(job.cronExpression);
      await (prisma as any).devOsScheduledJob.update({
        where: { id: job.id },
        data: { 
          nextRunAt: nextRun,
          lastRunAt: new Date()
        }
      });

    } catch (e: any) {
      if (e.code === 'P2002') return;
      throw e;
    }
  }

  /**
   * Simplified Cron parser
   */
  private calculateNextRun(cron: string | null): Date {
    if (!cron) return dayjs().add(1, 'hour').toDate();
    const now = dayjs();
    
    if (cron === '* * * * *') return now.add(1, 'minute').toDate();
    if (cron === '*/5 * * * *') return now.add(5, 'minute').toDate();
    if (cron === '0 * * * *') return now.add(1, 'hour').startOf('hour').toDate();
    if (cron === '0 0 * * *') return now.add(1, 'day').startOf('day').toDate();

    return now.add(1, 'hour').toDate();
  }
}
