import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'already-here-health',
    uptime: process.uptime?.() ?? 0,
    timestamp: new Date().toISOString()
  });
}
