import { NextResponse } from 'next/server';
import { isInternalApiKeyValid } from '@/lib/internal-auth';
import { getCanonicalStore } from '@/lib/canonical-store';
import { parseDSN, isHardBounce, type ParsedDSN } from '@/lib/dsn-parser';
import { buildBounceSuppressionWrites } from '@/lib/bounce';

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

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }
  if (!isInternalApiKeyValid(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const email = asString(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: 'email is required.' }, { status: 400 });
  }

  const dsn = asString(body.dsn);
  const parsed: ParsedDSN = dsn ? parseDSN(dsn) : {
    statusCode: asString(body.statusCode) || '',
    statusClass: '?' as const,
    bounceType: (asString(body.bounceType) as 'hard' | 'soft' | 'unknown') || 'unknown',
    diagnostic: asString(body.diagnostic) || undefined,
    recipient: email,
  };

  if (!parsed.statusCode && !dsn) {
    return NextResponse.json({ ok: false, error: 'dsn or statusCode is required.' }, { status: 400 });
  }

  const store = getCanonicalStore();
  const writes = await buildBounceSuppressionWrites({
    email,
    dsn,
    parsed,
    source: asString(body.source) || 'bounce_api',
    sourceId: asString(body.sourceId) || undefined,
    outreachId: asString(body.outreachId) || undefined,
    submittedAt: asString(body.submittedAt) || undefined,
  }, store);

  const result = await store.executeWrites(writes);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: result.failed }, { status: 500 });
  }

  const bounceWrite = writes.find((w) => w.table === 'bounces');
  return NextResponse.json({
    ok: true,
    bounceId: bounceWrite?.id,
    hardBounce: isHardBounce(parsed),
    suppressed: true,
    canonicalRecordCount: writes.length,
  });
}
