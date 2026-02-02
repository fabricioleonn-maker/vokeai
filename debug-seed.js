const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('🐞 Iniciando Debug Detalhado de Seed...');

    try {
        // 1. Testar Conexão e Plan
        console.log('1️⃣ Checando Tabela Plan...');
        try {
            const count = await prisma.plan.count();
            console.log(`   ✅ Tabela Plan existe. Contagem: ${count}`);
        } catch (e) {
            console.error(`   ❌ Falha ao acessar Plan:`, e.code, e.meta);
            throw e; // Abortar se tabela crítica não existe
        }

        // 2. Tentar Criar um Plano de Teste
        console.log('2️⃣ Tentando Criar Plano Debug...');
        try {
            const p = await prisma.plan.upsert({
                where: { slug: 'debug-plan' },
                create: {
                    slug: 'debug-plan',
                    name: 'Debug Plan',
                    description: 'Plano de teste',
                    tier: 'free',
                    status: 'active'
                },
                update: {}
            });
            console.log('   ✅ Plano Criado:', p.id);
        } catch (e) {
            console.error('   ❌ Falha ao Criar Plano:', e.message);
            // Não throw, vamos tentar o próximo
        }

        // 3. Checando Agentes
        console.log('3️⃣ Checando Tabela AgentNode...');
        try {
            const count = await prisma.agentNode.count();
            console.log(`   ✅ Tabela AgentNode existe. Contagem: ${count}`);
        } catch (e) {
            console.error(`   ❌ Falha ao acessar AgentNode:`, e.code, e.meta);
        }

        // 4. Listar Tenants e Configs
        console.log('4️⃣ Listando Tenants e Agentes Habilitados...');
        const tenants = await prisma.tenant.findMany({
            include: { agentConfigs: true }
        });

        if (tenants.length === 0) {
            console.log('   ⚠️ Nenhum Tenant encontrado!');
        } else {
            tenants.forEach(t => {
                console.log(`   🏢 Tenant: ${t.name} (ID: ${t.id})`);
                console.log(`      Agentes: ${t.agentConfigs.length}`);
                t.agentConfigs.forEach(a => console.log(`      - ${a.agentSlug} (Ativo: ${a.enabled})`));
            });
        }

    } catch (error) {
        console.error('❌ ERRO FATAL:', error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
