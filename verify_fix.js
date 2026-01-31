
try {
    const { PrismaClient } = require('@prisma/client');
    console.log('SUCCESS: @prisma/client loaded');
    const prisma = new PrismaClient();
    console.log('SUCCESS: PrismaClient instantiated');
} catch (e) {
    console.error('FAILURE:', e);
    process.exit(1);
}
