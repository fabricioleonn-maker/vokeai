const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConnection() {
    try {
        console.log('Testing connection to database...');
        const result = await prisma.$queryRaw`SELECT 1 as result`;
        console.log('✅ Connection successful:', result);
    } catch (err) {
        console.error('❌ Connection failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
