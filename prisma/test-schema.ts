/**
 * Quick test to verify database schema
 */

import { prisma } from '../lib/db';

async function testSchema() {
    console.log('🔍 Testing database schema...\n');

    try {
        // Test 1: Check if new Tenant fields exist
        console.log('1️⃣ Testing Tenant business profile fields...');
        const tenant = await prisma.tenant.findFirst({
            select: {
                id: true,
                name: true,
                businessSector: true,
                businessType: true,
                companySize: true
            }
        });
        console.log('✅ Tenant fields accessible:', tenant ? 'Found tenant' : 'No tenants yet');

        // Test 2: Check KnowledgeFact table
        console.log('\n2️⃣ Testing KnowledgeFact table...');
        const factCount = await prisma.knowledgeFact.count();
        console.log(`✅ KnowledgeFact table exists. Current count: ${factCount}`);

        // Test 3: Check UserProfile table
        console.log('\n3️⃣ Testing UserProfile table...');
        const profileCount = await prisma.userProfile.count();
        console.log(`✅ UserProfile table exists. Current count: ${profileCount}`);

        // Test 4: Check ConversationEmbedding table
        console.log('\n4️⃣ Testing ConversationEmbedding table...');
        const embeddingCount = await prisma.conversationEmbedding.count();
        console.log(`✅ ConversationEmbedding table exists. Current count: ${embeddingCount}`);

        // Test 5: Check BusinessRule table
        console.log('\n5️⃣ Testing BusinessRule table...');
        const ruleCount = await prisma.businessRule.count();
        console.log(`✅ BusinessRule table exists. Current count: ${ruleCount}`);

        console.log('\n🎉 All schema tests passed! Database is ready.');

    } catch (error: any) {
        console.error('\n❌ Schema test failed:', error.message);
        console.error('\n💡 This likely means the migration was not applied yet.');
        console.error('   Run the SQL from: prisma/migrations/add_ai_memory_system.sql');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testSchema();
