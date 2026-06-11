import { NextResponse } from 'next/server';
import { getLevel4Events, getLevel4RuntimeSnapshot } from '@/lib/level4-resiliency';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const snapshot = getLevel4RuntimeSnapshot();
    const recentEvents = getLevel4Events()
      .slice(-10)
      .map((event) => ({
        id: event.id,
        type: event.type,
        source: event.source,
        status: event.status,
        attempts: event.attempts,
        payloadHash: event.payloadHash,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        committedAt: event.committedAt,
        nextAttemptAt: event.nextAttemptAt,
        deterministicFallback: event.deterministicFallback,
        lastError: event.lastError
      }));
    return NextResponse.json({ ok: snapshot.deadLetterDepth === 0, ...snapshot, recentEvents });
  } catch {
    return NextResponse.json({ ok: false, service: 'runtime-status', recentEvents: [], timestamp: new Date().toISOString() });
  }
}
