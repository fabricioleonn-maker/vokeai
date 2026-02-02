
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🛡️ Forçando Sincronização do Banco de Dados...');

    // Helper para rodar query e ignorar erro se já existe (ou logar)
    const runQuery = async (name, query) => {
        try {
            await prisma.$executeRawUnsafe(query);
            console.log(`✅ ${name}: Sucesso`);
        } catch (e) {
            if (e.message.includes('already exists') || e.message.includes('Duplicate column')) {
                console.log(`⚠️ ${name}: Já existe (Ignorado)`);
            } else {
                console.error(`❌ ${name}: Falhou - ${e.message}`);
            }
        }
    };

    try {
        // 1. Tables
        await runQuery('Tabela UserProfile', `
      CREATE TABLE IF NOT EXISTS "UserProfile" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "preferences" JSONB NOT NULL DEFAULT '{}',
        "interests" TEXT[],
        "sentiment" TEXT NOT NULL DEFAULT 'neutral',
        "lastIntent" TEXT,
        "lastAgentUsed" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
      );
    `);
        await runQuery('Index UserProfile', `CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId");`);

        await runQuery('Tabela KnowledgeFact', `
      CREATE TABLE IF NOT EXISTS "KnowledgeFact" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "category" TEXT,
        "entity" TEXT,
        "fact" TEXT NOT NULL,
        "source" TEXT,
        "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "KnowledgeFact_pkey" PRIMARY KEY ("id")
      );
    `);
        await runQuery('Index KnowledgeFact', `CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_type_idx" ON "KnowledgeFact"("tenantId", "type");`);

        await runQuery('Tabela ConversationEmbedding', `
      CREATE TABLE IF NOT EXISTS "ConversationEmbedding" (
        "id" TEXT NOT NULL,
        "conversationId" TEXT NOT NULL,
        "turnId" TEXT,
        "tenantId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "agentUsed" TEXT,
        "channel" TEXT,
        "intent" TEXT,
        "sentiment" TEXT,
        "topics" TEXT[],
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ConversationEmbedding_pkey" PRIMARY KEY ("id")
      );
    `);
        await runQuery('Index ConversationEmbedding', `CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_userId_idx" ON "ConversationEmbedding"("tenantId", "userId");`);

        // 2. Colunas na tabela Tenant
        // Usando try/catch block do JS em vez de DO $$ do SQL para evitar overhead/erros de syntax do driver
        const tenantCols = [
            { name: 'businessSector', type: 'TEXT' },
            { name: 'businessType', type: 'TEXT' },
            { name: 'glossary', type: "JSONB DEFAULT '[]'" },
            { name: 'productsServices', type: "JSONB DEFAULT '[]'" }
        ];

        for (const col of tenantCols) {
            await runQuery(`Coluna Tenant.${col.name}`, `ALTER TABLE "Tenant" ADD COLUMN "${col.name}" ${col.type};`);
        }

    } catch (error) {
        console.error('❌ Erro Geral:', error);
    } finally {
        await prisma.$disconnect();
        console.log('🏁 Processo finalizado');
    }
}

main();
