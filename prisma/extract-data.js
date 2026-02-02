const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Carregar .env manualmente se necessário
require('dotenv').config();

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

async function run() {
    console.log('📡 Conectando ao Abacus...');
    try {
        await prisma.$connect();
        console.log('✅ Conectado!');

        const data = {
            exportedAt: new Date().toISOString(),
            tenants: await prisma.tenant.findMany(),
            users: await prisma.user.findMany(),
            agents: await prisma.agentNode.findMany(),
            integrations: await prisma.integrationNode.findMany(),
            plans: await prisma.plan.findMany(),
            conversations: await prisma.conversation.findMany({
                include: {
                    turns: true,
                    context: true
                }
            }),
            tenantAgentConfigs: await prisma.tenantAgentConfig.findMany(),
            tenantIntegrationConfigs: await prisma.tenantIntegrationConfig.findMany()
        };

        const filename = 'voke-backup.json';
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));

        console.log('\n====================================');
        console.log(`✅ BACKUP CONCLUÍDO: ${filename}`);
        console.log(`📦 Arquivos: ${data.tenants.length} Tenants, ${data.agents.length} Agentes`);
        console.log('====================================\n');

    } catch (error) {
        console.error('❌ Erro na extração:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

run();
