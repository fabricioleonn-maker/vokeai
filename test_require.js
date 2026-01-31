
try {
    const { PrismaClient } = require('@prisma/client');
    console.log('Import success');
    const prisma = new PrismaClient();
    console.log('Instantiation success');
} catch (e) {
    console.error('FAILED:', e);
}
