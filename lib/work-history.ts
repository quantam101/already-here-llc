import type { CanonicalStore } from './canonical-store';
import { getCanonicalStore } from './canonical-store';

/**
 * Completed-work aggregation: the closeouts table joined back through
 * jobs/assignments/revenue_events so every entity in the connection
 * graph carries a verifiable track record — jobs completed, hours,
 * revenue, margin, QA pass rate, and proof-of-work artifacts.
 */

export interface WorkHistoryEntry {
  closeout_id: string;
  work_order_id: string;
  assignment_id: string;
  technician_id: string;
  completed_at: string | null;
  service_type: string;
  site_label: string;
  hours_worked: number | null;
  revenue_cents: number;
  gross_margin_cents: number;
  qa_status: string;
  customer_rating: number | null;
  signed: boolean;
  photo_count: number;
  completion_notes: string;
}

export interface WorkHistorySummary {
  jobs_completed: number;
  hours_worked: number;
  revenue_cents: number;
  gross_margin_cents: number;
  avg_customer_rating: number | null;
  qa_pass_rate: number | null;
  signed_closeouts: number;
  photos: number;
  first_completed_at: string | null;
  last_completed_at: string | null;
}

export interface EntityWorkHistory {
  subject: { kind: string; id: string; label: string };
  summary: WorkHistorySummary;
  entries: WorkHistoryEntry[];
}

export interface WorkHistoryLeader {
  kind: 'technician' | 'organization';
  id: string;
  label: string;
  jobs_completed: number;
  revenue_cents: number;
  gross_margin_cents: number;
  hours_worked: number;
  avg_customer_rating: number | null;
  qa_pass_rate: number | null;
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

function ratingOf(record: Record<string, unknown>): number | null {
  const r = num(record.customer_rating ?? record.csat ?? record.rating);
  return r >= 1 && r <= 5 ? r : null;
}

type Rows = Record<string, unknown>[];

function emptySummary(): WorkHistorySummary {
  return {
    jobs_completed: 0,
    hours_worked: 0,
    revenue_cents: 0,
    gross_margin_cents: 0,
    avg_customer_rating: null,
    qa_pass_rate: null,
    signed_closeouts: 0,
    photos: 0,
    first_completed_at: null,
    last_completed_at: null,
  };
}

function summarize(entries: WorkHistoryEntry[]): WorkHistorySummary {
  const s = emptySummary();
  const ratings: number[] = [];
  let qaKnown = 0;
  let qaPassed = 0;
  const stamps: string[] = [];
  for (const e of entries) {
    s.jobs_completed += 1;
    if (e.hours_worked !== null) s.hours_worked = Math.round((s.hours_worked + e.hours_worked) * 100) / 100;
    s.revenue_cents += e.revenue_cents;
    s.gross_margin_cents += e.gross_margin_cents;
    if (e.customer_rating !== null) ratings.push(e.customer_rating);
    if (e.qa_status === 'pass' || e.qa_status === 'fail') {
      qaKnown += 1;
      if (e.qa_status === 'pass') qaPassed += 1;
    }
    if (e.signed) s.signed_closeouts += 1;
    s.photos += e.photo_count;
    if (e.completed_at) stamps.push(e.completed_at);
  }
  if (ratings.length) s.avg_customer_rating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100;
  if (qaKnown) s.qa_pass_rate = Math.round((qaPassed / qaKnown) * 1000) / 10;
  stamps.sort();
  s.first_completed_at = stamps[0] ?? null;
  s.last_completed_at = stamps[stamps.length - 1] ?? null;
  return s;
}

function jobMatchesEntity(job: Record<string, unknown>, rawId: string): boolean {
  return [
    'id', 'organization_id', 'contact_id', 'technician_id',
    'assigned_technician_id', 'vehicle_id', 'asset_id', 'site_id',
  ].some((f) => text(job[f]) === rawId);
}

function entryFor(
  closeout: Record<string, unknown>,
  jobsById: Map<string, Record<string, unknown>>,
  revenueByCloseout: Map<string, Record<string, unknown>>,
): WorkHistoryEntry {
  const job = jobsById.get(text(closeout.work_order_id)) ?? {};
  const revenue = revenueByCloseout.get(text(closeout.id)) ?? {};
  const photos = Array.isArray(closeout.photos) ? closeout.photos : [];
  const siteBits = [text(job.site_city) || text(job.location_city), text(job.site_state) || text(job.location_state)]
    .filter(Boolean).join(', ');
  return {
    closeout_id: text(closeout.id),
    work_order_id: text(closeout.work_order_id),
    assignment_id: text(closeout.assignment_id),
    technician_id: text(closeout.technician_id),
    completed_at: text(closeout.actual_end) || text(closeout.created_at) || null,
    service_type: text(job.service_type) || text(job.load_type) || text(job.complaint) || 'Field work',
    site_label: siteBits,
    hours_worked: hoursBetween(closeout.actual_start, closeout.actual_end),
    revenue_cents: num(closeout.revenue_cents || revenue.amount_cents),
    gross_margin_cents: num(revenue.gross_margin_cents),
    qa_status: text(closeout.qa_status) || 'needs_review',
    customer_rating: ratingOf(closeout),
    signed: closeout.customer_signature_received === true || text(closeout.customer_signature_received) === 'true',
    photo_count: photos.length,
    completion_notes: text(closeout.completion_notes).slice(0, 500),
  };
}

/** Strip the `canonical:<kind>:` / `ginc:<kind>:` wrapper a graph node id carries. */
export function rawEntityId(id: string): string {
  const m = /^(?:canonical|ginc):[a-z_]+:(.+)$/.exec(id.trim());
  return m ? m[1] : id.trim();
}

async function loadTables(store: CanonicalStore): Promise<Map<string, Rows>> {
  const names = ['closeouts', 'jobs', 'revenue_events', 'technicians', 'organizations', 'contacts', 'vehicles', 'sites', 'assignments'] as const;
  const rows = await Promise.all(names.map((t) => store.queryTable(t, 1000).catch(() => [] as Rows)));
  const map = new Map<string, Rows>();
  names.forEach((t, i) => map.set(t, rows[i] ?? []));
  return map;
}

function labelFor(tables: Map<string, Rows>, rawId: string): { kind: string; label: string } {
  for (const t of tables.get('technicians') ?? []) {
    if (text(t.id) === rawId) return { kind: 'technician', label: text(t.full_name) || text(t.name) || 'Technician' };
  }
  for (const t of tables.get('contacts') ?? []) {
    if (text(t.id) === rawId) return { kind: 'person', label: text(t.full_name) || text(t.name) || 'Person' };
  }
  for (const t of tables.get('organizations') ?? []) {
    if (text(t.id) === rawId) return { kind: 'organization', label: text(t.name) || 'Organization' };
  }
  for (const t of tables.get('vehicles') ?? []) {
    if (text(t.id) === rawId) {
      const ymd = [t.year, t.make, t.model].map((v) => text(v) || String(v ?? '')).filter(Boolean).join(' ');
      return { kind: 'vehicle', label: text(t.unit_number) ? `Unit ${text(t.unit_number)} — ${ymd}` : ymd || 'Vehicle' };
    }
  }
  for (const t of tables.get('sites') ?? []) {
    if (text(t.id) === rawId) return { kind: 'site', label: text(t.name) || [text(t.city), text(t.state)].filter(Boolean).join(', ') || 'Site' };
  }
  for (const t of tables.get('jobs') ?? []) {
    if (text(t.id) === rawId) return { kind: 'job', label: text(t.service_type) || text(t.title) || 'Job' };
  }
  return { kind: 'entity', label: rawId };
}

/**
 * Full completed-work trail for one entity (technician, person, org,
 * vehicle, site, or job). Accepts either a graph node id
 * (`canonical:person:<id>`) or the raw canonical record id.
 */
export async function getWorkHistory(entityId: string, store?: CanonicalStore): Promise<EntityWorkHistory | null> {
  const canonical = store ?? getCanonicalStore();
  const rawId = rawEntityId(entityId);
  if (!rawId) return null;
  const tables = await loadTables(canonical);

  const jobsById = new Map((tables.get('jobs') ?? []).map((j) => [text(j.id), j]));
  const revenueByCloseout = new Map((tables.get('revenue_events') ?? []).map((r) => [text(r.closeout_id), r]));

  const entries: WorkHistoryEntry[] = [];
  for (const c of tables.get('closeouts') ?? []) {
    const job = jobsById.get(text(c.work_order_id));
    const related =
      text(c.technician_id) === rawId ||
      text(c.assignment_id) === rawId ||
      text(c.work_order_id) === rawId ||
      (job !== undefined && jobMatchesEntity(job, rawId));
    if (!related) continue;
    entries.push(entryFor(c, jobsById, revenueByCloseout));
  }

  const subject = labelFor(tables, rawId);
  if (!entries.length && subject.kind === 'entity') return null;

  entries.sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
  return { subject: { ...subject, id: rawId }, summary: summarize(entries), entries };
}

/**
 * Fleet-wide completed-work leaderboard: per-technician and per-organization
 * aggregates. This is the honest "track record" — it only counts rows that
 * actually exist in the store (empty until real closeouts land).
 */
export async function getWorkHistoryLeaderboard(store?: CanonicalStore): Promise<{
  summary: WorkHistorySummary;
  technicians: WorkHistoryLeader[];
  organizations: WorkHistoryLeader[];
}> {
  const canonical = store ?? getCanonicalStore();
  const tables = await loadTables(canonical);
  const jobsById = new Map((tables.get('jobs') ?? []).map((j) => [text(j.id), j]));
  const revenueByCloseout = new Map((tables.get('revenue_events') ?? []).map((r) => [text(r.closeout_id), r]));

  const byTech = new Map<string, WorkHistoryEntry[]>();
  const byOrg = new Map<string, WorkHistoryEntry[]>();
  const all: WorkHistoryEntry[] = [];

  for (const c of tables.get('closeouts') ?? []) {
    const entry = entryFor(c, jobsById, revenueByCloseout);
    all.push(entry);
    const techId = entry.technician_id;
    if (techId) byTech.set(techId, [...(byTech.get(techId) ?? []), entry]);
    const orgId = text(jobsById.get(entry.work_order_id)?.organization_id);
    if (orgId) byOrg.set(orgId, [...(byOrg.get(orgId) ?? []), entry]);
  }

  const toLeader = (kind: WorkHistoryLeader['kind'], id: string, entries: WorkHistoryEntry[]): WorkHistoryLeader => {
    const s = summarize(entries);
    return {
      kind, id,
      label: labelFor(tables, id).label,
      jobs_completed: s.jobs_completed,
      revenue_cents: s.revenue_cents,
      gross_margin_cents: s.gross_margin_cents,
      hours_worked: s.hours_worked,
      avg_customer_rating: s.avg_customer_rating,
      qa_pass_rate: s.qa_pass_rate,
    };
  };

  const technicians = [...byTech.entries()]
    .map(([id, entries]) => toLeader('technician', id, entries))
    .sort((a, b) => b.jobs_completed - a.jobs_completed || b.revenue_cents - a.revenue_cents);
  const organizations = [...byOrg.entries()]
    .map(([id, entries]) => toLeader('organization', id, entries))
    .sort((a, b) => b.jobs_completed - a.jobs_completed || b.revenue_cents - a.revenue_cents);

  return { summary: summarize(all), technicians, organizations };
}
