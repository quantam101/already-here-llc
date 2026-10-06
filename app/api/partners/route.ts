import { NextResponse } from 'next/server';
import { getCanonicalStore } from '@/lib/canonical-store';
import { buildPartnerWrites, generateUniqueReferralCode, getReferralCodeByCode, isValidReferralCode, normalizePartnerType, type PartnerRecord } from '@/lib/referral';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
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

function validatePartnerBody(body: Record<string, unknown>): { error?: string; input?: Parameters<typeof buildPartnerWrites>[0] } {
  const name = asString(body.name, 120);
  const company = asString(body.company, 160) || name;
  const contactEmail = asString(body.contactEmail, 160).toLowerCase();
  const contactName = asString(body.contactName, 120) || name;
  const type = normalizePartnerType(asString(body.type, 40));
  const website = asString(body.website, 160);
  const phone = asString(body.phone, 40);
  const notes = asString(body.notes, 500);
  const code = asString(body.code, 20).toUpperCase();

  if (!name || name.length < 2) return { error: 'Name is required.' };
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { error: 'A valid contact email is required.' };

  return {
    input: {
      name,
      company,
      type,
      contactEmail,
      contactName,
      website: website || undefined,
      phone: phone || undefined,
      notes: notes || undefined,
      code: code || undefined,
      status: 'pending'
    }
  };
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const validated = validatePartnerBody(body);
  if (validated.error) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }

  const store = getCanonicalStore();

  if (validated.input!.code) {
    if (!isValidReferralCode(validated.input!.code)) {
      return NextResponse.json({ ok: false, error: 'Referral code must match AH-XXXXXX format.' }, { status: 400 });
    }
    const taken = await getReferralCodeByCode(store, validated.input!.code);
    if (taken) {
      return NextResponse.json({ ok: false, error: 'Referral code is already in use.' }, { status: 409 });
    }
  } else {
    validated.input!.code = await generateUniqueReferralCode(store);
  }

  const writes = buildPartnerWrites(validated.input!);
  const writeResult = await store.executeWrites(writes);
  if (!writeResult.ok) {
    return NextResponse.json({ ok: false, error: 'Failed to store partner record.', failed: writeResult.failed }, { status: 500 });
  }

  const partner = writes.find((w) => w.table === 'partners')!.record as unknown as PartnerRecord;
  return NextResponse.json({
    ok: true,
    partnerId: partner.id,
    referralCode: partner.referral_code,
    message: 'Partner application received. We will review and activate your code within one business day.'
  });
}

export async function GET(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  const records = await getCanonicalStore().queryTable('partners', 1000);
  const partners = records
    .filter((r) => r.status === 'approved')
    .map((r) => {
      const p = r as unknown as PartnerRecord;
      return {
        id: p.id,
        name: p.name,
        company: p.company,
        type: p.type,
        status: p.status,
        referralCode: p.referral_code,
        website: p.website,
        createdAt: p.created_at
      };
    });

  return NextResponse.json({ ok: true, count: partners.length, partners });
}
