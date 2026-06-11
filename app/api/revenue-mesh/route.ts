import { NextResponse } from 'next/server.js';
import {
  buildRevenueMeshPlan,
  productizedRevenueOffers,
  revenueMeshOperatingRules,
  selectBestProductizedOffer,
  type RevenueOpportunityInput
} from '../../../lib/revenue-mesh';

export const runtime = 'nodejs';

const rateLimitWindowMs = 60_000;
const rateLimitMax = 20;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }
  current.count += 1;
  return current.count > rateLimitMax;
}

function clean(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim().slice(0, 1200) : undefined;
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value * 100) / 100);
}

function cleanBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function cleanStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 20);
}

function cleanUrgency(value: unknown): RevenueOpportunityInput['urgency'] {
  if (value === 'same_day' || value === 'next_day' || value === 'this_week' || value === 'pipeline') return value;
  return undefined;
}

function cleanLane(value: unknown): RevenueOpportunityInput['lane'] {
  if (
    value === 'premium_dispatch' ||
    value === 'local_cash_backup' ||
    value === 'dispatch_partner' ||
    value === 'ai_automation_offer' ||
    value === 'retainer_procurement' ||
    value === 'payment_protection'
  ) {
    return value;
  }
  return undefined;
}

function normalizeOpportunity(raw: unknown): RevenueOpportunityInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const source = clean(record.source);
  const title = clean(record.title);
  if (!source || !title) return null;
  return {
    id: clean(record.id),
    source,
    title,
    lane: cleanLane(record.lane),
    location: clean(record.location),
    schedule: clean(record.schedule),
    buyer: clean(record.buyer),
    contactRoute: clean(record.contactRoute),
    fixedPay: cleanNumber(record.fixedPay),
    rate: cleanNumber(record.rate),
    estimatedHours: cleanNumber(record.estimatedHours),
    travelMiles: cleanNumber(record.travelMiles),
    scope: clean(record.scope),
    requirements: cleanStringArray(record.requirements),
    risks: cleanStringArray(record.risks),
    urgency: cleanUrgency(record.urgency),
    expectedSetupFee: cleanNumber(record.expectedSetupFee),
    expectedMonthlyRevenue: cleanNumber(record.expectedMonthlyRevenue),
    recurringPotential: cleanBoolean(record.recurringPotential)
  };
}

function normalizeOpportunities(raw: unknown): RevenueOpportunityInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeOpportunity).filter((item): item is RevenueOpportunityInput => item !== null).slice(0, 50);
}

export async function POST(request: Request) {
  try {
    const clientKey = getClientKey(request);
    if (isRateLimited(clientKey)) return NextResponse.json({ message: 'Too many revenue-mesh requests. Try again later.' }, { status: 429 });
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
    const opportunities = normalizeOpportunities(body.opportunities);
    const plan = buildRevenueMeshPlan(opportunities);
    const prospectText = clean(body.prospectText);
    const selectedOffer = prospectText ? selectBestProductizedOffer(prospectText) : null;
    return NextResponse.json({ ok: true, service: 'revenue-mesh', plan, selectedOffer });
  } catch {
    return NextResponse.json({ ok: false, service: 'revenue-mesh', status: 'unavailable', timestamp: new Date().toISOString() });
  }
}

export async function GET() {
  try {
    const plan = buildRevenueMeshPlan([]);
    const offerPreview = productizedRevenueOffers.map((offer) => ({
      id: offer.id,
      name: offer.name,
      setupFee: offer.setupFee,
      monthlyFee: offer.monthlyFee,
      lane: offer.lane,
      proofMetric: offer.proofMetric
    }));
    return NextResponse.json({
      ok: true,
      service: 'revenue-mesh',
      status: 'ready',
      operatingRules: revenueMeshOperatingRules,
      productizedOffers: offerPreview,
      taskReplacementWhenEmpty: plan.taskReplacement,
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({ ok: false, service: 'revenue-mesh', status: 'unavailable', productizedOffers: [], timestamp: new Date().toISOString() });
  }
}

export function OPTIONS() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
