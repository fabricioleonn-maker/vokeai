import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getToken } from 'next-auth/jwt';

type AuthUser = { id: string; tenantId?: string };

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const authId = token.sub as string;

    const user = await prisma.user.findUnique({ where: { id: authId } });
    if (!user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const tasks = await prisma.devOsTask.findMany({
      where: { session: { tenantId: user.tenantId } },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          select: {
            objective: true,
            project: {
              select: { name: true }
            }
          }
        }
      }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Executions API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
