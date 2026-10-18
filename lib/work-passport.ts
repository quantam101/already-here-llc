import { createHmac, timingSafeEqual } from 'crypto';
import type { CanonicalStore } from './canonical-store';
import { getCanonicalStore } from './canonical-store';
import { rawEntityId } from './work-history';

/**
 * Verified Work Passport — a signed, shareable proof-of-work artifact.
 * The token encodes only the closeout id; the signature binds it to the
 * server's key, so a link proves the record exists without exposing any
 * lookup surface. The payload returned is deliberately sanitized: no
 * email, phone, street address, VIN, or plate — ever.
 */

export interface WorkPassport {
  closeout_id: string;
  work_order_id: string;
  service_type: string;
  completed_at: string | null;
  site_label: string;
  technician: string;
  organization: string;
  hours_worked: number | null;
  qa_status: string;
  customer_rating: number | null;
  signed: boolean;
  photo_count: number;
  revenue_cents: number | null;
  currency: string;
  skills: string[];
  certifications: string[];
  issued_at: string;
}

const PASSPORT_KEYS = () =>
  [process.env.WORK_PASSPORT_SECRET, process.env.GINC_ADMIN_KEY, process.env.AHFOS_INTERNAL_API_KEY]
    .map((k) => k?.trim())
    .filter((k): k is string => !!k);

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hoursBetween(start: unknown, end: unknown): number | null {
  const s = Date.parse(text(start));
  const e = Date.parse(text(end));
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
  return Math.round(((e - s) / 3_600_000) * 100) / 100;
}

/** Mint a shareable passport token for a closeout id. Internal use only. */
export function mintPassportToken(closeoutId: string): string | null {
  const keys = PASSPORT_KEYS();
  if (!keys.length) return null;
  const payload = rawEntityId(closeoutId);
  const body = Buffer.from(payload, 'utf8').toString('base64url');
  return `${body}.${sign(body, keys[0])}`;
}

/** Verify a passport token → the closeout id it binds to, or null. */
export function verifyPassportToken(token: string): string | null {
  const keys = PASSPORT_KEYS();
  const [body, sig] = (token ?? '').split('.');
  if (!body || !sig) return null;
  const valid = keys.some((key) => {
    const expected = sign(body, key);
    if (expected.length !== sig.length) return false;
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  });
  if (!valid) return null;
  try {
    return Buffer.from(body, 'base64url').toString('utf8') || null;
  } catch {
    return null;
  }
}

function firstName(full: string): string {
  return full.split(/\s+/)[0] ?? '';
}

/**
 * Load the sanitized passport for a closeout id. Returns null when the
 * closeout doesn't exist — a forged or stale token gets the same answer.
 */
export async function getWorkPassport(closeoutId: string, store?: CanonicalStore): Promise<WorkPassport | null> {
  const canonical = store ?? getCanonicalStore();
  const closeout = await canonical.getRecord('closeouts', closeoutId).catch(() => null);
  if (!closeout) return null;

  const workOrderId = text(closeout.work_order_id);
  const [job, tech, revenue] = await Promise.all([
    workOrderId ? canonical.getRecord('jobs', workOrderId).catch(() => null) : null,
    text(closeout.technician_id) ? canonical.getRecord('technicians', text(closeout.technician_id)).catch(() => null) : null,
    canonical.queryTable('revenue_events', 1000).then((rows) => rows.find((r) => text(r.closeout_id) === closeoutId) ?? null).catch(() => null),
  ]);
  const orgRow = job && text(job.organization_id)
    ? await canonical.getRecord('organizations', text(job.organization_id)).catch(() => null)
    : null;

  const photos = Array.isArray(closeout.photos) ? closeout.photos : [];
  const skills = [
    ...(Array.isArray(tech?.required_skills) ? tech.required_skills : []),
    ...(typeof tech?.skills_text === 'string' ? tech.skills_text.split(/[,;]+/) : []),
    ...(Array.isArray(tech?.certifications) ? tech.certifications : []),
  ].map((s) => String(s).trim()).filter(Boolean).slice(0, 12);

  // Certification names held by the technician (names only — no cert
  // numbers or dates that could identify someone).
  const techId = text(tech?.id);
  const certifications = techId
    ? (await canonical.queryTable('certifications', 1000).catch(() => []))
        .filter((c) => text(c.technician_id) === techId)
        .map((c) => text(c.certification_name))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const rating = num(closeout.customer_rating);
  const showRevenue = process.env.PASSPORT_SHOW_REVENUE === 'true';

  return {
    closeout_id: closeoutId,
    work_order_id: workOrderId,
    service_type: text(job?.service_type) || text(job?.load_type) || 'Field work',
    completed_at: text(closeout.actual_end) || text(closeout.created_at) || null,
    site_label: [text(job?.site_city) || text(job?.location_city), text(job?.site_state) || text(job?.location_state)]
      .filter(Boolean).join(', '),
    // first name only — a tech's full name is their private identifier
    technician: firstName(text(tech?.full_name) || text(tech?.name)) || 'Field technician',
    organization: text(orgRow?.name) || 'Client',
    hours_worked: hoursBetween(closeout.actual_start, closeout.actual_end),
    qa_status: text(closeout.qa_status) || 'needs_review',
    customer_rating: rating >= 1 && rating <= 5 ? rating : null,
    signed: closeout.customer_signature_received === true || text(closeout.customer_signature_received) === 'true',
    photo_count: photos.length,
    revenue_cents: showRevenue ? num(closeout.revenue_cents || revenue?.amount_cents) : null,
    currency: text(closeout.currency || revenue?.currency) || 'USD',
    skills,
    certifications,
    issued_at: new Date().toISOString(),
  };
}
