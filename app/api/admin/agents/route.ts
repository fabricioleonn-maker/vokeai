export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const agents = await prisma.agentNode.findMany({
      include: {
        _count: {
          select: { tenantConfigs: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(agents?.map((a: any) => ({
      id: a?.id,
      slug: a?.slug,
      name: a?.name,
      description: a?.description,
      category: a?.category,
      status: a?.status,
      channelsSupported: a?.channelsSupported,
      intentsSupported: a?.intentsSupported,
      planConstraints: a?.planConstraints,
      behavior: a?.behavior,
      activeTenantsCount: a?._count?.tenantConfigs ?? 0
    })) ?? []);
  } catch (error) {
    console.error('Get agents error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar agentes' },
      { status: 500 }
    );
  }
}
