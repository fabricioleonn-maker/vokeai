-- ============================================================
-- 🚨 CORREÇÃO TOTAL MANUAL (PLANO C) - VOKE AI
-- Execute este script COMPLETO no Supabase SQL Editor.
-- Ele é seguro (usa IF NOT EXISTS) e corrige tudo.
-- ============================================================

-- 1. Tabela PLAN (Atualizada e Completa)
CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "limits" JSONB DEFAULT '{}',
    "features" JSONB DEFAULT '{}',
    "billing" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_slug_key" ON "Plan"("slug");

-- Adicionar colunas novas se a tabela já existir mas estiver velha
DO $$ BEGIN
    ALTER TABLE "Plan" ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'free';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Plan" ADD COLUMN "limits" JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Plan" ADD COLUMN "features" JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Plan" ADD COLUMN "billing" JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 2. Tabela TENANT (Atualizada)
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planId" TEXT,
    "config" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "logo" TEXT,
    "primaryColor" TEXT,
    "aiPersonality" JSONB,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

-- FK Tenant -> Plan
DO $$ BEGIN
    ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Atualizar colunas do Tenant
DO $$ BEGIN
    ALTER TABLE "Tenant" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Tenant" ADD COLUMN "aiPersonality" JSONB;
EXCEPTION WHEN duplicate_column THEN null; END $$;


-- 3. Tabela AGENT NODE
CREATE TABLE IF NOT EXISTS "AgentNode" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "channelsSupported" TEXT[],
    "intentsSupported" TEXT[],
    "requiredIntegrations" TEXT[],
    "optionalIntegrations" TEXT[],
    "permissionsRequired" TEXT[],
    "planConstraints" JSONB DEFAULT '{}',
    "behavior" JSONB DEFAULT '{}',
    "prompts" JSONB DEFAULT '{}',
    "uiRules" JSONB DEFAULT '{}',
    "audit" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentNode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgentNode_slug_key" ON "AgentNode"("slug");

-- 4. Tabela INTEGRATION NODE
CREATE TABLE IF NOT EXISTS "IntegrationNode" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "auth" JSONB DEFAULT '{}',
    "capabilities" JSONB DEFAULT '{}',
    "dataContract" JSONB DEFAULT '{}',
    "supportedAgents" TEXT[],
    "planConstraints" JSONB DEFAULT '{}',
    "syncStrategy" JSONB DEFAULT '{}',
    "privacyRules" JSONB DEFAULT '{}',
    "audit" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationNode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationNode_slug_key" ON "IntegrationNode"("slug");


-- 5. Tabelas do CHAT (Novas)
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

CREATE TABLE IF NOT EXISTS "ConversationTurn" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id")
);

-- 6. Tabelas de Configuração (Tenant Configs)
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


-- 7. Foreign Keys Finais
DO $$ BEGIN
    ALTER TABLE "ConversationContext" ADD CONSTRAINT "ConversationContext_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "ConversationTurn" ADD CONSTRAINT "ConversationTurn_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "TenantAgentConfig" ADD CONSTRAINT "TenantAgentConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "TenantIntegrationConfig" ADD CONSTRAINT "TenantIntegrationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Confirmação
SELECT 'MIGRACAO_CONCLUIDA' as status;
