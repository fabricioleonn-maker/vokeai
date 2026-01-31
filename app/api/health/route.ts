
import { NextResponse } from 'next/server';

export async function GET() {
    const report: any = {
        status: 'checking',
        timestamp: new Date().toISOString(),
        env: {
            hasDbUrl: !!process.env.DATABASE_URL,
            dbUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) : 'NONE'
        }
    };

    try {
        const { prisma } = await import('@/lib/db');
        report.prismaImported = true;

        const agents = await prisma.agentNode.findMany({ take: 1 });
        report.dbStatus = 'connected';
        report.agentsFound = agents.length;

        return NextResponse.json({ status: 'ok', report });
    } catch (err: any) {
        return NextResponse.json({
            status: 'error',
            report,
            error: err.message,
            stack: err.stack,
            prismaVersion: err.clientVersion
        }, { status: 200 });
    }
}
