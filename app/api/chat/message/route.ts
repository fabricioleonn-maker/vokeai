export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processMessage } from '@/lib/agents/orchestrator';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const {
      message,
      conversationId,
      tenantId: bodyTenantId,
      channel = 'web',
      isTestMode = false
    } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    const tenantId = ((session?.user as { tenantId?: string })?.tenantId ?? bodyTenantId) as string;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    // Get userId from session or find/create demo user for the tenant
    let userId = (session?.user as { id?: string })?.id;

    if (!userId) {
      // Find or create a demo user for unauthenticated access
      const demoEmail = isTestMode ? `test-${tenantId}@sistemamatriz.local` : `demo-${tenantId}@sistemamatriz.local`;
      const demoUser = await prisma.user.upsert({
        where: { email: demoEmail },
        update: {},
        create: {
          email: demoEmail,
          name: isTestMode ? 'Tester' : 'Demo User',
          tenantId,
          role: 'user',
          password: 'demo-no-login',
        }
      });
      userId = demoUser.id;
    }

    const convId = conversationId ?? uuidv4();

    const response = await processMessage(
      tenantId,
      userId as string,
      convId as string,
      message,
      channel,
      isTestMode
    );

    return NextResponse.json({
      ...response,
      conversationId: convId
    });
  } catch (error: any) {
    console.error('Chat message error:', error);
    return NextResponse.json(
      {
        error: 'Erro ao processar mensagem',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
