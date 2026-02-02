export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const agentSlug = searchParams.get('agentSlug');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(tenantId && { tenantId }),
        ...(agentSlug && { agentSlug }),
        ...(action && { action })
      },
      include: {
        user: { select: { name: true, email: true } },
        tenant: { select: { name: true, slug: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json(logs?.map((l: any) => ({
      id: l?.id,
      tenantId: l?.tenantId,
      tenantName: l?.tenant?.name,
      userId: l?.userId,
      userName: l?.user?.name ?? l?.user?.email,
      agentSlug: l?.agentSlug,
      action: l?.action,
      entityType: l?.entityType,
      entityId: l?.entityId,
      before: l?.before,
      after: l?.after,
      createdAt: l?.createdAt
    })) ?? []);
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar logs de auditoria' },
      { status: 500 }
    );
  }
}
