
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Diagnosticando Schema do Banco de Dados...');

    try {
        // Tenta uma query raw para ver as colunas da tabela
        const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'TenantIntegrationConfig';
    `;

        console.log('📋 Colunas encontradas em TenantIntegrationConfig:', result);

        const hasConfig = result.some(r => r.column_name === 'config');
        if (!hasConfig) {
            console.error('❌ CRÍTICO: A coluna "config" NÃO existe no banco de dados!');
        } else {
            console.log('✅ A coluna "config" existe.');
        }

    } catch (e) {
        console.error('Erro ao ler schema:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
