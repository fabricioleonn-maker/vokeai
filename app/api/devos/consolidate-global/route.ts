import { NextResponse } from 'next/server';
import { GlobalKnowledgeMiner } from '@/lib/devos/v3/global-knowledge-miner';

export async function POST(req: Request) {
  // Simple check for internal/cron security
  const authHeader = req.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && !authHeader?.includes(process.env.DEVOS_INTERNAL_KEY || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const result = await GlobalKnowledgeMiner.consolidate();
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Global consolidation complete',
      processedPatterns: result.processed,
      insightsUpdated: result.updated,
      durationMs: duration,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[DevOS-Global-Consolidator] Failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
