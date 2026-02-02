
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fetchMockPromos } from '@/lib/agents/promo-hunter';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const queryId = params.id;
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Verify ownership
        const promoQuery = await prisma.promoQuery.findUnique({
            where: { id: queryId }
        });

        if (!promoQuery || promoQuery.userId !== user.id) {
            return NextResponse.json({ error: 'Query not found' }, { status: 404 });
        }

        // Run search
        // Using the first keyword as query for MVP
        const results = await fetchMockPromos(promoQuery.keywords[0]);

        // Save results
        const savedResults = await Promise.all(results.map(async (r) => {
            // Avoid duplicate insert if running frequently (check logic)
            // For MVP, simple insert
            return prisma.promoResult.create({
                data: {
                    queryId: promoQuery.id,
                    title: r.title,
                    price: r.price,
                    originalPrice: r.originalPrice,
                    discountPercent: r.discountPercent,
                    store: r.store,
                    url: r.url,
                    imageUrl: r.imageUrl,
                    verdict: 'good', // Mock verdict
                    score: 80
                }
            });
        }));

        return NextResponse.json({
            success: true,
            count: savedResults.length,
            results: savedResults
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
