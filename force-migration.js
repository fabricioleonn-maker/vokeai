const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    console.log('👷 Executando Migração SQL Manual...');

    try {
        // 1. ConversationContext
        console.log('Creating Table: ConversationContext');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ConversationContext" (
        "id" TEXT NOT NULL,
        "conversationId" TEXT NOT NULL,
        "summary" TEXT,
        "activeAgent" TEXT,
        "handoffHistory" JSONB DEFAULT '[]',
        "pendingAction" JSONB,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "ConversationContext_pkey" PRIMARY KEY ("id")
      );
    `);

        // Unique Index for ConversationContext
        await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ConversationContext_conversationId_key" ON "ConversationContext"("conversationId");
    `);

        // 2. ConversationTurn
        console.log('Creating Table: ConversationTurn');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ConversationTurn" (
        "id" TEXT NOT NULL,
        "conversationId" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id")
      );
    `);

        // 3. TenantAgentConfig
        console.log('Creating Table: TenantAgentConfig');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TenantAgentConfig" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "agentSlug" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT false,
        "customPrompt" TEXT,
        "behaviorOverride" JSONB DEFAULT '{}',
        "allowedIntegrations" TEXT[],
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "TenantAgentConfig_pkey" PRIMARY KEY ("id")
      );
    `);

        // Unique Index for TenantAgentConfig
        await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "TenantAgentConfig_tenantId_agentSlug_key" ON "TenantAgentConfig"("tenantId", "agentSlug");
    `);

        // 4. TenantIntegrationConfig
        console.log('Creating Table: TenantIntegrationConfig');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TenantIntegrationConfig" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "integrationSlug" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT false,
        "config" JSONB DEFAULT '{}',
        "allowedAgents" TEXT[],
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "TenantIntegrationConfig_pkey" PRIMARY KEY ("id")
      );
    `);

        // Unique Index for TenantIntegrationConfig
        await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "TenantIntegrationConfig_tenantId_integrationSlug_key" ON "TenantIntegrationConfig"("tenantId", "integrationSlug");
    `);

        // 5. Foreign Keys 
        // (Pode falhar se Conversation já existir, então usamos DO block ou try catch separado, mas aqui vamos no raw simples)
        console.log('Applying Foreign Keys (Best Effort)...');

        try {
            await prisma.$executeRawUnsafe(`
        ALTER TABLE "ConversationContext" ADD CONSTRAINT "ConversationContext_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);
        } catch (e) { console.log('FK ConversationContext skipped/exists'); }

        try {
            await prisma.$executeRawUnsafe(`
        ALTER TABLE "ConversationTurn" ADD CONSTRAINT "ConversationTurn_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);
        } catch (e) { console.log('FK ConversationTurn skipped/exists'); }

        try {
            await prisma.$executeRawUnsafe(`
        ALTER TABLE "TenantAgentConfig" ADD CONSTRAINT "TenantAgentConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);
        } catch (e) { console.log('FK TenantAgentConfig skipped/exists'); }

        try {
            await prisma.$executeRawUnsafe(`
        ALTER TABLE "TenantIntegrationConfig" ADD CONSTRAINT "TenantIntegrationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);
        } catch (e) { console.log('FK TenantIntegrationConfig skipped/exists'); }


        console.log('✅ Migração Manual Concluída com Sucesso!');

    } catch (error) {
        console.error('❌ ERRO NA MIGRAÇÃO:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
