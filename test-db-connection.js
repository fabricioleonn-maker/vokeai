// Simple import test
try {
    console.log('1. Tentando importar prisma...');
    const { prisma } = require('./lib/db');
    console.log('✅ Prisma importado com sucesso!');

    console.log('\n2. Testando conexão...');
    prisma.tenant.count()
        .then(count => {
            console.log(`✅ Conexão OK! Total de tenants: ${count}`);
            return prisma.agentNode.count();
        })
        .then(count => {
            console.log(`✅ Total de agentes: ${count}`);
            return prisma.user.count();
        })
        .then(count => {
            console.log(`✅ Total de usuários: ${count}`);
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Erro na query:', err.message);
            console.error(err);
            process.exit(1);
        });
} catch (err) {
    console.error('❌ Erro ao importar:', err.message);
    console.error(err.stack);
    process.exit(1);
}
