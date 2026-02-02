import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL // Usa o DATABASE_URL do .env (Abacus)
        }
    }
});

async function checkAbacusData() {
    try {
        console.log('🔍 Verificando dados no Abacus...\n');
        console.log('📡 Conectando a:', process.env.DATABASE_URL?.split('@')[1]?.split('?')[0], '\n');

        // Test connection
        await prisma.$connect();
        console.log('✅ Conexão estabelecida!\n');

        // Count all entities
        const counts = {
            tenants: await prisma.tenant.count(),
            users: await prisma.user.count(),
            agents: await prisma.agentNode.count(),
            integrations: await prisma.integrationNode.count(),
            conversations: await prisma.conversation.count(),
            turns: await prisma.conversationTurn.count(),
            plans: await prisma.plan.count()
        };

        console.log('📊 Contagem de Registros:');
        console.table(counts);

        // Show tenants
        if (counts.tenants > 0) {
            const tenants = await prisma.tenant.findMany({
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    status: true,
                    createdAt: true
                }
            });
            console.log('\n🏢 Tenants encontrados:');
            console.table(tenants);
        } else {
            console.log('\n⚠️ Nenhum tenant encontrado');
        }

        // Show agents
        if (counts.agents > 0) {
            const agents = await prisma.agentNode.findMany({
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    category: true,
                    status: true
                }
            });
            console.log('\n🤖 Agentes encontrados:');
            console.table(agents);
        } else {
            console.log('\n⚠️ Nenhum agente encontrado');
        }

        // Show users
        if (counts.users > 0) {
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    createdAt: true
                }
            });
            console.log('\n👤 Usuários encontrados:');
            console.table(users);
        } else {
            console.log('\n⚠️ Nenhum usuário encontrado');
        }

        // Save backup if data exists
        const hasData = counts.tenants > 0 || counts.agents > 0 || counts.users > 0;

        if (hasData) {
            console.log('\n💾 Criando backup dos dados...');

            const data = {
                exportedAt: new Date().toISOString(),
                counts,
                plans: await prisma.plan.findMany(),
                tenants: await prisma.tenant.findMany(),
                agents: await prisma.agentNode.findMany(),
                integrations: await prisma.integrationNode.findMany(),
                users: await prisma.user.findMany({
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        tenantId: true,
                        createdAt: true,
                        updatedAt: true
                        // Não incluir password por segurança
                    }
                }),
                conversations: await prisma.conversation.findMany({
                    include: {
                        turns: true,
                        context: true
                    }
                }),
                tenantAgentConfigs: await prisma.tenantAgentConfig.findMany(),
                tenantIntegrationConfigs: await prisma.tenantIntegrationConfig.findMany()
            };

            const backupPath = 'abacus-backup.json';
            fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
            console.log(`✅ Backup salvo em: ${backupPath}`);
            console.log(`📦 Tamanho: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`);
        } else {
            console.log('\n📭 Banco está vazio - nenhum backup necessário');
        }

        console.log('\n' + '='.repeat(60));
        console.log('📋 RESUMO:');
        console.log('='.repeat(60));

        if (hasData) {
            console.log('✅ O banco do Abacus TEM dados');
            console.log('💡 Recomendação: Importar dados para o novo banco local');
        } else {
            console.log('📭 O banco do Abacus está VAZIO');
            console.log('💡 Recomendação: Start fresh com seed no banco local');
        }

    } catch (error: any) {
        console.error('\n❌ Erro ao conectar com Abacus:');
        console.error('Mensagem:', error.message);

        if (error.code === 'P1001') {
            console.error('\n💡 Dica: Verifique se:');
            console.error('   1. Você está conectado à internet');
            console.error('   2. O servidor Abacus está acessível');
            console.error('   3. As credenciais no DATABASE_URL estão corretas');
        }
    } finally {
        await prisma.$disconnect();
    }
}

checkAbacusData();
