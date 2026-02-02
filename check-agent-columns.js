const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log('🕵️‍♀️ Verificando Colunas de AgentNode...');
    try {
        const cols = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'AgentNode';
    `;

        const names = cols.map(c => c.column_name);
        console.log('Colunas:', names);

        console.log('Tem tenantId?', names.includes('tenantId'));
        console.log('Tem config?', names.includes('config'));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
