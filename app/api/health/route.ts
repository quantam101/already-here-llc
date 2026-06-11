import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'already-here-health',
    status: 'ready',
    uptime: process.uptime?.() ?? 0,
    timestamp: new Date().toISOString(),
    level4: {
      level: 'safe-json',
      mode: 'production-health',
      queueDepth: 0,
      deadLetterDepth: 0,
      degradedQueuedCount: 0,
      committedCount: 0,
      lastEventAt: null,
      providers: []
    }
  });
}
