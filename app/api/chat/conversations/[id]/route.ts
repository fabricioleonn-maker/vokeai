export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params?.id;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'ID da conversa é obrigatório' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        turns: {
          orderBy: { createdAt: 'asc' }
        },
        context: true
      }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: conversation?.id,
      channel: conversation?.channel,
      status: conversation?.status,
      createdAt: conversation?.createdAt,
      updatedAt: conversation?.updatedAt,
      turns: conversation?.turns?.map(t => ({
        id: t?.id,
        role: t?.role,
        content: t?.content,
        metadata: t?.metadata,
        createdAt: t?.createdAt
      })) ?? [],
      context: conversation?.context ? {
        summary: conversation.context?.summary,
        activeAgent: conversation.context?.activeAgent,
        pendingAction: conversation.context?.pendingAction
      } : null
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar conversa' },
      { status: 500 }
    );
  }
}
