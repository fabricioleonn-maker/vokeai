export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { encrypt } from '@/lib/integrations/encryption';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { provider, channelType, apiToken, phoneNumberId, accountSid, authToken } = body;

        // Get user's tenant
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { tenantId: true }
        });

        if (!user?.tenantId) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // Build credentials object for encryption
        const credentials: Record<string, any> = { provider };

        if (provider === 'zenvia') {
            credentials.api_token = apiToken;
            credentials.phone_number_id = phoneNumberId;
        } else if (provider === 'twilio') {
            credentials.account_sid = accountSid;
            credentials.auth_token = authToken;
            credentials.phone_number_id = phoneNumberId;
        }

        // Encrypt sensitive credentials
        const encryptedCredentials = encrypt(credentials);

        // Build sync settings (public metadata only)
        const syncSettings: Record<string, any> = {
            provider,
            phone_number_id: phoneNumberId,
            connected_at: new Date().toISOString()
        };

        // Save or update integration config
        const integrationSlug = `integration.${channelType}.${provider}`;

        await prisma.tenantIntegrationConfig.upsert({
            where: {
                tenantId_integrationSlug: {
                    tenantId: user.tenantId,
                    integrationSlug
                }
            },
            update: {
                enabled: true,
                config: {
                    credentialsRef: encryptedCredentials,
                    syncSettings
                },
                allowedAgents: ['agent.support.n1', 'agent.sales']
            },
            create: {
                tenantId: user.tenantId,
                integrationSlug,
                enabled: true,
                config: {
                    credentialsRef: encryptedCredentials,
                    syncSettings
                },
                allowedAgents: ['agent.support.n1', 'agent.sales']
            }
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                tenantId: user.tenantId,
                userId: session.user.email,
                action: 'channel_connected',
                entityType: 'channel',
                entityId: integrationSlug,
                metadata: { channelType, provider }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Connect WhatsApp error:', error);
        return NextResponse.json(
            { error: 'Erro ao conectar WhatsApp' },
            { status: 500 }
        );
    }
}
