-- 🚨 COPIE E COLE NO SQL EDITOR DO SUPABASE 🚨

-- 1. Cria tabela UserProfile
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
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId");

-- 2. Cria tabela KnowledgeFact
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
CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_type_idx" ON "KnowledgeFact"("tenantId", "type");

-- 3. Cria tabela ConversationEmbedding
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
CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_userId_idx" ON "ConversationEmbedding"("tenantId", "userId");

-- 4. Atualiza Tabela Tenant (Adiciona colunas de contexto)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tenant' AND column_name='businessSector') THEN 
    ALTER TABLE "Tenant" ADD COLUMN "businessSector" TEXT; 
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tenant' AND column_name='businessType') THEN 
    ALTER TABLE "Tenant" ADD COLUMN "businessType" TEXT; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tenant' AND column_name='glossary') THEN 
    ALTER TABLE "Tenant" ADD COLUMN "glossary" JSONB DEFAULT '[]'; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tenant' AND column_name='productsServices') THEN 
    ALTER TABLE "Tenant" ADD COLUMN "productsServices" JSONB DEFAULT '[]'; 
  END IF;
END $$;

-- 5. Garante config em TenantIntegrationConfig
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='TenantIntegrationConfig' AND column_name='config') THEN 
    ALTER TABLE "TenantIntegrationConfig" ADD COLUMN "config" JSONB DEFAULT '{}'; 
  END IF; 
END $$;
