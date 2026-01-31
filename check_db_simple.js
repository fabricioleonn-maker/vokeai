
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const agents = await prisma.agentNode.findMany();
        console.log('--- AGENTS IN DB ---');
        console.log(`Count: ${agents.length}`);
        agents.forEach(a => {
            console.log(`[${a.slug}] ${a.name} (Status: ${a.status})`);
        });

        const tenants = await prisma.tenant.findMany({
            include: { agentConfigs: true }
        });
        console.log('\n--- TENANT CONFIGS ---');
        tenants.forEach(t => {
            console.log(`Tenant: ${t.slug} (${t.id})`);
            console.log(`Enabled Agents: ${t.agentConfigs.length}`);
            t.agentConfigs.forEach(ac => {
                console.log(`  - ${ac.agentSlug}: ${ac.enabled ? 'ENABLED' : 'DISABLED'}`);
            });
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
