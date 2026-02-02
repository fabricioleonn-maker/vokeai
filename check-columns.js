const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColumns() {
    console.log('🕵️‍♀️ Verificando Colunas de Plan...');
    try {
        const cols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Plan';
    `;

        console.log('Colunas de Plan:');
        cols.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkColumns();
