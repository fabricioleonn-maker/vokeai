// Simple JavaScript migration - no TypeScript compilation needed
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function migrate() {
    console.log('🚀 Applying migration...\n');

    const steps = [
        ['Adding Tenant.businessSector', `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "businessSector" TEXT`],
        ['Adding Tenant.businessType', `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "businessType" TEXT`],
        ['Adding Tenant.companySize', `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "companySize" TEXT`],
        ['Adding Tenant.targetAudience', `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "targetAudience" TEXT`],
        ['Adding Tenant.productsServices', `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "productsServices" JSONB DEFAULT '[]'::jsonb`],
        ['Adding Tenant.glossary', `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "glossary" JSONB DEFAULT '{}'::jsonb`],
        ['Adding Tenant.brandVoice', `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "brandVoice" JSONB DEFAULT '{}'::jsonb`],
        ['Creating KnowledgeFact table', `
      CREATE TABLE IF NOT EXISTS "KnowledgeFact" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenantId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "category" TEXT,
        "entity" TEXT,
        "fact" TEXT NOT NULL,
        "metadata" JSONB DEFAULT '{}',
        "source" TEXT,
        "confidence" DOUBLE PRECISION DEFAULT 0.5,
        "active" BOOLEAN DEFAULT true,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`],
        ['Creating UserProfile table', `
      CREATE TABLE IF NOT EXISTS "UserProfile" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL UNIQUE,
        "tenantId" TEXT NOT NULL,
        "preferences" JSONB DEFAULT '{}',
        "interests" TEXT[] DEFAULT '{}',
        "sentiment" TEXT DEFAULT 'neutral',
        "lastIntent" TEXT,
        "lastTopic" TEXT,
        "lastAgentUsed" TEXT,
        "demographics" JSONB DEFAULT '{}',
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`],
        ['Creating ConversationEmbedding table', `
      CREATE TABLE IF NOT EXISTS "ConversationEmbedding" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`],
        ['Creating BusinessRule table', `
      CREATE TABLE IF NOT EXISTS "BusinessRule" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenantId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "trigger" TEXT NOT NULL,
        "conditions" JSONB DEFAULT '{}',
        "action" TEXT NOT NULL,
        "payload" JSONB DEFAULT '{}',
        "appliesTo" TEXT[] DEFAULT '{}',
        "priority" INTEGER DEFAULT 0,
        "active" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`],
    ];

    let ok = 0, skip = 0, fail = 0;

    for (let i = 0; i < steps.length; i++) {
        const [name, sql] = steps[i];
        try {
            process.stdout.write(`[${i + 1}/${steps.length}] ${name}...`);
            await prisma.$executeRawUnsafe(sql);
            console.log(' ✅');
            ok++;
        } catch (e) {
            if (e.message && (e.message.includes('already exists') || e.message.includes('duplicate'))) {
                console.log(' ⚠️');
                skip++;
            } else {
                console.log(` ❌ ${e.message}`);
                fail++;
            }
        }
    }

    console.log(`\n✅ ${ok} applied | ⚠️  ${skip} skipped | ❌ ${fail} failed\n`);

    // Check tables
    const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('KnowledgeFact', 'UserProfile', 'ConversationEmbedding', 'BusinessRule')
  `;

    console.log(`Found ${tables.length}/4 tables`);

    if (tables.length === 4) {
        console.log('\n🎉 SUCCESS! Run: npx prisma generate\n');
    }

    await prisma.$disconnect();
}

migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
