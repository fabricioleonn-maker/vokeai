import { prisma } from '../db';
import { AuditActor } from './types';

interface LogInput {
  sessionId: string;
  taskId?: string;
  actor: AuditActor;
  action: string;
  target?: string;
  input?: any;
  output?: any;
  status?: 'success' | 'error' | 'skipped';
  reason?: string;
  tokensUsed?: number;
  durationMs?: number;
}

export const DevOsAuditService = {
  async log(data: LogInput) {
    try {
      await prisma.devOsAuditLog.create({
        data: {
          sessionId: data.sessionId,
          taskId: data.taskId,
          actor: data.actor,
          action: data.action,
          target: data.target,
          input: (data.input ?? {}) as any,
          output: (data.output ?? {}) as any,
          status: data.status ?? 'success',
          reason: data.reason,
          tokensUsed: data.tokensUsed,
          durationMs: data.durationMs
        }
      });
    } catch (e) {
      console.error('[DevOsAudit] Failed to write log:', e);
    }
  },

  async getForSession(sessionId: string, limit = 100) {
    return prisma.devOsAuditLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
};
