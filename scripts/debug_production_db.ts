import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Database Status...');

    const agentsCount = await prisma.agentNode.count();
    console.log(`- AgentNode count: ${agentsCount}`);

    const tenantsCount = await prisma.tenant.count();
    console.log(`- Tenant count: ${tenantsCount}`);

    const usersCount = await prisma.user.count();
    console.log(`- User count: ${usersCount}`);

    if (agentsCount > 0) {
        const agents = await prisma.agentNode.findMany({ select: { slug: true, name: true } });
        console.log('- Agents found:', agents);
    }

    console.log('✅ Diagnostic complete.');
}

main()
    .catch(e => console.error('❌ Diagnostic failed:', e))
    .finally(() => prisma.$disconnect());
