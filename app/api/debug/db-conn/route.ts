import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[DEBUG-DB] Testing connection...');

        // 1. Check if we can reach the DB
        const start = Date.now();
        await prisma.$connect();
        const connectTime = Date.now() - start;

        // 2. Simple query
        const agentsCount = await prisma.agentNode.count();
        const tenantsCount = await prisma.tenant.count();

        return NextResponse.json({
            status: 'ok',
            message: 'Database connection successful',
            diagnostics: {
                connectTimeMs: connectTime,
                counts: {
                    agents: agentsCount,
                    tenants: tenantsCount
                },
                env: {
                    hasDbUrl: !!process.env.DATABASE_URL,
                    nodeEnv: process.env.NODE_ENV
                }
            }
        });
    } catch (error: any) {
        console.error('[DEBUG-DB] Connection failed:', error);
        return NextResponse.json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        }, { status: 500 });
    }
}
