const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySpecific() {
    console.log('🕵️‍♀️ Verificação de Sobrevivência...');
    try {
        const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `;
        const names = tables.map(t => t.table_name);

        console.log('Plan existe?', names.includes('Plan'));
        console.log('AgentNode existe?', names.includes('AgentNode'));
        console.log('Tenant existe?', names.includes('Tenant'));
        console.log('User existe?', names.includes('User'));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verifySpecific();
