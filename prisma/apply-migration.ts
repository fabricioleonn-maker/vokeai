/**
 * Apply AI Memory System migration using raw SQL
 */

import { prisma } from '../lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
    console.log('🚀 Applying AI Memory System migration...\n');

    try {
        const sqlPath = join(__dirname, 'migrations', 'add_ai_memory_system.sql');
        const sql = readFileSync(sqlPath, 'utf-8');

        // Split SQL into individual statements (simple split by semicolon)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.includes('DO $$'));

        console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // Skip comments and empty lines
            if (statement.startsWith('--') || statement.length < 10) {
                continue;
            }

            try {
                console.log(`⏳ [${i + 1}/${statements.length}] Executing...`);
                await prisma.$executeRawUnsafe(statement);
                console.log(`✅ Success`);
            } catch (error: any) {
                // Ignore "already exists" errors
                if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                    console.log(`⚠️  Already exists (skipping)`);
                } else {
                    console.error(`❌ Failed:`, error.message);
                    throw error;
                }
            }
        }

        console.log('\n🎉 Migration completed successfully!\n');

        // Verify tables were created
        console.log('🔍 Verifying schema...');

        const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('KnowledgeFact', 'UserProfile', 'ConversationEmbedding', 'BusinessRule')
      ORDER BY table_name
    `;

        console.log(`✅ Created tables (${tables.length}/4):`);
        tables.forEach(t => console.log(`   - ${t.table_name}`));

        if (tables.length === 4) {
            console.log('\n✨ All tables created successfully!');
            console.log('\n📝 Next step: Run seed data');
            console.log('   npx tsx prisma/seed-memory.ts');
        } else {
            console.log(`\n⚠️  Warning: Expected 4 tables, found ${tables.length}`);
        }

    } catch (error: any) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

applyMigration();
