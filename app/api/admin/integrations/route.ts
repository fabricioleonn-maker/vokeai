export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const integrations = await prisma.integrationNode.findMany({
      include: {
        _count: {
          select: { tenantConfigs: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(integrations?.map(i => ({
      id: i?.id,
      slug: i?.slug,
      name: i?.name,
      description: i?.description,
      type: i?.type,
      capabilities: i?.capabilities,
      supportedAgents: i?.supportedAgents,
      planConstraints: i?.planConstraints,
      syncStrategy: i?.syncStrategy,
      activeTenantsCount: i?._count?.tenantConfigs ?? 0
    })) ?? []);
  } catch (error) {
    console.error('Get integrations error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar integrações' },
      { status: 500 }
    );
  }
}
