export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // OPTIMIZED: Selective fields, limit, and active filter only
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        createdAt: true,
        plan: {
          select: {
            id: true,
            name: true,
            // tier: true // Missing in schema
          }
        }
      },
      where: {
        status: 'active' // Only active tenants
      },
      take: 100, // Limit to 100 most recent
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(tenants.map(t => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      plan: t.plan,
      createdAt: t.createdAt
    })));
  } catch (error) {
    console.error('Get tenants error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, name, planId } = body ?? {};

    if (!slug || !name) {
      return NextResponse.json(
        { error: 'Slug e nome são obrigatórios' },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.create({
      data: {
        slug,
        name,
        planId: planId ?? null,
        status: 'active'
      }
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Create tenant error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar tenant' },
      { status: 500 }
    );
  }
}
