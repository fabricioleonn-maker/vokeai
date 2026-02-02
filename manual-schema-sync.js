
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🛠️ Iniciando Sincronização Manual de Schema (Bypass CLI)...');

    try {
        // 1. TenantIntegrationConfig (Já estava no script anterior, mantendo por segurança)
        console.log('1️⃣ Verificando TenantIntegrationConfig...');
        await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='TenantIntegrationConfig' AND column_name='config') THEN 
          ALTER TABLE "TenantIntegrationConfig" ADD COLUMN "config" JSONB DEFAULT '{}'; 
        END IF; 
      END $$;
    `);

        // 2. Tenant - Novos campos de contexto
        console.log('2️⃣ Atualizando tabela Tenant...');
        const tenantFields = [
            { name: 'businessSector', type: 'TEXT' },
            { name: 'businessType', type: 'TEXT' },
            { name: 'glossary', type: "JSONB DEFAULT '[]'" },
            { name: 'productsServices', type: "JSONB DEFAULT '[]'" }
        ];

        for (const field of tenantFields) {
            await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tenant' AND column_name='${field.name}') THEN 
            ALTER TABLE "Tenant" ADD COLUMN "${field.name}" ${field.type}; 
          END IF; 
        END $$;
      `);
        }

        // 3. KnowledgeFact
        console.log('3️⃣ Criando tabela KnowledgeFact...');
        await prisma.$executeRawUnsafe(`
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
        // Índices
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_type_idx" ON "KnowledgeFact"("tenantId", "type");`);

        // 4. UserProfile
        console.log('4️⃣ Criando tabela UserProfile...');
        await prisma.$executeRawUnsafe(`
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
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
      );
    `);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId");`);

        // 5. ConversationEmbedding
        console.log('5️⃣ Criando tabela ConversationEmbedding...');
        // Nota: Ignorando o campo 'embedding' vector por enquanto se a extensão pgvector não estiver ativa, 
        // ou tratando como texto/json se necessário, mas o schema pedia Unsupported("vector"). 
        // Vamos criar sem a coluna de embedding primeiro para evitar erro se pgvector faltar, ou tentar adicionar.

        await prisma.$executeRawUnsafe(`
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
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_userId_idx" ON "ConversationEmbedding"("tenantId", "userId");`);

        console.log('✅ Sincronização manual concluída com sucesso!');

    } catch (error) {
        console.error('❌ Erro na sincronização manual:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
