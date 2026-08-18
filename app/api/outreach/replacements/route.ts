import { NextResponse } from 'next/server';
import { isInternalApiKeyValid } from '@/lib/internal-auth';
import { getCanonicalStore } from '@/lib/canonical-store';
import { normalizeEmail } from '@/lib/canonical-ids';

export const runtime = 'nodejs';

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

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

export async function GET(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }
  if (!isInternalApiKeyValid(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const email = asString(url.searchParams.get('email'));
  const organizationId = asString(url.searchParams.get('organizationId'));

  if (!email && !organizationId) {
    return NextResponse.json({ ok: false, error: 'email or organizationId is required.' }, { status: 400 });
  }

  const store = getCanonicalStore();
  const contacts = await store.queryTable('contacts', 5000);

  let orgId = organizationId;
  if (!orgId && email) {
    const matched = contacts.find((c) => normalizeEmail(String(c.email || '')) === normalizeEmail(email));
    orgId = matched ? String(matched.organization_id) : '';
  }

  if (!orgId) {
    return NextResponse.json({ ok: false, error: 'Organization not found for given email.' }, { status: 404 });
  }

  const excludedEmail = email ? normalizeEmail(email) : '';
  const candidates = contacts.filter((c) =>
    c.organization_id === orgId &&
    c.email &&
    normalizeEmail(String(c.email)) !== excludedEmail &&
    !c.suppressed
  );

  return NextResponse.json({
    ok: true,
    organizationId: orgId,
    excludedEmail,
    candidates: candidates.map((c) => ({
      contactId: c.id,
      fullName: c.full_name,
      email: c.email,
      emailStatus: c.email_status,
      role: c.role,
    })),
  });
}
