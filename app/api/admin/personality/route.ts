import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get tenantId from session or query param
  const tenantId = (session.user as any).tenantId;

  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiPersonality: true }
    });

    return NextResponse.json(tenant?.aiPersonality || {});
  } catch (error) {
    console.error('Error fetching personality:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = (session.user as any).tenantId;
  const body = await req.json();

  try {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        aiPersonality: body
      }
    });

    return NextResponse.json(updated.aiPersonality);
  } catch (error) {
    console.error('Error saving personality:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
