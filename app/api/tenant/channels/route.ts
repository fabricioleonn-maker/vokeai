export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's tenant
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { tenantId: true }
        });

        if (!user?.tenantId) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // Get all integration configs for this tenant
        const configs = await prisma.tenantIntegrationConfig.findMany({
            where: { tenantId: user.tenantId },
            select: {
                id: true,
                integrationSlug: true,
                enabled: true,
                config: true,
                createdAt: true
            }
        });

        // Map to channel format
        const channels = configs
            .filter(c => c.integrationSlug.includes('whatsapp') || c.integrationSlug.includes('instagram'))
            .map(c => {
                const settings = (c.config as any)?.syncSettings || {};
                const type = c.integrationSlug.includes('whatsapp') ? 'whatsapp' : 'instagram';

                return {
                    type,
                    provider: settings?.provider || null,
                    status: c.enabled ? 'connected' : 'disconnected',
                    phoneNumberId: settings?.phone_number_id,
                    connectedAt: c.createdAt.toISOString()
                };
            });

        return NextResponse.json(channels);
    } catch (error) {
        console.error('Get channels error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar canais' },
            { status: 500 }
        );
    }
}
