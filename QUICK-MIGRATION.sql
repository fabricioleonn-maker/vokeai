-- Quick SQL Migration for AI Memory System
-- Copy and paste this into DBeaver/pgAdmin SQL Editor and execute

-- 1. Add business profile columns to Tenant
ALTER TABLE "Tenant" 
  ADD COLUMN IF NOT EXISTS "businessSector" TEXT,
  ADD COLUMN IF NOT EXISTS "businessType" TEXT,
  ADD COLUMN IF NOT EXISTS "companySize" TEXT,
  ADD COLUMN IF NOT EXISTS "targetAudience" TEXT,
  ADD COLUMN IF NOT EXISTS "productsServices" JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "glossary" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "brandVoice" JSONB DEFAULT '{}';

-- 2. Create KnowledgeFact table
CREATE TABLE IF NOT EXISTS "KnowledgeFact" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "entity" TEXT,
    "fact" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "source" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_type_idx" ON "KnowledgeFact"("tenantId", "type");
CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_entity_idx" ON "KnowledgeFact"("tenantId", "entity");
CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_active_idx" ON "KnowledgeFact"("tenantId", "active");

-- 3. Create UserProfile table
CREATE TABLE IF NOT EXISTS "UserProfile" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
    "tenantId" TEXT NOT NULL,
    "preferences" JSONB DEFAULT '{}',
    "interests" TEXT[] DEFAULT '{}',
    "sentiment" TEXT DEFAULT 'neutral',
    "lastIntent" TEXT,
    "lastTopic" TEXT,
    "lastAgentUsed" TEXT,
    "demographics" JSONB DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create ConversationEmbedding table
CREATE TABLE IF NOT EXISTS "ConversationEmbedding" (
    "id" TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "turnId" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "summary" TEXT,
    "embedding" DOUBLE PRECISION[] NOT NULL,
    "agentUsed" TEXT,
    "channel" TEXT,
    "intent" TEXT,
    "sentiment" TEXT,
    "topics" TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_userId_idx" ON "ConversationEmbedding"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "ConversationEmbedding_conversationId_idx" ON "ConversationEmbedding"("conversationId");
CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_intent_idx" ON "ConversationEmbedding"("tenantId", "intent");

-- 5. Create BusinessRule table
CREATE TABLE IF NOT EXISTS "BusinessRule" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "conditions" JSONB DEFAULT '{}',
    "action" TEXT NOT NULL,
    "payload" JSONB DEFAULT '{}',
    "appliesTo" TEXT[] DEFAULT '{}',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "BusinessRule_tenantId_active_idx" ON "BusinessRule"("tenantId", "active");
CREATE INDEX IF NOT EXISTS "BusinessRule_tenantId_trigger_idx" ON "BusinessRule"("tenantId", "trigger");

-- Verify tables were created
SELECT 
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ Success! All 4 tables created'
        ELSE '⚠️ Only ' || COUNT(*) || ' tables created (expected 4)'
    END as status
FROM information_schema.tables 
WHERE table_name IN ('KnowledgeFact', 'UserProfile', 'ConversationEmbedding', 'BusinessRule');
