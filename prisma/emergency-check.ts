/**
 * Emergency Fix: Bypass migration issues temporarily
 * This removes dependency on new schema fields until migration is applied
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function emergencyFix() {
    console.log('🚨 Running emergency compatibility check...\n');

    try {
        // Test 1: Can we connect to database?
        console.log('1️⃣ Testing database connection...');
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connected\n');

        // Test 2: Can we query Tenant table?
        console.log('2️⃣ Testing Tenant query...');
        const tenantCount = await prisma.tenant.count();
        console.log(`✅ Found ${tenantCount} tenants\n`);

        // Test 3: Check if new columns exist
        console.log('3️⃣ Checking if new columns exist...');
        const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Tenant' 
        AND column_name IN ('businessSector', 'businessType', 'companySize')
    `;

        if (result.length === 0) {
            console.log('❌ New columns NOT found - Migration NOT applied');
            console.log('\n🔧 SOLUTION:');
            console.log('   Option 1: Apply migration SQL (DBeaver)');
            console.log('   Option 2: Revert schema to old version');
            console.log('\n📋 For now, app will use fallback mode (limited features)\n');
        } else {
            console.log(`✅ Found ${result.length}/3 new columns - Migration partially/fully applied\n`);
        }

        // Test 4: Can we query conversations?
        console.log('4️⃣ Testing Conversation query...');
        const convCount = await prisma.conversation.count();
        console.log(`✅ Found ${convCount} conversations\n`);

        // Test 5: Check orchestrator
        console.log('5️⃣ Testing orchestrator availability...');
        const { processMessage } = await import('../lib/agents/orchestrator');
        console.log('✅ Orchestrator loaded\n');

        console.log('✅ Emergency check complete!\n');

    } catch (error: any) {
        console.error('❌ Emergency check failed:', error.message);
        console.error('\nThis indicates a serious configuration issue.');
        console.error('Check DATABASE_URL in .env file.\n');
    } finally {
        await prisma.$disconnect();
    }
}

emergencyFix();
