const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const agents = await prisma.agentNode.findMany();
        console.log('--- AGENT DIAGNOSTIC ---');
        console.log('Total Agents:', agents.length);
        agents.forEach(a => {
            console.log(`\n- slug: ${a.slug}`);
            console.log(`  name: ${a.name}`);
            console.log(`  status: ${a.status}`);
            console.log(`  config: ${JSON.stringify(a.config)}`);
            // Check if top-level fields exist (schema_root.prisma style)
            console.log(`  channelsSupported (top): ${a.channelsSupported}`);
        });
    } catch (e) {
        console.error('Diagnostic failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
