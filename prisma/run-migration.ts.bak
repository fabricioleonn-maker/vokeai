/**
 * Run SQL migration programmatically
 */

import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
    const sql = readFileSync(
        join(__dirname, 'migrations', 'add_ai_memory_system.sql'),
        'utf-8'
    );

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL not found in environment');
        process.exit(1);
    }

    console.log('🔌 Connecting to database...');

    try {
        // Using raw node-postgres
        const { Client } = await import('pg');
        const client = new Client({ connectionString: DATABASE_URL });

        await client.connect();
        console.log('✅ Connected');

        console.log('🚀 Running migration...');
        await client.query(sql);

        console.log('✅ Migration completed successfully!');

        // Verify
        const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('KnowledgeFact', 'UserProfile', 'ConversationEmbedding', 'BusinessRule')
    `);

        console.log(`\n📊 Created tables: ${result.rows.map(r => r.table_name).join(', ')}`);

        await client.end();

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
