
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const queryId = searchParams.get('queryId');

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const whereClause: any = {
            query: {
                userId: user.id
            }
        };

        if (queryId) {
            whereClause.queryId = queryId;
        }

        const results = await prisma.promoResult.findMany({
            where: whereClause,
            orderBy: { detectedAt: 'desc' },
            take: 50,
            include: {
                query: {
                    select: { queryName: true }
                },
                source: {
                    select: { name: true }
                }
            }
        });

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
