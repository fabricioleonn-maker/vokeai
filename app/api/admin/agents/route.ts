export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { name, description, prompt, category } = body;

    // Gerar slug a partir do nome (ex: "Meu Agente" -> "meu-agente")
    const slug = `agent.${name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;

    // 1. Criar o Nó do Agente (Definição Global)
    const agent = await prisma.agentNode.create({
      data: {
        name,
        slug,
        description,
        category: category || 'custom',
        status: 'active', // Custom agents start active
        config: {
          channelsSupported: ['web', 'whatsapp'],
          intentsSupported: ['general'],
          behavior: { type: 'custom_prompt' },
          planConstraints: { min_plan_tier: 'free' } // Allow everyone to create for now
        }
      }
    });

    // 2. Se tiver tenantId na sessão, já vincula e habilita
    const tenantId = (session?.user as any)?.tenantId;
    if (tenantId) {
      await prisma.tenantAgentConfig.create({
        data: {
          tenantId,
          agentSlug: agent.slug,
          enabled: true,
          customPrompt: prompt || 'Você é um assistente útil.',
          behaviorOverride: { tone: 'friendly' }
        }
      });
    }

    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('Create agent error:', error);
    // Se duplicado, retorna erro amigável
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um agente com este nome.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao criar agente' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const agents = await prisma.agentNode.findMany({
      include: {
        _count: {
          select: { tenantConfigs: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(agents?.map((a: any) => ({
      id: a?.id,
      slug: a?.slug,
      name: a?.name,
      description: a?.description,
      category: a?.category,
      status: a?.status,
      channelsSupported: (a?.config as any)?.channelsSupported,
      intentsSupported: (a?.config as any)?.intentsSupported,
      planConstraints: (a?.config as any)?.planConstraints,
      behavior: (a?.config as any)?.behavior,
      activeTenantsCount: a?._count?.tenantConfigs ?? 0
    })) ?? []);
  } catch (error) {
    console.error('Get agents error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar agentes' },
      { status: 500 }
    );
  }
}
