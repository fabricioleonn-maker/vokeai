const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFullFlow() {
    console.log('🚀 Iniciando simulação REAL do Chat (Script v2)...');

    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error('Nenhum tenant encontrado');
        const tenantId = tenant.id;

        console.log('User Upsert...');
        const user = await prisma.user.upsert({
            where: { email: `debug-v2-${Date.now()}@test.com` },
            update: {},
            create: {
                email: `debug-v2-${Date.now()}@test.com`,
                name: 'Debug User v2',
                tenantId,
                role: 'user',
                password: 'demo-no-login',
            }
        });

        console.log('Conversation Create...');
        const conversation = await prisma.conversation.create({
            data: {
                tenantId,
                userId: user.id,
                channel: 'web',
                status: 'active'
            },
            include: { context: true }
        });

        console.log('ConversationContext Create...');
        await prisma.conversationContext.create({
            data: {
                conversationId: conversation.id,
                summary: '',
                //activeAgent: 'test', <--- Verificando validacao
                handoffHistory: [],
                //pendingAction: {} 
            }
        });

        console.log('ConversationTurn Create...');
        await prisma.conversationTurn.create({
            data: {
                conversationId: conversation.id,
                role: 'user',
                content: 'Debug Message',
                metadata: { channel: 'web' }
            }
        });

        console.log('🎉 SUCESSO TOTAL!');

    } catch (error) {
        console.error('\n❌ FALHA NO FLUXO:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

debugFullFlow();
