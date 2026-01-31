
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Lazy load prisma to identify if import is the cause
        const { prisma } = await import('@/lib/db');
        const count = await prisma.agentNode.count();
        return NextResponse.json({
            status: 'ok',
            agentsInDB: count
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error_caught',
            message: error.message || 'Unknown',
            errorType: typeof error
        }, { status: 200 });
    }
}
