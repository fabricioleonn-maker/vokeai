import { prisma } from '../../db';
import { QueueManager } from './queue-manager';
import { GlobalScheduler } from './scheduler-service';

async function runLoadTest() {
  console.log('🚀 Starting DevOS Scheduler Load Test...');
  const tenantId = 'voke-test-load';

  try {
    // 1. Setup Tenant Config (Max 2 concurrent jobs)
    console.log('--- Setting up Tenant Config ---');
    await prisma.devOsTenantConfig.upsert({
      where: { tenantId },
      update: { maxConcurrentJobs: 2 },
      create: { tenantId, maxConcurrentJobs: 2 }
    });

    // 2. Create 3 Test Jobs
    console.log('--- Creating 3 Test Jobs ---');
    const jobs = [];
    for (let i = 1; i <= 3; i++) {
        const job = await prisma.devOsScheduledJob.create({
            data: {
                tenantId,
                name: `Load Test Job ${i}`,
                intent: `Simulated task ${i} for load testing`,
                cronExpression: '* * * * *',
                enabled: true,
                environment: 'dev',
                module: 'TEST_MODULE',
                executionMode: 'auto',
                scheduleType: 'cron'
            }
        });
        jobs.push(job);
    }

    // 3. Manually push 3 items to the queue for the SAME availableAt
    console.log('--- Queuing 3 items simultaneously ---');
    const now = new Date();
    await Promise.all(jobs.map(job => 
        prisma.devOsExecutionQueue.create({
            data: {
                tenantId,
                jobId: job.id,
                scheduledAt: now,
                availableAt: now,
                status: 'READY',
                environment: 'dev',
                module: 'TEST_MODULE',
                triggerSource: 'manual'
            }
        })
    ));

    // 4. Trigger Queue Processing
    console.log('--- Triggering Queue Processing ---');
    // We expect only 2 to start running due to concurrency limit
    await QueueManager.getInstance().processQueue(tenantId);

    // 5. Check Results
    console.log('--- Checking Results ---');
    const statusCount = await prisma.devOsExecutionQueue.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true }
    });

    console.log('Results:', statusCount);
    
    // 6. Cleanup (Optional, but good for idempotency)
    // await prisma.devOsExecutionQueue.deleteMany({ where: { tenantId } });
    // await prisma.devOsScheduledJob.deleteMany({ where: { tenantId } });

    console.log('✅ Load Test logic executed.');
  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    process.exit(0);
  }
}

runLoadTest();
