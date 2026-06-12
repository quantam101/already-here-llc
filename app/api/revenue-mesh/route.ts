import { NextResponse } from 'next/server';
import {
  buildRevenueMeshPlan,
  productizedRevenueOffers as productizedOffers,
  revenueMeshOperatingRules,
  selectBestProductizedOffer,
  type RevenueLane,
  type RevenueOpportunityInput
} from '@/lib/revenue-mesh';

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

function clean(value: unknown, maxLength = 1200): string | undefined {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || undefined : undefined;
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value * 100) / 100);
}

function cleanBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function cleanLane(value: unknown): RevenueLane | undefined {
  return typeof value === 'string' ? value as RevenueLane : undefined;
}

function cleanStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => clean(item, 240))
    .filter((item): item is string => Boolean(item));
  return items.length ? items.slice(0, 20) : undefined;
}

function cleanUrgency(value: unknown): RevenueOpportunityInput['urgency'] | undefined {
  if (value === 'same_day' || value === 'next_day' || value === 'this_week' || value === 'pipeline') return value;
  return undefined;
}

function normalizeOpportunities(raw: unknown): RevenueOpportunityInput[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item): RevenueOpportunityInput | null => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const title = clean(record.title, 240);
      const source = clean(record.source, 160);
      if (!title || !source) return null;

      return {
        id: clean(record.id, 120),
        title,
        source,
        lane: cleanLane(record.lane),
        buyer: clean(record.buyer, 180),
        location: clean(record.location, 180),
        schedule: clean(record.schedule, 180),
        contactRoute: clean(record.contactRoute, 240),
        fixedPay: cleanNumber(record.fixedPay),
        rate: cleanNumber(record.rate),
        estimatedHours: cleanNumber(record.estimatedHours),
        travelMiles: cleanNumber(record.travelMiles),
        scope: clean(record.scope, 2000),
        requirements: cleanStringArray(record.requirements),
        risks: cleanStringArray(record.risks),
        urgency: cleanUrgency(record.urgency),
        expectedSetupFee: cleanNumber(record.expectedSetupFee),
        expectedMonthlyRevenue: cleanNumber(record.expectedMonthlyRevenue),
        recurringPotential: cleanBoolean(record.recurringPotential)
      };
    })
    .filter((item): item is RevenueOpportunityInput => Boolean(item))
    .slice(0, 50);
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) {
    return NextResponse.json({ ok: false, message: 'Request limit reached. Try again later.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: 'Invalid JSON payload.' }, { status: 400 });

  const opportunities = normalizeOpportunities(body.opportunities);
  const prospectText = clean(body.prospectText, 3000) || opportunities.map((item) => `${item.title} ${item.scope ?? ''}`).join(' ');
  const plan = buildRevenueMeshPlan(opportunities);
  const selectedOffer = selectBestProductizedOffer(prospectText);

  return NextResponse.json({
    ok: true,
    service: 'revenue-mesh',
    status: 'ready',
    plan,
    selectedOffer,
    timestamp: new Date().toISOString()
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'revenue-mesh',
    status: 'ready',
    operatingRules: revenueMeshOperatingRules,
    productizedOffers,
    taskReplacementWhenEmpty: 'No new opportunities submitted. Use dispatch intake or procurement radar.',
    timestamp: new Date().toISOString()
  });
}

export function OPTIONS() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
