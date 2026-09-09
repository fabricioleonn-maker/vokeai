import { NextResponse } from 'next/server';
import { ApprovalService } from '@/lib/devos/approval/ApprovalService';

export async function GET() {
  try {
    const pending = await ApprovalService.listPending();
    return NextResponse.json(pending);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
