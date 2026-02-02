import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export type UsageState = 'NORMAL' | 'WARNING' | 'EXHAUSTED';

export interface QuotaStatus {
    allowed: boolean;
    state: UsageState;
    usageRatio: number;
    monthlyLimit: number;
    totalUsed: number;
    extraBalance: number;
}

/**
 * Advanced Usage Service - Handles token reservation, auditing by purpose,
 * and SaaS lifecycle states (Normal, Warning, Exhausted).
 */
export const UsageService = {
    /**
     * Returns current usage status for a tenant with SaaS lifecycle states.
     */
    async getQuotaStatus(tenantId: string, limits: any): Promise<QuotaStatus> {
        const tenant = await (prisma.tenant as any).findUnique({
            where: { id: tenantId },
            select: { aiTokensUsedMonthly: true, aiTokensExtraBalance: true, aiTokensReserved: true }
        });

        if (!tenant) {
            return { allowed: false, state: 'EXHAUSTED', usageRatio: 0, monthlyLimit: 0, totalUsed: 0, extraBalance: 0 };
        }

        const monthlyLimit = (limits?.aiTokensIncluded as number) || 50000;
        const used = tenant.aiTokensUsedMonthly || 0;
        const reserved = tenant.aiTokensReserved || 0;
        const extra = tenant.aiTokensExtraBalance || 0;

        // Total effective usage includes both permanent debt and temporary reservations
        const effectiveUsage = used + reserved;
        const totalCapacity = monthlyLimit + extra;
        const usageRatio = totalCapacity > 0 ? (used / totalCapacity) : 1;

        let state: UsageState = 'NORMAL';
        if (used >= totalCapacity) {
            state = 'EXHAUSTED';
        } else if (usageRatio >= 0.8) {
            state = 'WARNING';
        }

        return {
            allowed: effectiveUsage < totalCapacity,
            state,
            usageRatio,
            monthlyLimit,
            totalUsed: used,
            extraBalance: extra
        };
    },

    /**
     * Cost Protection: Reserves estimated tokens before triggering an LLM call.
     * Ensures budget exists for the request to avoid concurrent overflows.
     */
    async reserveTokens(tenantId: string, estimatedAmount: number = 2000): Promise<boolean> {
        // 1. Fetch current status
        const tenant = await (prisma.tenant as any).findUnique({
            where: { id: tenantId },
            select: { aiTokensUsedMonthly: true, aiTokensExtraBalance: true, aiTokensReserved: true, planId: true }
        });

        if (!tenant) return false;

        // Get limits (need to fetch plan if not provided, but usually available in context)
        // For simplicity, we assume the check matches getQuotaStatus logic
        const plan = await prisma.plan.findUnique({ where: { id: tenant.planId } });
        const limits = (plan?.limits as any) || {};
        const monthlyLimit = limits?.aiTokensIncluded || 50000;

        const used = tenant.aiTokensUsedMonthly || 0;
        const reserved = tenant.aiTokensReserved || 0;
        const totalCapacity = monthlyLimit + (tenant.aiTokensExtraBalance || 0);

        if (used + reserved + estimatedAmount > totalCapacity) {
            // Not enough room for reservation
            return false;
        }

        // 2. Increment reservation atomically
        await (prisma.tenant as any).update({
            where: { id: tenantId },
            data: { aiTokensReserved: { increment: estimatedAmount } }
        });

        return true;
    },

    /**
     * Records real usage and releases the temporary reservation.
     */
    async trackUsage(
        tenantId: string,
        userId: string | null,
        conversationId: string | null,
        model: string,
        usage: TokenUsage,
        purpose: string = 'general',
        reservedAmount: number = 2000
    ) {
        const { totalTokens } = usage;

        // Atomic transaction: Log + Debit + Release Reservation
        return await prisma.$transaction([
            // 1. Log detailed transaction for auditing
            (prisma as any).aIUsageLog.create({
                data: {
                    id: uuidv4(),
                    tenantId,
                    userId,
                    conversationId,
                    model,
                    promptTokens: usage.promptTokens,
                    completionTokens: usage.completionTokens,
                    totalTokens,
                    purpose
                }
            }),
            // 2. Update real usage and clear reservation
            (prisma.tenant as any).update({
                where: { id: tenantId },
                data: {
                    aiTokensUsedMonthly: { increment: totalTokens },
                    aiTokensReserved: { decrement: reservedAmount }
                }
            })
        ]);
    },

    /**
     * In case of LLM error, release the reserved tokens without debiting.
     */
    async releaseReservation(tenantId: string, reservedAmount: number = 2000) {
        return await (prisma.tenant as any).update({
            where: { id: tenantId },
            data: { aiTokensReserved: { decrement: reservedAmount } }
        });
    }
};
