import { prisma } from '@/lib/db';
import type { AuditEntry } from '@/lib/types';
import { Prisma } from '@prisma/client';

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: entry?.tenantId ?? '',
        userId: entry?.userId ?? null,
        agentSlug: entry?.agentSlug ?? null,
        action: entry?.action ?? 'unknown',
        entityType: entry?.entityType ?? 'unknown',
        entityId: entry?.entityId ?? null,
        before: entry?.before ? (entry.before as Prisma.InputJsonValue) : Prisma.JsonNull,
        after: entry?.after ? (entry.after as Prisma.InputJsonValue) : Prisma.JsonNull,
        metadata: entry?.metadata ? (entry.metadata as Prisma.InputJsonValue) : Prisma.JsonNull
      }
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

export async function getAuditLogs(
  tenantId: string,
  filters?: {
    userId?: string;
    agentSlug?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit = 100
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.agentSlug && { agentSlug: filters.agentSlug }),
      ...(filters?.action && { action: filters.action }),
      ...(filters?.entityType && { entityType: filters.entityType }),
      ...(filters?.startDate && { createdAt: { gte: filters.startDate } }),
      ...(filters?.endDate && { createdAt: { lte: filters.endDate } })
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { name: true, email: true } }
    }
  });

  return logs ?? [];
}
