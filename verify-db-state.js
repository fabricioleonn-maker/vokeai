
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verificando Estado do Banco...');

    const report = {
        tables: {},
        columns: {}
    };

    try {
        // Check Tables
        const tables = ['KnowledgeFact', 'UserProfile', 'ConversationEmbedding'];
        for (const table of tables) {
            const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${table}
        );
      `;
            report.tables[table] = result[0].exists;
        }

        // Check Columns in Tenant
        const tenantCols = ['businessSector', 'glossary', 'productsServices'];
        for (const col of tenantCols) {
            const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'Tenant' AND column_name = ${col}
        );
      `;
            report.columns[`Tenant.${col}`] = result[0].exists;
        }

        console.log('📊 Relatório:', JSON.stringify(report, null, 2));

    } catch (e) {
        console.error('Erro:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
