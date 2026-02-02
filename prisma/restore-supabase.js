const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
require('dotenv').config();

const prisma = new PrismaClient();

async function restore() {
    const backupFile = 'voke-pg-backup.json';

    if (!fs.existsSync(backupFile)) {
        console.error(`❌ Erro: Arquivo ${backupFile} não encontrado. Gere o backup primeiro.`);
        return;
    }

    console.log('📥 Lendo backup...');
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    const payload = data.payload;

    console.log('📡 Conectando ao Supabase...');
    try {
        await prisma.$connect();
        console.log('✅ Conectado!');

        // Import order matters for foreign keys
        const tables = [
            'Plan',
            'Tenant',
            'User',
            'AgentNode',
            'IntegrationNode',
            'TenantAgentConfig',
            'TenantIntegrationConfig',
            'Conversation',
            'ConversationTurn',
            'ConversationContext'
        ];

        for (const table of tables) {
            const records = payload[table];
            if (!records || records.length === 0) {
                console.log(`ℹ️ Tabela ${table} vazia no backup. Pulando.`);
                continue;
            }

            console.log(`📤 Restaurando ${records.length} registros para ${table}...`);

            for (const record of records) {
                try {
                    // Usamos upsert ou create dependendo da lógica. 
                    // Para migração limpa, create é melhor, mas upsert evita erros se rodar 2x.
                    const modelName = table.charAt(0).toLowerCase() + table.slice(1);

                    await prisma[modelName].upsert({
                        where: { id: record.id },
                        update: record,
                        create: record
                    });
                } catch (e) {
                    console.warn(`   ⚠️ Erro no registro id ${record.id} de ${table}: ${e.message}`);
                }
            }
        }

        console.log('\n====================================');
        console.log('✨ RESTAURAÇÃO CONCLUÍDA NO SUPABASE!');
        console.log('====================================\n');

    } catch (err) {
        console.error('❌ Erro fatal na restauração:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

restore();
