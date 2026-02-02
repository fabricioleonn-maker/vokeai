export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/agents/orchestrator';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getProvider, type WhatsAppCredentials } from '@/lib/integrations/whatsapp/providers';
import { decrypt } from '@/lib/integrations/encryption';

// Webhook verification (usado por Meta e alguns BSPs)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // WhatsApp verification challenge
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'sistema_matriz_webhook_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// Receive messages from WhatsApp (any provider)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📱 WhatsApp webhook received:', JSON.stringify(body, null, 2));

    // Step 1: Detect provider and extract phone number ID
    const { provider, phoneNumberId } = await detectProvider(body, request);

    if (!provider || !phoneNumberId) {
      console.error('Could not detect provider or phone number');
      return NextResponse.json({ status: 'ok' }); // Return OK to avoid retries
    }

    console.log(`🔍 Detected provider: ${provider}, Phone: ${phoneNumberId}`);

    // Step 2: Get tenant config and credentials
    const tenantConfig = await getTenantConfig(phoneNumberId, provider);

    if (!tenantConfig) {
      console.error('No tenant config found for phone:', phoneNumberId);
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Step 3: Decrypt credentials
    const credentials: WhatsAppCredentials = tenantConfig.credentialsRef
      ? decrypt(tenantConfig.credentialsRef as string)
      : { provider: provider as any, phoneNumberId };

    // Step 4: Parse incoming message using provider
    const providerInstance = getProvider(provider as any);
    const parsedMessage = providerInstance.parseIncomingWebhook(body);

    if (!parsedMessage || !parsedMessage.text) {
      console.log('No text content in message, skipping');
      return NextResponse.json({ status: 'ok' });
    }

    console.log(`💬 Message from ${parsedMessage.from}: "${parsedMessage.text}"`);

    // Step 5: Find or create user
    const user = await findOrCreateWhatsAppUser(parsedMessage.from, tenantConfig.tenantId);

    // Step 6: Find or create conversation
    const conversation = await findOrCreateConversation(user.id, tenantConfig.tenantId);

    // Step 7: Process message through orchestrator
    const response = await processMessage(
      tenantConfig.tenantId,
      user.id,
      conversation.id,
      parsedMessage.text,
      'whatsapp'
    );

    // Step 8: Send response using provider
    if (response.message) {
      console.log(`🤖 Sending response: "${response.message.substring(0, 100)}..."`);
      await providerInstance.sendMessage(credentials, parsedMessage.from, response.message);
    }

    return NextResponse.json({
      status: 'ok',
      messageId: parsedMessage.messageId,
      response: response.message,
      agent: response.agentUsed,
      provider
    });

  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Detect which provider sent this webhook
async function detectProvider(body: any, request: NextRequest): Promise<{ provider: string | null, phoneNumberId: string | null }> {
  // Meta/WhatsApp Cloud API format
  if (body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id) {
    return {
      provider: 'meta',
      phoneNumberId: body.entry[0].changes[0].value.metadata.phone_number_id
    };
  }

  // Twilio format (form-encoded, but we receive as JSON after parsing)
  if (body.From && body.To && body.MessageSid) {
    const phoneNumber = body.To?.replace('whatsapp:', '');
    return {
      provider: 'twilio',
      phoneNumberId: phoneNumber
    };
  }

  // Zenvia format
  if (body.message && body.message.from && body.message.to) {
    return {
      provider: 'zenvia',
      phoneNumberId: body.message.to
    };
  }

  // Check custom header (opcional)
  const headerProvider = request.headers.get('x-whatsapp-provider');
  if (headerProvider) {
    return {
      provider: headerProvider,
      phoneNumberId: null // Will need to extract from body
    };
  }

  return { provider: null, phoneNumberId: null };
}

// Get tenant configuration by phone number and provider
async function getTenantConfig(phoneNumberId: string, provider: string) {
  if (!phoneNumberId) return null;

  // Search for integration config matching this phone number
  const configs = await prisma.tenantIntegrationConfig.findMany({
    where: {
      enabled: true,
      integrationSlug: {
        contains: 'whatsapp'
      }
    },
    select: {
      id: true,
      tenantId: true,
      config: true,
      integrationSlug: true
    }
  });

  for (const configItem of configs) {
    const settings = (configItem.config as any)?.syncSettings || {};
    const creds = (configItem.config as any)?.credentialsRef;

    // Attach to object for cleaner return (simulating flat structure)
    const enrichedConfig = {
      ...configItem,
      credentialsRef: creds,
      syncSettings: settings
    };

    const configProvider = settings?.provider;
    const configPhoneNumber = settings?.phone_number_id;

    // Match by phone number and optionally provider
    if (configPhoneNumber === phoneNumberId) {
      // If provider specified in config, must match
      if (configProvider && configProvider !== provider) {
        continue;
      }
      return enrichedConfig;
    }
  }

  return null;
}

// Find or create WhatsApp user
async function findOrCreateWhatsAppUser(phoneNumber: string, tenantId: string) {
  const email = `whatsapp_${phoneNumber}@whatsapp.local`;

  return prisma.user.upsert({
    where: { email },
    update: { tenantId },
    create: {
      email,
      name: `WhatsApp ${phoneNumber}`,
      tenantId,
      role: 'user',
      password: 'whatsapp-no-login',
    }
  });
}

// Find or create conversation
async function findOrCreateConversation(userId: string, tenantId: string) {
  // Look for existing active conversation (last 24 hours)
  const existing = await prisma.conversation.findFirst({
    where: {
      userId,
      tenantId,
      channel: 'whatsapp',
      updatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (existing) return existing;

  // Create new conversation
  return prisma.conversation.create({
    data: {
      id: uuidv4(),
      userId,
      tenantId,
      channel: 'whatsapp',
      status: 'active'
    }
  });
}
