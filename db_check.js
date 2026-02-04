const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();

async function run() {
    const count = await client.agentNode.count();
    console.log('--- DB AGENT COUNT ---');
    console.log(count);
    const all = await client.agentNode.findMany({ select: { slug: true, name: true } });
    all.forEach(a => console.log(`- ${a.slug}`));
}

run().catch(console.error).finally(() => client.$disconnect());
