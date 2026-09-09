import { NextRequest, NextResponse } from 'next/server';
import { GlobalScheduler } from '@/lib/devos/v3/scheduler-service';
import { prisma } from '@/lib/db';

/**
 * GET /api/devos/scheduler
 * List scheduled jobs for the current tenant or run tick
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  const action = searchParams.get('action');

  if (action === 'tick') {
     try {
      await GlobalScheduler.getInstance().tick();
      return NextResponse.json({ status: 'success', detail: 'Ticker executed' });
    } catch (e: any) {
      return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
    }
  }

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  const jobs = await (prisma as any).devOsScheduledJob.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      queueEntries: {
        take: 5,
        orderBy: { scheduledAt: 'desc' }
      }
    }
  });

  return NextResponse.json(jobs);
}

/**
 * POST /api/devos/scheduler
 * Create a new job or trigger an existing one manually
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, jobId, tenantId, ...jobData } = body;

    if (!tenantId) throw new Error('tenantId is required');

    if (action === 'run' && jobId) {
      await GlobalScheduler.getInstance().manualTrigger(jobId, tenantId);
      return NextResponse.json({ status: 'queued', jobId });
    }

    if (action === 'create') {
      const newJob = await (prisma as any).devOsScheduledJob.create({
        data: {
          tenantId,
          name: jobData.name,
          intent: jobData.intent,
          cronExpression: jobData.cronExpression,
          environment: jobData.environment || 'dev',
          executionMode: jobData.executionMode || 'dry-run',
          enabled: true
        }
      });
      return NextResponse.json(newJob);
    }

    throw new Error('Invalid action');
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
