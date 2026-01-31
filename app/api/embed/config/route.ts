export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true
      }
    });
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    
    // For now, use default settings - can be extended with a settings table later
    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      primaryColor: '#06B6D4',
      welcomeMessage: 'Olá! Como posso ajudar?',
      botName: tenant.name
    });
  } catch (error) {
    console.error('Embed config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
