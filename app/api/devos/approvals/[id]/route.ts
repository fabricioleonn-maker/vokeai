import { NextResponse } from 'next/server';
import { ApprovalService } from '@/lib/devos/approval/ApprovalService';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { action, reason, actor } = await request.json();
    const { id } = params;

    if (action === 'APPROVE') {
      await ApprovalService.approve(id, actor || 'system_admin', reason);
    } else if (action === 'REJECT') {
      await ApprovalService.reject(id, actor || 'system_admin', reason);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
