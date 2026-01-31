/**
 * Simple migration applicator using Prisma connection
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log('🚀 Applying AI Memory System migration...\n');

    try {
        // 1. Add columns to Tenant
        console.log('1️⃣ Adding business profile columns to Tenant...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "businessSector" TEXT,
                            ADD COLUMN IF NOT EXISTS "businessType" TEXT,
                            ADD COLUMN IF NOT EXISTS "companySize" TEXT,
                            ADD COLUMN IF NOT EXISTS "targetAudience" TEXT,
                            ADD COLUMN IF NOT EXISTS "productsServices" JSONB DEFAULT '[]',
                            ADD COLUMN IF NOT EXISTS "glossary" JSONB DEFAULT '{}',
                            ADD COLUMN IF NOT EXISTS "brandVoice" JSONB DEFAULT '{}'
    `);
        console.log('✅ Tenant updated\n');

        // 2. Create KnowledgeFact
        console.log('2️⃣ Creating KnowledgeFact table...');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "KnowledgeFact" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
      )
    `);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_type_idx" ON "KnowledgeFact"("tenantId", "type")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_entity_idx" ON "KnowledgeFact"("tenantId", "entity")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_active_idx" ON "KnowledgeFact"("tenantId", "active")`);
        console.log('✅ KnowledgeFact created\n');

        // 3. Create UserProfile
        console.log('3️⃣ Creating UserProfile table...');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserProfile" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "tenantId" TEXT NOT NULL,
        "preferences" JSONB DEFAULT '{}',
        "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "sentiment" TEXT DEFAULT 'neutral',
        "lastIntent" TEXT,
        "lastTopic" TEXT,
        "lastAgentUsed" TEXT,
        "demographics" JSONB DEFAULT '{}',
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )
    `);
        console.log('✅ UserProfile created\n');

        // 4. Create ConversationEmbedding
        console.log('4️⃣ Creating ConversationEmbedding table...');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ConversationEmbedding" (
        "id" TEXT NOT NULL PRIMARY KEY,
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
        "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_userId_idx" ON "ConversationEmbedding"("tenantId", "userId")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConversationEmbedding_conversationId_idx" ON "ConversationEmbedding"("conversationId")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_intent_idx" ON "ConversationEmbedding"("tenantId", "intent")`);
        console.log('✅ ConversationEmbedding created\n');

        // 5. Create BusinessRule
        console.log('5️⃣ Creating BusinessRule table...');
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BusinessRule" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "trigger" TEXT NOT NULL,
        "conditions" JSONB DEFAULT '{}',
        "action" TEXT NOT NULL,
        "payload" JSONB DEFAULT '{}',
        "appliesTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "priority" INTEGER NOT NULL DEFAULT 0,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
      )
    `);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BusinessRule_tenantId_active_idx" ON "BusinessRule"("tenantId", "active")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BusinessRule_tenantId_trigger_idx" ON "BusinessRule"("tenantId", "trigger")`);
        console.log('✅ BusinessRule created\n');

        console.log('🎉 Migration completed successfully!\n');

    } catch (error: any) {
        if (error.message.includes('already exists')) {
            console.log('⚠️  Tables already exist - migration may have been applied before\n');
        } else {
            console.error('❌ Migration failed:', error.message);
            throw error;
        }
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
