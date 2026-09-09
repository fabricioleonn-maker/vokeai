import { prisma } from '../../db';

async function checkPrismaProperties() {
  const props = Object.keys(prisma).filter(k => !k.startsWith('_') && typeof (prisma as any)[k] === 'object');
  console.log('devOsJobRun exists:', props.includes('devOsJobRun'));
  console.log('devOsScheduledJob exists:', props.includes('devOsScheduledJob'));
  console.log('devOsExecutionQueue exists:', props.includes('devOsExecutionQueue'));
  process.exit(0);
}

checkPrismaProperties();
