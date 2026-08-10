import { NextResponse } from 'next/server';
import { persistDatabaseReadyWrites } from '@/lib/revenue-command-db';
import { buildRevenueCommandProofDemos, buildRevenueIntakeProof, type RevenueIntakeInput } from '@/lib/revenue-command-intake';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const MAX_TITLE_LENGTH = 500;
const MAX_BODY_LENGTH = 5_000;
const MAX_FIELD_LENGTH = 300;

type RateLimitEntry = { count: number; resetAt: number };
const rateLimits = new Map<string, RateLimitEntry>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampString(value: string, max: number): string {
  if (value.length > max) {
    return value.slice(0, max);
  }
  return value;
}

function inputFromBody(body: Record<string, unknown>): RevenueIntakeInput {
  return {
    source: clampString(asString(body.source) || 'api_revenue_command_intake', MAX_FIELD_LENGTH),
    fullName: clampString(asString(body.fullName) || 'Unknown Contact', MAX_FIELD_LENGTH),
    company: clampString(asString(body.company) || 'Unknown Organization', MAX_FIELD_LENGTH),
    email: clampString(asString(body.email), MAX_FIELD_LENGTH),
    phone: clampString(asString(body.phone), MAX_FIELD_LENGTH),
    title: clampString(asString(body.title) || asString(body.serviceType) || 'Revenue intake', MAX_TITLE_LENGTH),
    body: clampString(asString(body.body) || asString(body.message) || 'No message provided.', MAX_BODY_LENGTH),
    location: clampString(asString(body.location) || asString(body.siteCity), MAX_FIELD_LENGTH),
    serviceType: clampString(asString(body.serviceType), MAX_FIELD_LENGTH),
    ticketNumber: clampString(asString(body.ticketNumber), MAX_FIELD_LENGTH),
    requestedWindow: clampString(asString(body.requestedWindow), MAX_FIELD_LENGTH),
    estimatedValueCents: asNumber(body.estimatedValueCents),
    submittedAt: asString(body.submittedAt) || undefined
  };
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
    email: url.searchParams.get('email') || 'smoke@example.invalid',
    title: url.searchParams.get('title') || 'Urgent same-day dispatch revenue opportunity by noon $500',
    body: url.searchParams.get('body') || 'Network smart hands dispatch proof request.',
    location: url.searchParams.get('location') || 'Phoenix, AZ',
    serviceType: url.searchParams.get('serviceType') || 'Technical field operations',
    estimatedValueCents: url.searchParams.get('estimatedValueCents') || 50000
  });

  return NextResponse.json(buildRevenueIntakeProof(input));
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const proof = buildRevenueIntakeProof(inputFromBody(body));
  const { inserted, errors } = await persistDatabaseReadyWrites(proof.databaseReadyWrites);
  return NextResponse.json({ ...proof, persistedToOwnedDatabase: inserted, persistenceErrors: errors });
}
