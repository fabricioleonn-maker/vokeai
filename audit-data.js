const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
    console.log('🕵️ Auditoria de Dados Completa...');

    try {
        // 1. Users
        const users = await prisma.user.findMany({ select: { email: true, role: true, tenantId: true } });
        console.log(`\n👤 Usuários (${users.length}):`);
        users.forEach(u => console.log(`   - ${u.email} [${u.role}] -> Tenant: ${u.tenantId}`));

        // 2. Tenants
        const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });
        console.log(`\n🏢 Tenants (${tenants.length}):`);
        tenants.forEach(t => console.log(`   - ${t.name} (${t.slug}) ID: ${t.id}`));

        // 3. AgentNodes (Globais ou Específicos)
        const agents = await prisma.agentNode.findMany({ select: { slug: true, name: true, tenantId: true } });
        console.log(`\n🤖 Agentes Definidos (${agents.length}):`);
        agents.forEach(a => console.log(`   - ${a.name} (${a.slug}) -> Owner Tenant: ${a.tenantId || 'GLOBAL'}`));

        // 4. Configs (Vínculos)
        const configs = await prisma.tenantAgentConfig.findMany({ where: { enabled: true } });
        console.log(`\n⚙️ Configurações Ativas (${configs.length}):`);
        configs.forEach(c => console.log(`   - Tenant ${c.tenantId} usa ${c.agentSlug}`));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

audit();
