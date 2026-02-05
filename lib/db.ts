import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Diagnostic Log for DB URL (Safe subset)
const dbUrl = process.env.DATABASE_URL || '';
const dbHost = dbUrl.split('@')[1]?.split(':')[0] || 'unknown';
console.log(`[DB-INIT] Connecting to: ${dbHost}`);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn', 'query'], // Added 'query' for more logging
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
