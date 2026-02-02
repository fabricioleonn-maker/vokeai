
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
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const queries = await prisma.promoQuery.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                results: {
                    take: 5,
                    orderBy: { detectedAt: 'desc' }
                }
            }
        });

        return NextResponse.json(queries);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            queryName, keywords, minPrice, maxPrice,
            notifyChannels = ['whatsapp']
        } = body;

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const newQuery = await prisma.promoQuery.create({
            data: {
                userId: user.id,
                queryName: queryName || keywords[0],
                keywords: Array.isArray(keywords) ? keywords : [keywords],
                minPrice,
                maxPrice,
                notifyChannels,
                enabled: true
            }
        });

        return NextResponse.json(newQuery);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
