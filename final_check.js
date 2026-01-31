
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('CONNECTING...');
        await prisma.$connect();
        console.log('CONNECTED TO DATABASE!');

        const count = await prisma.agentNode.count();
        console.log(`FOUND ${count} AGENTS.`);

    } catch (e) {
        console.error('CONNECTION FAILED:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
