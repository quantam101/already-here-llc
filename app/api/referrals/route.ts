import { NextResponse } from 'next/server';
import { getCanonicalStore } from '@/lib/canonical-store';
import { getOrCreateUserReferralCode, getReferralCodeByCode, getReferralStats, isValidReferralCode, referralBaseUrl, ReferralCodeConflictError } from '@/lib/referral';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

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

function asString(value: unknown, maxLength = 255): string {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > maxLength ? s.slice(0, maxLength) : s;
}

function asEmail(value: unknown): string {
  const email = asString(value, 160).toLowerCase();
  return email;
}

export async function GET(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const code = asString(url.searchParams.get('code'), 20).toUpperCase();
  const email = asEmail(url.searchParams.get('email'));

  const store = getCanonicalStore();

  if (code) {
    if (!isValidReferralCode(code)) {
      return NextResponse.json({ ok: false, error: 'Invalid referral code.' }, { status: 400 });
    }
    const record = await getReferralCodeByCode(store, code);
    if (!record) {
      return NextResponse.json({ ok: false, error: 'Referral code not found.' }, { status: 404 });
    }
    const stats = await getReferralStats(store, code, referralBaseUrl());
    return NextResponse.json({ ok: true, code: record, stats });
  }

  if (email) {
    try {
      const { code: record } = await getOrCreateUserReferralCode(store, { email });
      const stats = await getReferralStats(store, record.code, referralBaseUrl());
      return NextResponse.json({ ok: true, code: record, stats, created: false });
    } catch (err) {
      if (err instanceof ReferralCodeConflictError) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
      }
      throw err;
    }
  }

  return NextResponse.json({ ok: false, error: 'Provide a code or email query parameter.' }, { status: 400 });
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const email = asEmail(body.email);
  const name = asString(body.name, 120);
  const code = asString(body.code, 20).toUpperCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'A valid email is required.' }, { status: 400 });
  }

  if (code && !isValidReferralCode(code)) {
    return NextResponse.json({ ok: false, error: 'Referral code must match AH-XXXXXX format.' }, { status: 400 });
  }

  const store = getCanonicalStore();
  try {
    const { code: record, created } = await getOrCreateUserReferralCode(store, { email, name, code: code || undefined });
    const stats = await getReferralStats(store, record.code, referralBaseUrl());
    return NextResponse.json({ ok: true, code: record, stats, created });
  } catch (err) {
    if (err instanceof ReferralCodeConflictError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    throw err;
  }
}
