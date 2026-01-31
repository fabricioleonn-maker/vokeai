/**
 * WhatsApp Provider Abstraction Layer
 * Supports multiple BSPs (Zenvia, Twilio) and Meta direct integration
 */

export interface WhatsAppCredentials {
    provider: 'zenvia' | 'twilio' | 'meta';
    apiToken?: string;
    phoneNumberId?: string;
    accountSid?: string;
    authToken?: string;
    accessToken?: string;
    appSecret?: string;
}

export interface ParsedMessage {
    from: string;
    to: string;
    text: string;
    timestamp: Date;
    messageId: string;
    type: 'text' | 'button' | 'interactive' | 'image' | 'document';
    metadata?: Record<string, any>;
}

export interface WhatsAppProvider {
    /**
     * Test if credentials are valid
     */
    testConnection(credentials: WhatsAppCredentials): Promise<boolean>;

    /**
     * Send a text message
     */
    sendMessage(credentials: WhatsAppCredentials, to: string, message: string): Promise<void>;

    /**
     * Parse incoming webhook payload
     */
    parseIncomingWebhook(body: any): ParsedMessage | null;

    /**
     * Verify webhook signature (security)
     */
    verifyWebhook(body: any, signature: string, secret: string): boolean;
}

/**
 * Zenvia Provider Implementation
 */
export class ZenviaProvider implements WhatsAppProvider {
    async testConnection(credentials: WhatsAppCredentials): Promise<boolean> {
        try {
            const response = await fetch('https://api.zenvia.com/v2/channels', {
                method: 'GET',
                headers: {
                    'X-API-TOKEN': credentials.apiToken!,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return false;

            const data = await response.json();
            return data.some((channel: any) => channel.phoneNumber === credentials.phoneNumberId);
        } catch {
            return false;
        }
    }

    async sendMessage(credentials: WhatsAppCredentials, to: string, message: string): Promise<void> {
        const response = await fetch('https://api.zenvia.com/v2/channels/whatsapp/messages', {
            method: 'POST',
            headers: {
                'X-API-TOKEN': credentials.apiToken!,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: credentials.phoneNumberId,
                to: to,
                contents: [{ type: 'text', text: message }]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Zenvia send error: ${error}`);
        }
    }

    parseIncomingWebhook(body: any): ParsedMessage | null {
        try {
            // Zenvia webhook format
            const message = body.message;
            if (!message) return null;

            return {
                from: message.from,
                to: message.to,
                text: message.contents?.[0]?.text || '',
                timestamp: new Date(message.timestamp),
                messageId: message.id,
                type: message.contents?.[0]?.type || 'text',
                metadata: { channel: 'whatsapp', provider: 'zenvia' }
            };
        } catch {
            return null;
        }
    }

    verifyWebhook(body: any, signature: string, secret: string): boolean {
        // Zenvia doesn't use signature verification by default
        // Can be implemented if needed
        return true;
    }
}

/**
 * Twilio Provider Implementation
 */
export class TwilioProvider implements WhatsAppProvider {
    async testConnection(credentials: WhatsAppCredentials): Promise<boolean> {
        try {
            const authString = Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64');

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}.json`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authString}`
                }
            });

            return response.ok;
        } catch {
            return false;
        }
    }

    async sendMessage(credentials: WhatsAppCredentials, to: string, message: string): Promise<void> {
        const authString = Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64');

        const params = new URLSearchParams({
            From: `whatsapp:${credentials.phoneNumberId}`,
            To: `whatsapp:${to}`,
            Body: message
        });

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Twilio send error: ${error}`);
        }
    }

    parseIncomingWebhook(body: any): ParsedMessage | null {
        try {
            // Twilio uses form-encoded data
            return {
                from: body.From?.replace('whatsapp:', '') || '',
                to: body.To?.replace('whatsapp:', '') || '',
                text: body.Body || '',
                timestamp: new Date(),
                messageId: body.MessageSid || '',
                type: 'text',
                metadata: { channel: 'whatsapp', provider: 'twilio' }
            };
        } catch {
            return null;
        }
    }

    verifyWebhook(body: any, signature: string, secret: string): boolean {
        // Twilio signature verification
        // Implementation depends on auth token
        return true;
    }
}

/**
 * Meta Provider Implementation (Direct Cloud API)
 */
export class MetaProvider implements WhatsAppProvider {
    async testConnection(credentials: WhatsAppCredentials): Promise<boolean> {
        try {
            const response = await fetch(
                `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${credentials.accessToken}`
                    }
                }
            );

            return response.ok;
        } catch {
            return false;
        }
    }

    async sendMessage(credentials: WhatsAppCredentials, to: string, message: string): Promise<void> {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${credentials.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'text',
                    text: { body: message }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Meta send error: ${error}`);
        }
    }

    parseIncomingWebhook(body: any): ParsedMessage | null {
        try {
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const message = change?.value?.messages?.[0];

            if (!message) return null;

            return {
                from: message.from,
                to: change.value.metadata.phone_number_id,
                text: message.text?.body || message.button?.text || message.interactive?.button_reply?.title || '',
                timestamp: new Date(parseInt(message.timestamp) * 1000),
                messageId: message.id,
                type: message.type,
                metadata: {
                    channel: 'whatsapp',
                    provider: 'meta',
                    phoneNumberId: change.value.metadata.phone_number_id
                }
            };
        } catch {
            return null;
        }
    }

    verifyWebhook(body: any, signature: string, secret: string): boolean {
        // Meta uses X-Hub-Signature-256
        // Implementation needed for production
        return true;
    }
}

/**
 * Provider Factory
 */
export function getProvider(providerName: 'zenvia' | 'twilio' | 'meta'): WhatsAppProvider {
    switch (providerName) {
        case 'zenvia':
            return new ZenviaProvider();
        case 'twilio':
            return new TwilioProvider();
        case 'meta':
            return new MetaProvider();
        default:
            throw new Error(`Unknown provider: ${providerName}`);
    }
}
