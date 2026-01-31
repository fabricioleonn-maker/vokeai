export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit/audit-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params?.id },
      include: {
        plan: true,
        agentConfigs: {
          include: { agent: true }
        },
        integrationConfigs: {
          include: { integration: true }
        },
        _count: {
          select: {
            users: true,
            conversations: true,
            calendarEvents: true,
            financialTxns: true
          }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...tenant,
      stats: tenant?._count
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar tenant' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, status, planId } = body ?? {};

    const before = await prisma.tenant.findUnique({
      where: { id: params?.id }
    });

    const tenant = await prisma.tenant.update({
      where: { id: params?.id },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(planId !== undefined && { planId })
      }
    });

    await logAudit({
      tenantId: params?.id ?? '',
      action: 'update_tenant',
      entityType: 'tenant',
      entityId: params?.id,
      before: before as Record<string, unknown>,
      after: tenant as unknown as Record<string, unknown>
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Update tenant error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar tenant' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params?.id },
      include: {
        _count: {
          select: { users: true, conversations: true }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant não encontrado' },
        { status: 404 }
      );
    }

    // Delete related records first
    await prisma.tenantAgentConfig.deleteMany({ where: { tenantId: params?.id } });
    await prisma.tenantIntegrationConfig.deleteMany({ where: { tenantId: params?.id } });
    await prisma.conversationContext.deleteMany({
      where: { conversation: { tenantId: params?.id } }
    });
    await prisma.conversationTurn.deleteMany({
      where: { conversation: { tenantId: params?.id } }
    });
    await prisma.conversation.deleteMany({ where: { tenantId: params?.id } });
    await prisma.calendarEvent.deleteMany({ where: { tenantId: params?.id } });
    await prisma.financialTransaction.deleteMany({ where: { tenantId: params?.id } });
    await prisma.auditLog.deleteMany({ where: { tenantId: params?.id } });
    await prisma.user.deleteMany({ where: { tenantId: params?.id } });

    // Finally delete the tenant
    await prisma.tenant.delete({ where: { id: params?.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete tenant error:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir tenant' },
      { status: 500 }
    );
  }
}
