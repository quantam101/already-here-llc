import { NextRequest, NextResponse } from 'next/server';
import { notifyTraffic } from '@/lib/profitengine';

const MAX_BODY_BYTES = 10_000;

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
  }

  try {
    const body = (await req.json()) as Partial<{
      page: string;
      referrer: string;
      userAgent: string;
      timestamp: string;
      sessionId: string;
    }>;

    if (!body.page) {
      return NextResponse.json({ ok: false, error: 'page is required' }, { status: 400 });
    }

    const sent = await notifyTraffic({
      page: body.page,
      referrer: body.referrer ?? '',
      userAgent: (body.userAgent ?? '').slice(0, 300),
      timestamp: body.timestamp,
      sessionId: body.sessionId,
    });

    return NextResponse.json({ ok: sent });
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }
}
