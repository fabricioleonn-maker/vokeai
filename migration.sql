-- ============================================================
-- ⚠️ ATENÇÃO: Execute este script no SQL Editor do Supabase
-- Motivo: O usuário de conexão local não tem permissão para criar tabelas.
-- ============================================================

-- 1. ConversationContext
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

CREATE UNIQUE INDEX IF NOT EXISTS "ConversationContext_conversationId_key" ON "ConversationContext"("conversationId");

-- 2. ConversationTurn
CREATE TABLE IF NOT EXISTS "ConversationTurn" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id")
);

-- 3. TenantAgentConfig
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

CREATE UNIQUE INDEX IF NOT EXISTS "TenantAgentConfig_tenantId_agentSlug_key" ON "TenantAgentConfig"("tenantId", "agentSlug");

-- 4. TenantIntegrationConfig
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

CREATE UNIQUE INDEX IF NOT EXISTS "TenantIntegrationConfig_tenantId_integrationSlug_key" ON "TenantIntegrationConfig"("tenantId", "integrationSlug");

-- 5. Foreign Keys (Relações)
DO $$ BEGIN
    ALTER TABLE "ConversationContext" ADD CONSTRAINT "ConversationContext_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ConversationTurn" ADD CONSTRAINT "ConversationTurn_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TenantAgentConfig" ADD CONSTRAINT "TenantAgentConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TenantIntegrationConfig" ADD CONSTRAINT "TenantIntegrationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
