export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getProvider, type WhatsAppCredentials } from '@/lib/integrations/whatsapp/providers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { provider, apiToken, phoneNumberId, accountSid, authToken } = body;

        const credentials: WhatsAppCredentials = {
            provider,
            apiToken,
            phoneNumberId,
            accountSid,
            authToken
        };

        // Get provider implementation
        const providerInstance = getProvider(provider);

        // Test connection
        const isValid = await providerInstance.testConnection(credentials);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Credenciais inválidas ou número não encontrado' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, provider });
    } catch (error: any) {
        console.error('Test WhatsApp error:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao testar conexão' },
            { status: 400 }
        );
    }
}
