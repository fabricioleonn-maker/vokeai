
import { prisma } from '../lib/db';

async function debugSystem() {
    console.log('--- STARTING SYSTEM DEBUG ---');

    try {
        // 1. Check Agents
        const agents = await prisma.agentNode.findMany();
        console.log(`\n1. AGENTS FOUND: ${agents.length}`);
        if (agents.length === 0) {
            console.error('CRITICAL: No agents found in AgentNode table!');
        } else {
            agents.forEach(a => console.log(`   - [${a.slug}] ${a.name} (${a.status})`));
        }

        // 2. Check Tenants
        const tenants = await prisma.tenant.findMany({
            include: {
                agentConfigs: true,
                plan: true
            },
            take: 5
        });
        console.log(`\n2. TENANTS FOUND: ${tenants.length}`);

        for (const t of tenants) {
            console.log(`   Tenant: ${t.name} (${t.slug})`);
            console.log(`   Plan: ${t.plan?.name ?? 'None'}`);
            console.log(`   Status: ${t.status}`);
            console.log(`   AgentConfigs: ${t.agentConfigs.length}`);
            t.agentConfigs.forEach(ac => {
                console.log(`     -> ${ac.agentSlug}: ${ac.enabled ? 'ENABLED' : 'DISABLED'}`);
            });
        }

    } catch (error) {
        console.error('DEBUG ERROR:', error);
    } finally {
        await prisma.$disconnect();
        console.log('\n--- DEBUG COMPLETE ---');
    }
}

debugSystem();
