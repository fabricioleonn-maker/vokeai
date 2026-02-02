const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log('🕵️‍♀️ Verificando Tabelas no Banco de Dados...');

    try {
        const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;

        const tableNames = tables.map(t => t.table_name);
        console.log('📋 Tabelas Encontradas:', tableNames.sort());

        const missing = [
            'ConversationContext',
            'ConversationTurn',
            'TenantAgentConfig',
            'TenantIntegrationConfig'
        ].filter(t => !tableNames.includes(t));

        if (missing.length > 0) {
            console.error('\n❌ TABELAS FALTANDO:', missing);
            console.log('⚠️ O SQL não foi aplicado corretamente ou foi aplicado em outro banco.');
        } else {
            console.log('\n✅ Todas as tabelas críticas existem!');
        }

    } catch (error) {
        console.error('❌ Erro de conexão:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
