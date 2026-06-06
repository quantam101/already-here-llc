import { NextResponse } from 'next/server';
import { getLevel4RuntimeSnapshot } from '@/lib/level4-resiliency';

export const runtime = 'nodejs';

export async function GET() {
  const level4 = getLevel4RuntimeSnapshot();

  return NextResponse.json({
    ok: level4.deadLetterDepth === 0,
    service: 'already-here-health',
    uptime: process.uptime?.() ?? 0,
    timestamp: new Date().toISOString(),
    level4: {
      level: level4.level,
      mode: level4.mode,
      queueDepth: level4.queueDepth,
      deadLetterDepth: level4.deadLetterDepth,
      degradedQueuedCount: level4.degradedQueuedCount,
      committedCount: level4.committedCount,
      lastEventAt: level4.lastEventAt,
      providers: level4.providers
    }
  });
}
