-- 🚨 CORREÇÃO DE COLUNAS FALTANTES (AGENT NODE)
-- Execute no Supabase SQL Editor

-- 1. Adicionar coluna 'config' (usada para configurações gerais do agente)
DO $$ BEGIN
    ALTER TABLE "AgentNode" ADD COLUMN "config" JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 2. Adicionar coluna 'tenantId' (para agentes privados/customizados)
DO $$ BEGIN
    ALTER TABLE "AgentNode" ADD COLUMN "tenantId" TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 3. Criar chave estrangeira para o tenant (se não existir)
DO $$ BEGIN
    ALTER TABLE "AgentNode" ADD CONSTRAINT "AgentNode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Adicionar 'tier' e 'status' e 'features' em Plan (Garantia extra)
DO $$ BEGIN
    ALTER TABLE "Plan" ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'free';
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
    ALTER TABLE "Plan" ADD COLUMN "features" JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
    ALTER TABLE "Plan" ADD COLUMN "limits" JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;
DO $$ BEGIN
    ALTER TABLE "Plan" ADD COLUMN "billing" JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;

SELECT 'CORRECAO_APLICADA' as status;
