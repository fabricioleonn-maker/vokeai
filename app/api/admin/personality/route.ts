import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit/audit-service';
import type { AIPersonality } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        aiPersonality: true
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }

    // Default personality if none exists
    const defaultPersonality: AIPersonality = {
      voiceTone: 'friendly',
      communicationStyle: 'consultive',
      personalityInstructions: '',
      positiveExamples: [],
      negativeExamples: [],
      businessContext: '',
      customGreeting: '',
      situationHandlers: {}
    };

    const personality = tenant.aiPersonality && typeof tenant.aiPersonality === 'object'
      ? { ...defaultPersonality, ...(tenant.aiPersonality as object) }
      : defaultPersonality;

    return NextResponse.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      personality
    });

  } catch (error) {
    console.error('Error fetching personality:', error);
    return NextResponse.json({ error: 'Erro ao carregar personalidade' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, personality } = body;

    if (!tenantId || !personality) {
      return NextResponse.json({ error: 'tenantId e personality são obrigatórios' }, { status: 400 });
    }

    // Get current tenant for audit
    const currentTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiPersonality: true }
    });

    if (!currentTenant) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }

    // Update personality
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        aiPersonality: personality,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        aiPersonality: true
      }
    });

    // Log audit
    await logAudit({
      tenantId,
      action: 'ai_personality_updated',
      entityType: 'tenant',
      entityId: tenantId,
      before: currentTenant.aiPersonality as Record<string, unknown> | undefined,
      after: personality
    });

    return NextResponse.json({
      success: true,
      tenantId: updatedTenant.id,
      personality: updatedTenant.aiPersonality
    });

  } catch (error) {
    console.error('Error updating personality:', error);
    return NextResponse.json({ error: 'Erro ao salvar personalidade' }, { status: 500 });
  }
}
