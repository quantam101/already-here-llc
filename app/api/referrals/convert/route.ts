import { NextResponse } from 'next/server';
import { getCanonicalStore } from '@/lib/canonical-store';
import { buildReferralCodeUpdate, buildReferralConversionWrite, conversionId, getReferralCodeByCode, isValidReferralCode } from '@/lib/referral';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 50;
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
  return asString(value, 160).toLowerCase();
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function verifyReferralConvertSecret(request: Request): boolean {
  const secret = process.env.REFERRAL_CONVERT_SECRET;
  if (!secret) return false;
  const header = request.headers.get('x-referral-secret')?.trim() ?? '';
  const query = new URL(request.url).searchParams.get('secret')?.trim() ?? '';
  return header === secret || query === secret;
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  if (!verifyReferralConvertSecret(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const code = asString(body.code, 20).toUpperCase();
  const referredEmail = asEmail(body.referredEmail);
  const referredName = asString(body.referredName, 120);
  const eventType = asString(body.eventType, 40) || 'checkout';
  const sourceTable = asString(body.sourceTable, 80) || 'revenue_events';
  const sourceId = asString(body.sourceId, 120);
  const revenueCents = asNumber(body.revenueCents);
  const rewardCents = asNumber(body.rewardCents);

  if (!code || !isValidReferralCode(code)) {
    return NextResponse.json({ ok: false, error: 'A valid referral code is required.' }, { status: 400 });
  }
  if (!sourceId) {
    return NextResponse.json({ ok: false, error: 'sourceId is required.' }, { status: 400 });
  }

  const store = getCanonicalStore();
  const codeRecord = await getReferralCodeByCode(store, code);
  if (!codeRecord) {
    return NextResponse.json({ ok: false, error: 'Referral code not found.' }, { status: 404 });
  }
  if (codeRecord.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'Referral code is not active.' }, { status: 403 });
  }

  const existingConversionId = conversionId(code, sourceId);
  const existingConversion = await store.getRecord('referral_conversions', existingConversionId);
  if (existingConversion) {
    const existing = existingConversion as unknown as { id: string; referral_code: string; revenue_cents: number; reward_cents: number };
    return NextResponse.json({
      ok: true,
      conversionId: existing.id,
      referralCode: existing.referral_code,
      revenueCents: existing.revenue_cents,
      rewardCents: existing.reward_cents,
      duplicated: true
    });
  }

  const conversion = buildReferralConversionWrite({
    code,
    referredEmail: referredEmail || undefined,
    referredName: referredName || undefined,
    eventType,
    sourceTable,
    sourceId,
    revenueCents,
    rewardCents: rewardCents || undefined,
    partnerId: codeRecord.owner_type === 'partner' ? codeRecord.owner_id : null
  }, codeRecord);

  const reward = typeof conversion.record.reward_cents === 'number' ? conversion.record.reward_cents : 0;
  const codeUpdate = buildReferralCodeUpdate(codeRecord, revenueCents, reward);

  const writeResult = await store.executeWrites([conversion, codeUpdate]);
  if (!writeResult.ok) {
    return NextResponse.json({ ok: false, error: 'Failed to record conversion.', failed: writeResult.failed }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    conversionId: conversion.id,
    referralCode: codeRecord.code,
    revenueCents: revenueCents,
    rewardCents: reward
  });
}
