import { NextResponse } from 'next/server.js';
import { formatSmsPayload } from '@/lib/sms';

export const runtime = 'nodejs';

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function limited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 5;
}

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: Request) {
  if (limited(clientKey(request))) return NextResponse.json({ message: 'Too many submissions. Try again shortly.' }, { status: 429 });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json({ message: 'SMS provider is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to send messages.' }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({})) as { to?: string; body?: string; referenceId?: string };
    if (!body.to || !body.body) return NextResponse.json({ message: 'Missing phone number or message body.' }, { status: 400 });

    const payload = formatSmsPayload({ to: body.to, body: body.body, referenceId: body.referenceId });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: `+1${payload.to}`, From: fromNumber, Body: payload.body })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Twilio request failed' })) as { message?: string };
      throw new Error(data.message || `Twilio error ${response.status}`);
    }

    return NextResponse.json({ message: 'SMS queued.', referenceId: payload.referenceId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SMS could not be sent.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
