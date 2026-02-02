
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AGENTS = [
    {
        slug: 'agent.secretary',
        name: 'Secretária Virtual',
        description: 'Gestão de agenda, lembretes e organização de compromissos.',
        category: 'productivity',
        config: {
            benefits: [
                'Agendamento automático',
                'Lembretes inteligentes',
                'Organização de horários'
            ],
            useCases: ['Marcar reuniões', 'Lembrar de pagar contas', 'Organizar a semana']
        }
    },
    {
        slug: 'agent.sales',
        name: 'Especialista em Vendas',
        description: 'Qualificação de leads, superação de objeções e fechamento.',
        category: 'sales',
        config: {
            benefits: [
                'Qualificação automática',
                'Scripts persuasivos',
                'Foco em conversão'
            ],
            useCases: ['Quero vender mais', 'Como responder esse cliente?', 'Qualifique esse lead']
        }
    },
    {
        slug: 'agent.finance',
        name: 'Assistente Financeiro',
        description: 'Controle de fluxo de caixa, categorização e dúvidas financeiras.',
        category: 'finance',
        config: {
            benefits: [
                'Controle de caixa',
                'Relatórios simples',
                'Dicas de economia'
            ],
            useCases: ['Lance essa despesa', 'Como está meu lucro?', 'Previsão para o mês']
        }
    },
    {
        slug: 'agent.support.n1',
        name: 'Atendimento N1',
        description: 'Suporte geral, dúvidas frequentes e triagem de chamados.',
        category: 'support',
        config: {
            benefits: [
                'Respostas 24/7',
                'Tira dúvidas na hora',
                'Filtra o que é urgente'
            ],
            useCases: ['Dúvida sobre produto', 'Meu pedido atrasou', 'Horário de funcionamento']
        }
    },
    {
        slug: 'agent.promohunter',
        name: 'Caçador de Promoções',
        description: 'Busca ativa de ofertas, monitoramento de preços e alertas.',
        category: 'shopping',
        config: {
            benefits: [
                'Encontra menor preço',
                'Alerta de queda de valor',
                'Histórico de preços'
            ],
            useCases: ['Ache um iPhone barato', 'Monitore essa TV', 'Essa oferta é boa?']
        }
    }
];

async function main() {
    console.log('🧹 Limpando configurações antigas...');

    // Opcional: Limpar configs antigas se quiser um reset total
    // await prisma.tenantAgentConfig.deleteMany({});
    // await prisma.agentNode.deleteMany({});

    console.log('🌱 Semeando Agentes (V2 - Clean Architecture)...');

    for (const agent of AGENTS) {
        console.log(`Processing ${agent.name}...`);

        // 1. Upsert AgentNode (Global Definition)
        await prisma.agentNode.upsert({
            where: { slug: agent.slug },
            update: {
                name: agent.name,
                description: agent.description,
                category: agent.category,
                config: agent.config,
                status: 'active'
            },
            create: {
                slug: agent.slug,
                name: agent.name,
                description: agent.description,
                category: agent.category,
                config: agent.config,
                status: 'active'
            }
        });
    }

    // 2. Ensure Tenants have access
    const tenants = await prisma.tenant.findMany();
    console.log(`🔗 Verifying access for ${tenants.length} tenants...`);

    for (const tenant of tenants) {
        for (const agent of AGENTS) {
            await prisma.tenantAgentConfig.upsert({
                where: {
                    tenantId_agentSlug: {
                        tenantId: tenant.id,
                        agentSlug: agent.slug
                    }
                },
                update: { enabled: true }, // Ensure enabled
                create: {
                    tenantId: tenant.id,
                    agentSlug: agent.slug,
                    enabled: true
                }
            });
        }
    }

    console.log('✅ Agentes configurados com sucesso!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
