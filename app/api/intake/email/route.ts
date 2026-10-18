import { NextResponse } from 'next/server';
import { classifyEmail, ingestEmails, type ParsedEmail } from '@/lib/email-intake';
import { getCanonicalStore } from '@/lib/canonical-store';
import { isInternalAuthorized } from '@/lib/internal-auth';
import { isRateLimited } from '@/lib/ginc-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BATCH = 500;

/**
 * POST /api/intake/email — internal-key only.
 * Body: { messages: ParsedEmail[] } — pre-parsed messages (from a Takeout
 * export processed locally by scripts/import-takeout.mjs). Each message is
 * classified; only work-platform mail (Field Nation / WorkMarket) with a
 * real work signal writes records. Returns import counters.
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Internal key required.' }, { status: 401 });
  }
  if (await isRateLimited(request.headers.get('x-real-ip') ?? 'unknown', 20, 60)) {
    return NextResponse.json({ ok: false, error: 'Too many requests.' }, { status: 429 });
  }
  const body = await request.json().catch(() => ({})) as { messages?: ParsedEmail[] };
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return NextResponse.json({ ok: false, error: 'messages[] required.' }, { status: 400 });
  }
  if (messages.length > MAX_BATCH) {
    return NextResponse.json({ ok: false, error: `Max ${MAX_BATCH} messages per request.` }, { status: 400 });
  }
  const classified = messages.map((m) => classifyEmail(m));
  const result = await ingestEmails(classified, getCanonicalStore());
  return NextResponse.json({ ok: true, result });
}
