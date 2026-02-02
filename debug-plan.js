const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPlan() {
    console.log('🐞 Debugging Plan Table...');
    try {
        // 1. Listar planos
        const plans = await prisma.plan.findMany();
        console.log(`✅ Planos encontrados: ${plans.length}`);
        plans.forEach(p => console.log(`   - ${p.slug} (${p.id})`));

        // 2. Tentar criar/atualizar
        console.log('🔄 Tentando Upsert Pro...');
        const p = await prisma.plan.upsert({
            where: { slug: 'pro' },
            update: {},
            create: {
                slug: 'pro',
                name: 'Pro',
                description: 'Plano debug',
                status: 'active',
                limits: {},
                features: {}
            }
        });
        console.log(`✅ Upsert Sucesso: ${p.id}`);

    } catch (error) {
        console.error('❌ ERRO PLAN:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugPlan();
