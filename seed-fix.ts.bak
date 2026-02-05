
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Iniciando Repopulação dos Agentes (Seed Fix)...');

    try {
        // 1. Criar Planos Básicos (Necessário para Tenants)
        console.log('📦 Criando Planos...');
        const planPro = await prisma.plan.upsert({
            where: { slug: 'pro' },
            update: {},
            create: {
                slug: 'pro',
                name: 'Pro',
                description: 'Plano Profissional',
                tier: 'pro',
                limits: { features: { enabled_agents: ['agent.secretary', 'agent.sales', 'agent.finance'] } }
            }
        });

        // 2. Criar Agentes (O que falta no painel)
        console.log('🤖 Criando Agentes...');
        const agents = [
            {
                slug: 'agent.secretary',
                name: 'Secretária Virtual',
                description: 'Gerencia agenda e compromissos',
                category: 'productivity',
                status: 'active',
                config: {}
            },
            {
                slug: 'agent.finance',
                name: 'Assistente Financeiro',
                description: 'Controle de fluxo de caixa',
                category: 'finance',
                status: 'active',
                config: {}
            },
            {
                slug: 'agent.sales',
                name: 'Especialista em Vendas',
                description: 'Qualificação e vendas',
                category: 'sales',
                status: 'active',
                config: {}
            },
            {
                slug: 'agent.promohunter',
                name: 'Caçador de Promoções',
                description: 'Busca ofertas e monitora preços',
                category: 'shopping',
                status: 'active',
                config: {}
            }
        ];

        for (const agent of agents) {
            await prisma.agentNode.upsert({
                where: { slug: agent.slug },
                update: {},
                create: agent
            });
            console.log(`   + Agente: ${agent.name}`);
        }

        // 3. Vincular ao Tenant (Se existir algum)
        console.log('🔗 Vinculando Agentes aos Tenants existentes...');
        const tenants = await prisma.tenant.findMany();

        if (tenants.length === 0) {
            console.log('⚠️ Nenhum tenant encontrado. Criando um de teste...');
            const newTenant = await prisma.tenant.create({
                data: {
                    slug: 'voke-demo',
                    name: 'Voke Demo',
                    planId: planPro.id,
                    status: 'active'
                }
            });
            tenants.push(newTenant);
        }

        for (const tenant of tenants) {
            console.log(`   Processando Tenant: ${tenant.name}`);

            // Habilitar todos os agentes para este tenant
            for (const agent of agents) {
                await prisma.tenantAgentConfig.upsert({
                    where: {
                        tenantId_agentSlug: {
                            tenantId: tenant.id,
                            agentSlug: agent.slug
                        }
                    },
                    update: { enabled: true },
                    create: {
                        tenantId: tenant.id,
                        agentSlug: agent.slug,
                        enabled: true,
                        allowedIntegrations: []
                    }
                });
            }
        }

        console.log('✅ SUCESSO! Agentes cadastrados e vinculados.');
        console.log('🔄 Atualize a página do painel para ver os agentes.');

    } catch (error) {
        console.error('❌ ERRO NO SEED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
