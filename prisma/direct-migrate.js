/**
 * Direct PostgreSQL migration using node-postgres
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env manually
require('dotenv').config();

async function migrate() {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL not found in .env');
        process.exit(1);
    }

    console.log('🔌 Connecting to PostgreSQL...');
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        console.log('🚀 Applying AI Memory System migration...\n');

        // Migration SQL
        const migrations = [
            {
                name: 'Add business profile columns to Tenant',
                sql: `
          ALTER TABLE "Tenant" 
          ADD COLUMN IF NOT EXISTS "businessSector" TEXT,
          ADD COLUMN IF NOT EXISTS "businessType" TEXT,
          ADD COLUMN IF NOT EXISTS "companySize" TEXT,
          ADD COLUMN IF NOT EXISTS "targetAudience" TEXT,
          ADD COLUMN IF NOT EXISTS "productsServices" JSONB DEFAULT '[]',
          ADD COLUMN IF NOT EXISTS "glossary" JSONB DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS "brandVoice" JSONB DEFAULT '{}';
        `
            },
            {
                name: 'Create KnowledgeFact table',
                sql: `
          CREATE TABLE IF NOT EXISTS "KnowledgeFact" (
            "id" TEXT NOT NULL,
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
            CONSTRAINT "KnowledgeFact_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "KnowledgeFact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
          );
        `
            },
            {
                name: 'Create KnowledgeFact indexes',
                sql: `
          CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_type_idx" ON "KnowledgeFact"("tenantId", "type");
          CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_entity_idx" ON "KnowledgeFact"("tenantId", "entity");
          CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_active_idx" ON "KnowledgeFact"("tenantId", "active");
        `
            },
            {
                name: 'Create UserProfile table',
                sql: `
          CREATE TABLE IF NOT EXISTS "UserProfile" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "tenantId" TEXT NOT NULL,
            "preferences" JSONB DEFAULT '{}',
            "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
            "sentiment" TEXT DEFAULT 'neutral',
            "lastIntent" TEXT,
            "lastTopic" TEXT,
            "lastAgentUsed" TEXT,
            "demographics" JSONB DEFAULT '{}',
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "UserProfile_userId_key" UNIQUE ("userId"),
            CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
          );
        `
            },
            {
                name: 'Create ConversationEmbedding table',
                sql: `
          CREATE TABLE IF NOT EXISTS "ConversationEmbedding" (
            "id" TEXT NOT NULL,
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
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ConversationEmbedding_pkey" PRIMARY KEY ("id")
          );
        `
            },
            {
                name: 'Create ConversationEmbedding indexes',
                sql: `
          CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_userId_idx" ON "ConversationEmbedding"("tenantId", "userId");
          CREATE INDEX IF NOT EXISTS "ConversationEmbedding_conversationId_idx" ON "ConversationEmbedding"("conversationId");
          CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_intent_idx" ON "ConversationEmbedding"("tenantId", "intent");
        `
            },
            {
                name: 'Create BusinessRule table',
                sql: `
          CREATE TABLE IF NOT EXISTS "BusinessRule" (
            "id" TEXT NOT NULL,
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
            CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "BusinessRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
          );
        `
            },
            {
                name: 'Create BusinessRule indexes',
                sql: `
          CREATE INDEX IF NOT EXISTS "BusinessRule_tenantId_active_idx" ON "BusinessRule"("tenantId", "active");
          CREATE INDEX IF NOT EXISTS "BusinessRule_tenantId_trigger_idx" ON "BusinessRule"("tenantId", "trigger");
        `
            }
        ];

        for (let i = 0; i < migrations.length; i++) {
            const migration = migrations[i];
            console.log(`[${i + 1}/${migrations.length}] ${migration.name}...`);

            try {
                await client.query(migration.sql);
                console.log(`✅ Success\n`);
            } catch (error) {
                if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                    console.log(`⚠️  Already exists (skipping)\n`);
                } else {
                    throw error;
                }
            }
        }

        console.log('🎉 Migration completed successfully!\n');

        // Verify tables
        const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('KnowledgeFact', 'UserProfile', 'ConversationEmbedding', 'BusinessRule')
      ORDER BY table_name
    `);

        console.log(`✅ Verified tables (${result.rows.length}/4):`);
        result.rows.forEach(row => console.log(`   - ${row.table_name}`));

        if (result.rows.length === 4) {
            console.log('\n✨ All tables created successfully!');
            console.log('\n📝 Next steps:');
            console.log('   1. Regenerate Prisma Client: npx prisma generate');
            console.log('   2. Run seed data: npx tsx prisma/seed-memory.ts');
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n👋 Disconnected from database');
    }
}

migrate();
