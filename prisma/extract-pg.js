const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function extract() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('🔗 Conectando via pg...');
        await client.connect();
        console.log('✅ Conectado!');

        const tables = [
            'Tenant', 'User', 'Plan', 'AgentNode', 'IntegrationNode',
            'TenantAgentConfig', 'TenantIntegrationConfig',
            'Conversation', 'ConversationTurn', 'ConversationContext'
        ];

        const data = {
            exportedAt: new Date().toISOString(),
            payload: {}
        };

        for (const table of tables) {
            console.log(`📥 Lendo tabela: ${table}...`);
            try {
                const res = await client.query(`SELECT * FROM "${table}"`);
                data.payload[table] = res.rows;
                console.log(`   - ${res.rows.length} registros found.`);
            } catch (e) {
                console.warn(`   ⚠️ Erro ao ler ${table}: ${e.message}`);
            }
        }

        fs.writeFileSync('voke-pg-backup.json', JSON.stringify(data, null, 2));
        console.log('\n✅ BACKUP CONCLUÍDO: voke-pg-backup.json');

    } catch (err) {
        console.error('❌ Erro fatal:', err.message);
    } finally {
        await client.end();
    }
}

extract();
