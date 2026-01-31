export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const [tenantsCount, activeTenantsCount, conversationsCount, agentsCount, auditLogsCount] = await prisma.$transaction([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'active' } }),
      prisma.conversation.count({ where: { status: 'active' } }),
      prisma.agentNode.count({ where: { status: 'active' } }),
      prisma.auditLog.count()
    ]);

    // Get recent activity
    const recentConversations = await prisma.conversation.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        tenant: { select: { name: true } }
      }
    });

    // Get agent usage stats
    const agentUsage = await prisma.auditLog.groupBy({
      by: ['agentSlug'],
      where: {
        agentSlug: { not: null },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      _count: true
    });

    return NextResponse.json({
      overview: {
        totalTenants: tenantsCount ?? 0,
        activeTenants: activeTenantsCount ?? 0,
        activeConversations: conversationsCount ?? 0,
        activeAgents: agentsCount ?? 0,
        totalAuditLogs: auditLogsCount ?? 0
      },
      recentActivity: recentConversations?.map(c => ({
        id: c?.id,
        tenantName: c?.tenant?.name,
        channel: c?.channel,
        updatedAt: c?.updatedAt
      })) ?? [],
      agentUsage: agentUsage?.map(a => ({
        agent: a?.agentSlug ?? 'unknown',
        count: a?._count ?? 0
      })) ?? []
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
