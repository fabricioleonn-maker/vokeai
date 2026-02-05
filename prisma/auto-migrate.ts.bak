/**
 * Fixed auto-migration with dotenv
 */

require('dotenv').config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
    console.log('🚀 Applying AI Memory System Migration...\n');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL not found in environment');
        console.error('   Make sure .env file exists and contains DATABASE_URL\n');
        process.exit(1);
    }

    console.log('✅ Database URL loaded\n');

    const migrations = [
        {
            name: '1. Add businessSector column',
            sql: `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "businessSector" TEXT`
        },
        {
            name: '2. Add businessType column',
            sql: `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "businessType" TEXT`
        },
        {
            name: '3. Add companySize column',
            sql: `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "companySize" TEXT`
        },
        {
            name: '4. Add targetAudience column',
            sql: `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "targetAudience" TEXT`
        },
        {
            name: '5. Add productsServices column',
            sql: `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "productsServices" JSONB DEFAULT '[]'`
        },
        {
            name: '6. Add glossary column',
            sql: `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "glossary" JSONB DEFAULT '{}'`
        },
        {
            name: '7. Add brandVoice column',
            sql: `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "brandVoice" JSONB DEFAULT '{}'`
        },
        {
            name: '8. Create KnowledgeFact table',
            sql: `CREATE TABLE IF NOT EXISTS "KnowledgeFact" (
        "id" TEXT PRIMARY KEY,
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
        },
        {
            name: '9. Add KnowledgeFact foreign key',
            sql: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeFact_tenantId_fkey') THEN
          ALTER TABLE "KnowledgeFact" ADD CONSTRAINT "KnowledgeFact_tenantId_fkey" 
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
        END IF;
      END $$`
        },
        {
            name: '10. Create KnowledgeFact type index',
            sql: `CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_type_idx" ON "KnowledgeFact"("tenantId", "type")`
        },
        {
            name: '11. Create KnowledgeFact entity index',
            sql: `CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_entity_idx" ON "KnowledgeFact"("tenantId", "entity")`
        },
        {
            name: '12. Create KnowledgeFact active index',
            sql: `CREATE INDEX IF NOT EXISTS "KnowledgeFact_tenantId_active_idx" ON "KnowledgeFact"("tenantId", "active")`
        },
        {
            name: '13. Create UserProfile table',
            sql: `CREATE TABLE IF NOT EXISTS "UserProfile" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "tenantId" TEXT NOT NULL,
        "preferences" JSONB DEFAULT '{}',
        "interests" TEXT[] DEFAULT '{}',
        "sentiment" TEXT DEFAULT 'neutral',
        "lastIntent" TEXT,
        "lastTopic" TEXT,
        "lastAgentUsed" TEXT,
        "demographics" JSONB DEFAULT '{}',
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
        },
        {
            name: '14. Add UserProfile foreign key',
            sql: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserProfile_userId_fkey') THEN
          ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
        END IF;
      END $$`
        },
        {
            name: '15. Create ConversationEmbedding table',
            sql: `CREATE TABLE IF NOT EXISTS "ConversationEmbedding" (
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
      )`
        },
        {
            name: '16. Create ConversationEmbedding user index',
            sql: `CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_userId_idx" ON "ConversationEmbedding"("tenantId", "userId")`
        },
        {
            name: '17. Create ConversationEmbedding conversation index',
            sql: `CREATE INDEX IF NOT EXISTS "ConversationEmbedding_conversationId_idx" ON "ConversationEmbedding"("conversationId")`
        },
        {
            name: '18. Create ConversationEmbedding intent index',
            sql: `CREATE INDEX IF NOT EXISTS "ConversationEmbedding_tenantId_intent_idx" ON "ConversationEmbedding"("tenantId", "intent")`
        },
        {
            name: '19. Create BusinessRule table',
            sql: `CREATE TABLE IF NOT EXISTS "BusinessRule" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
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
      )`
        },
        {
            name: '20. Add BusinessRule foreign key',
            sql: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessRule_tenantId_fkey') THEN
          ALTER TABLE "BusinessRule" ADD CONSTRAINT "BusinessRule_tenantId_fkey" 
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;
        END IF;
      END $$`
        },
        {
            name: '21. Create BusinessRule active index',
            sql: `CREATE INDEX IF NOT EXISTS "BusinessRule_tenantId_active_idx" ON "BusinessRule"("tenantId", "active")`
        },
        {
            name: '22. Create BusinessRule trigger index',
            sql: `CREATE INDEX IF NOT EXISTS "BusinessRule_tenantId_trigger_idx" ON "BusinessRule"("tenantId", "trigger")`
        }
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < migrations.length; i++) {
        const { name, sql } = migrations[i];

        try {
            process.stdout.write(`[${i + 1}/${migrations.length}] ${name}...`);
            await prisma.$executeRawUnsafe(sql);
            console.log(' ✅');
            successCount++;
        } catch (error: any) {
            if (error.message.includes('already exists') ||
                error.message.includes('duplicate')) {
                console.log(' ⚠️  (exists)');
                skipCount++;
            } else {
                console.log(` ❌ ${error.message.substring(0, 50)}`);
                errorCount++;
            }
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`📊 Migration Summary:`);
    console.log(`   ✅ Applied: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`═`.repeat(60) + '\n');

    // Verify
    const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('KnowledgeFact', 'UserProfile', 'ConversationEmbedding', 'BusinessRule')
    ORDER BY table_name
  `;

    console.log(`✅ Verified ${result.length}/4 tables:`);
    result.forEach(t => console.log(`   - ${t.table_name}`));

    if (result.length === 4) {
        console.log('\n🎉 MIGRATION SUCCESSFUL!\n');
        console.log('📝 Next steps:');
        console.log('   1. npx prisma generate');
        console.log('   2. Reload VSCode (Ctrl+Shift+P)');
        console.log('   3. Refresh browser');
        console.log('   4. Test chat!\n');
    }

    await prisma.$disconnect();
}

applyMigration().catch(console.error);
