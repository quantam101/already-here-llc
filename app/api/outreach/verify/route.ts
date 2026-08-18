import { NextResponse } from 'next/server';
import { isInternalApiKeyValid } from '@/lib/internal-auth';
import { getCanonicalStore } from '@/lib/canonical-store';
import { normalizeEmail } from '@/lib/canonical-ids';
import { verifyRecipient, verifyDomain } from '@/lib/email-verification';

export const runtime = 'nodejs';

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }
  if (!isInternalApiKeyValid(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const email = asString(body.email);
  const contactId = asString(body.contactId);
  if (!email && !contactId) {
    return NextResponse.json({ ok: false, error: 'email or contactId is required.' }, { status: 400 });
  }

  const store = getCanonicalStore();
  let targetEmail = email;

  if (!targetEmail && contactId) {
    const contact = await store.getRecord('contacts', contactId);
    if (!contact || !contact.email) {
      return NextResponse.json({ ok: false, error: 'Contact not found or has no email.' }, { status: 404 });
    }
    targetEmail = String(contact.email);
  }

  const domain = targetEmail.split('@')[1];
  const [recipientResult, domainResult, allContacts] = await Promise.all([
    verifyRecipient(targetEmail),
    verifyDomain(domain),
    store.queryTable('contacts', 1000),
  ]);

  const existing = allContacts.find((c) => normalizeEmail(String(c.email || '')) === normalizeEmail(targetEmail));
  if (existing) {
    await store.executeWrites([{
      table: 'contacts',
      id: String(existing.id),
      action: 'upsert',
      record: {
        id: existing.id,
        email_status: recipientResult.reachable ? 'verified' : (recipientResult.reason === 'SMTP user unknown' ? 'invalid' : 'unverified'),
        email_verified_at: recipientResult.verifiedAt,
        updated_at: new Date().toISOString(),
      },
    }]);
  }

  return NextResponse.json({
    ok: true,
    email: targetEmail,
    domainReachable: domainResult.ok,
    recipientReachable: recipientResult.reachable,
    reason: recipientResult.reason,
    mxRecords: recipientResult.mxRecords,
    smtpCode: recipientResult.smtpCode,
    smtpResponse: recipientResult.smtpResponse,
    verifiedAt: recipientResult.verifiedAt,
  });
}
