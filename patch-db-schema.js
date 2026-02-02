const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applySchema() {
    try {
        console.log('Applying direct schema changes...');

        // Add columns to Tenant
        await prisma.$executeRaw`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "aiTokensUsedMonthly" INTEGER DEFAULT 0`;
        await prisma.$executeRaw`ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "aiTokensExtraBalance" INTEGER DEFAULT 0`;

        // Create AIUsageLog table
        await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AIUsageLog" (
        "id" TEXT PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "userId" TEXT,
        "conversationId" TEXT,
        "model" TEXT NOT NULL,
        "promptTokens" INTEGER NOT NULL,
        "completionTokens" INTEGER NOT NULL,
        "totalTokens" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AIUsageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
      )
    `;

        // Add index
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AIUsageLog_tenantId_createdAt_idx" ON "AIUsageLog"("tenantId", "createdAt")`;

        console.log('✅ Schema applied successfully!');
    } catch (err) {
        console.error('❌ Failed to apply schema:', err);
    } finally {
        await prisma.$disconnect();
    }
}

applySchema();
