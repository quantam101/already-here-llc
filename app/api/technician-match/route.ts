import { NextResponse } from 'next/server';
import { getCanonicalStore } from '@/lib/canonical-store';
import { matchTechnicians, type TechnicianProfile, type WorkOrderRequirement } from '@/lib/technician';

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

function asNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  const text = asString(value);
  if (!text) return [];
  return text.split(/[,;\n]+/).map((v) => v.trim()).filter(Boolean);
}

function requirementsFromBody(body: Record<string, unknown>): WorkOrderRequirement | null {
  const state = asString(body.state).toUpperCase();
  if (!state) return null;
  return {
    state,
    city: asString(body.city) || undefined,
    skillKeywords: asStringArray(body.skillKeywords ?? body.skills ?? []),
    maxRateCents: asNumber(body.maxRateCents),
    certificationKeywords: asStringArray(body.certificationKeywords ?? body.certifications ?? []),
    sameDay: Boolean(body.sameDay),
    weekend: Boolean(body.weekend),
    overnight: Boolean(body.overnight),
    travelOk: Boolean(body.travelOk),
    requireReliableTransport: body.requireReliableTransport !== false
  };
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;
  const requirements = requirementsFromBody(rawBody);
  if (!requirements) {
    return NextResponse.json({ ok: false, error: 'state is required.' }, { status: 400 });
  }

  const technicians = await getCanonicalStore().queryTable('technicians', 1000) as unknown as TechnicianProfile[];
  const matches = matchTechnicians(technicians, requirements);

  return NextResponse.json({
    ok: true,
    requirements,
    count: matches.length,
    matches: matches.slice(0, 20).map((m) => ({
      rank: m.rank,
      fitScore: m.fitScore,
      hardFiltersPass: m.hardFiltersPass,
      explanation: m.explanation,
      technician: {
        id: m.technician.id,
        full_name: m.technician.full_name,
        email: m.technician.email,
        phone: m.technician.phone,
        city: m.technician.city,
        state: m.technician.state,
        travel_radius_miles: m.technician.travel_radius_miles,
        work_lanes: m.technician.work_lanes,
        years_experience: m.technician.years_experience,
        dispatch_readiness_score: m.technician.dispatch_readiness_score,
        hourly_rate: m.technician.hourly_rate,
        worker_path: m.technician.worker_path
      }
    }))
  });
}
