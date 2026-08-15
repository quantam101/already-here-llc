import { NextResponse } from 'next/server';
import { buildRevenueCommandProofDemos, buildRevenueIntakeProof, type RevenueIntakeInput } from '@/lib/revenue-command-intake';
import { getCanonicalStore } from '@/lib/canonical-store';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

const FIELD_LIMITS: Record<keyof RevenueIntakeInput, number> = {
  source: 120,
  sourceId: 120,
  channel: 20,
  fullName: 120,
  company: 160,
  domain: 160,
  email: 160,
  phone: 40,
  title: 240,
  body: 4000,
  location: 160,
  serviceType: 120,
  ticketNumber: 80,
  requestedWindow: 120,
  estimatedValueCents: 12,
  submittedAt: 30,
};

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || 'unknown';
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

function asString(value: unknown, maxLength: number): string {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > maxLength ? s.slice(0, maxLength) : s;
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(parsed, 99_999_999_999));
}

function inputFromBody(body: Record<string, unknown>): RevenueIntakeInput {
  return {
    source: asString(body.source, FIELD_LIMITS.source) || 'api_revenue_command_intake',
    sourceId: asString(body.sourceId, FIELD_LIMITS.sourceId) || undefined,
    channel: (asString(body.channel, FIELD_LIMITS.channel) as RevenueIntakeInput['channel']) || 'unknown',
    fullName: asString(body.fullName, FIELD_LIMITS.fullName) || 'Unknown Contact',
    company: asString(body.company, FIELD_LIMITS.company) || 'Unknown Organization',
    domain: asString(body.domain, FIELD_LIMITS.domain) || undefined,
    email: asString(body.email, FIELD_LIMITS.email),
    phone: asString(body.phone, FIELD_LIMITS.phone),
    title: asString(body.title, FIELD_LIMITS.title) || asString(body.serviceType, FIELD_LIMITS.serviceType) || 'Revenue intake',
    body: asString(body.body, FIELD_LIMITS.body) || asString(body.message, FIELD_LIMITS.body) || 'No message provided.',
    location: asString(body.location || body.siteCity, FIELD_LIMITS.location),
    serviceType: asString(body.serviceType, FIELD_LIMITS.serviceType),
    ticketNumber: asString(body.ticketNumber, FIELD_LIMITS.ticketNumber),
    requestedWindow: asString(body.requestedWindow, FIELD_LIMITS.requestedWindow),
    estimatedValueCents: asNumber(body.estimatedValueCents),
    submittedAt: asString(body.submittedAt, FIELD_LIMITS.submittedAt) || undefined
  };
}

function validateInput(input: RevenueIntakeInput): string | null {
  if (!input.fullName || input.fullName.length < 2) return 'fullName is required';
  if (!input.title || input.title.length < 3) return 'title or serviceType is required';
  if (input.email && !input.email.includes('@')) return 'Invalid email';
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('demo') === 'all') {
    return NextResponse.json({ ok: true, demos: buildRevenueCommandProofDemos() });
  }

  const input = inputFromBody({
    source: url.searchParams.get('source') || 'api_revenue_command_intake_get',
    fullName: url.searchParams.get('fullName') || 'Smoke Test',
    company: url.searchParams.get('company') || 'Already Here LLC',
    email: url.searchParams.get('email') || 'smoke-test@alreadyherellc.com',
    title: url.searchParams.get('title') || 'Urgent same-day dispatch revenue opportunity by noon $500',
    body: url.searchParams.get('body') || 'Network smart hands dispatch proof request.',
    location: url.searchParams.get('location') || 'Phoenix, AZ',
    serviceType: url.searchParams.get('serviceType') || 'Technical field operations',
    estimatedValueCents: url.searchParams.get('estimatedValueCents') || 50000
  });

  const validationError = validateInput(input);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const proof = buildRevenueIntakeProof(input);
  return NextResponse.json(proof);
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const input = inputFromBody(rawBody);
  const validationError = validateInput(input);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const proof = buildRevenueIntakeProof(input);
  const writeResult = await getCanonicalStore().executeWrites(proof.databaseReadyWrites);
  return NextResponse.json({ ...proof, writeResult });
}
