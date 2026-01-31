/**
 * Seed data for AI Memory System testing
 */

import { prisma } from '../lib/db';

async function seedMemorySystem() {
    console.log('🌱 Seeding AI Memory System...');

    // 1. Update tenant with business profile
    const tenantSlug = 'demo'; // Change to your tenant slug

    const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug }
    });

    if (!tenant) {
        console.error('❌ Tenant not found. Please create a tenant first.');
        return;
    }

    console.log(`✅ Found tenant: ${tenant.name}`);

    // Update with business profile
    await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
            businessSector: 'saas',
            businessType: 'B2B',
            companySize: 'small',
            targetAudience: 'Pequenas e médias empresas que buscam automação com IA',
            productsServices: [
                {
                    name: 'VokeAI Basic',
                    description: 'Plano básico com agentes essenciais',
                    price: 'R$ 99/mês'
                },
                {
                    name: 'VokeAI Pro',
                    description: 'Plano profissional com todos os agentes',
                    price: 'R$ 299/mês'
                },
                {
                    name: 'VokeAI Enterprise',
                    description: 'Solução empresarial customizada',
                    price: 'Sob consulta'
                }
            ],
            glossary: {
                'Agente': 'IA especializada em uma função específica',
                'Orquestrador': 'Sistema que roteia mensagens para o agente correto',
                'Personalidade': 'Tom e estilo de comunicação do agente',
                'Treinamento': 'Processo de ensinar preferências ao agente'
            },
            brandVoice: {
                tone: 'Profissional mas acessível',
                style: 'Direto e prático',
                avoid: ['Jargões técnicos excessivos', 'Linguagem muito formal'],
                preferences: ['Usar exemplos práticos', 'Explicar conceitos complexos de forma simples']
            }
        }
    });

    console.log('✅ Updated tenant business profile');

    // 2. Create sample knowledge facts
    const facts = [
        {
            type: 'business_context',
            category: 'product',
            entity: 'VokeAI Pro',
            fact: 'Plano mais popular entre clientes, oferece melhor custo-benefício',
            confidence: 0.9,
            source: 'manual_training'
        },
        {
            type: 'business_context',
            category: 'sales',
            entity: 'Desconto',
            fact: 'Oferecemos 20% de desconto para pagamento anual antecipado',
            confidence: 1.0,
            source: 'manual_training'
        },
        {
            type: 'sector_knowledge',
            category: 'general',
            entity: 'Agente de Suporte',
            fact: 'Pode resolver 80% das dúvidas técnicas comuns sem intervenção humana',
            confidence: 0.85,
            source: 'manual_training'
        },
        {
            type: 'business_context',
            category: 'support',
            entity: 'Tempo de Resposta',
            fact: 'SLA de resposta é 2 horas em horário comercial para plano Pro',
            confidence: 1.0,
            source: 'manual_training'
        }
    ];

    for (const fact of facts) {
        await prisma.knowledgeFact.create({
            data: {
                tenantId: tenant.id,
                ...fact
            }
        });
    }

    console.log(`✅ Created ${facts.length} knowledge facts`);

    // 3. Create sample business rules
    const rules = [
        {
            name: 'Sempre mencionar parcelamento',
            description: 'Quando falar de preços, sempre informar que aceitamos parcelamento',
            trigger: 'intent:sales',
            action: 'inject_context',
            payload: {
                context: 'Aceitamos parcelamento em até 12x sem juros para todos os planos'
            },
            priority: 10
        },
        {
            name: 'Escalação para humano',
            description: 'Escalar para atendimento humano se cliente demonstrar insatisfação',
            trigger: 'user_segment:negative_sentiment',
            action: 'escalate',
            payload: {
                escalate_to: 'human_support',
                reason: 'Cliente com sentimento negativo'
            },
            priority: 100
        }
    ];

    for (const rule of rules) {
        await prisma.businessRule.create({
            data: {
                tenantId: tenant.id,
                ...rule
            }
        });
    }

    console.log(`✅ Created ${rules.length} business rules`);

    console.log('\n🎉 Memory system seeded successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test a conversation to see knowledge extraction in action');
    console.log('2. Check UserProfile table to see learned preferences');
    console.log('3. View KnowledgeFact table to see accumulated knowledge');
}

seedMemorySystem()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
