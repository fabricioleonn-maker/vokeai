export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      include: {
        _count: {
          select: { tenants: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(plans?.map(p => ({
      id: p?.id,
      // slug: p?.slug, // Missing in schema
      name: p?.name,
      description: p?.description,
      // tier: p?.tier, // Missing in schema
      limits: p?.limits,
      tenantsCount: p?._count?.tenants ?? 0
    })) ?? []);
  } catch (error) {
    console.error('Get plans error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar planos' },
      { status: 500 }
    );
  }
}
