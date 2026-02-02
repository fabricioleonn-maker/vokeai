const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
    console.log('🔍 Diagnosticando Estado dos Agentes e Conversas...');

    try {
        // 1. Verificar Tenant e Configurações
        const tenant = await prisma.tenant.findFirst({
            include: { agentConfigs: true }
        });

        if (!tenant) {
            console.error('❌ CRÍTICO: Nenhum Tenant encontrado no banco!');
            return;
        }
        console.log(`✅ Tenant encontrado: ${tenant.name} (${tenant.id})`);
        console.log(`   Agentes Configurados: ${tenant.agentConfigs.length}`);
        tenant.agentConfigs.forEach(c => {
            console.log(`   - ${c.agentSlug}: ${c.enabled ? 'ATIVO' : 'INATIVO'}`);
        });

        // 2. Verificar Última Conversa
        const lastConv = await prisma.conversation.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                context: true,
                turns: true,
                messages: { take: 1, orderBy: { createdAt: 'desc' } }
            }
        });

        if (!lastConv) {
            console.log('⚠️ Nenhuma conversa encontrada.');
        } else {
            console.log(`\n✅ Última Conversa: ${lastConv.id}`);
            console.log(`   Status: ${lastConv.status}`);
            console.log(`   Contexto Existe? ${lastConv.context ? 'SIM' : 'NÃO'}`);
            if (lastConv.context) {
                console.log(`   Agente Ativo no Contexto: ${lastConv.context.activeAgent}`);
            }
            console.log(`   Turnos Gravados: ${lastConv.turns.length}`);

            if (lastConv.turns.length === 0) {
                console.warn('⚠️ Conversa existe mas não tem turnos (ConversationTurn). O Chat pode estar falhando ao salvar.');
            }
        }

    } catch (error) {
        console.error('❌ FALHA NO DIAGNÓSTICO:', error);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();
