import { createHmac } from 'crypto';
import { canonicalId, canonicalSlug } from './canonical-ids';
import type { CanonicalStore, DatabaseReadyWrite } from './canonical-store';
import { buildFollowUpRecord } from './followups';

/**
 * Area prospecting: every onboarded technician gets a client/contract scan for
 * their own service area, so new techs come with a local pipeline.
 *
 * Trigger: applicant paperwork complete (W-9 + independent contractor agreement
 * by default) or an operator/backfill request.
 * Output: one `area_prospect_scans` job per area (applicants in the same area
 * share it), a `followups` review item for the operator, and an optional signed
 * webhook to the ProfitEngine scanner.
 *
 * Guardrail: research only. Nothing here contacts a prospect. Scan results land
 * as review items; any outreach stays behind the approval gate
 * (approvals/policy.yaml: client_outreach, email_send).
 */

export type PaperworkItem = 'w9' | 'contractor_agreement' | 'coi' | 'background_check' | 'direct_deposit';
export type ScanTrigger = 'paperwork_complete' | 'operator_request' | 'backfill';

export const PAPERWORK_ITEMS: readonly PaperworkItem[] = ['w9', 'contractor_agreement', 'coi', 'background_check', 'direct_deposit'];
export const DEFAULT_REQUIRED_PAPERWORK: readonly PaperworkItem[] = ['w9', 'contractor_agreement'];

export interface ProspectingApplicant {
  applicantId: string;
  fullName?: string;
  companyName?: string;
  city: string;
  state: string;
  zipCode?: string;
  workLanes: string[];
  travelRadiusMiles: number;
  transportation?: string;
  availability?: string;
  skills?: string;
}

export interface PaperworkStatus {
  complete: boolean;
  received: PaperworkItem[];
  missing: PaperworkItem[];
  required: PaperworkItem[];
}

export interface AreaScanPlan {
  scanId: string;
  areaKey: string;
  areaLabel: string;
  city: string;
  state: string;
  zipCode: string | null;
  radiusMiles: number;
  lanes: string[];
  queries: string[];
  targetSegments: string[];
  skipped: boolean;
  skipReason: string | null;
}

const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA',
  'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY'
};

/** Work lane (as submitted on the applicant form) -> who buys that work. */
const LANE_SEGMENTS: Array<{ match: RegExp; lane: string; segments: string[]; queryTerms: string[] }> = [
  {
    match: /smart hands|remote hands/i,
    lane: 'smart_hands',
    segments: ['data center / colocation operators', 'national field-service providers dispatching smart hands'],
    queryTerms: ['smart hands technician contract', 'data center remote hands']
  },
  {
    match: /network|router|switch|access point|\bap\b/i,
    lane: 'network',
    segments: ['managed service providers (MSPs)', 'network integrators running multi-site rollouts'],
    queryTerms: ['managed IT services', 'network installation subcontractor', 'contract network field technician']
  },
  {
    match: /pos|printer|kiosk|scanner/i,
    lane: 'pos',
    segments: ['POS resellers and retail technology providers', 'retail and restaurant chains with multi-site refreshes'],
    queryTerms: ['POS installation company', 'retail technology field service contractor']
  },
  {
    match: /low-voltage|low voltage|cabling/i,
    lane: 'low_voltage',
    segments: ['low-voltage and structured cabling contractors', 'general contractors needing cabling subs'],
    queryTerms: ['low voltage contractor', 'structured cabling subcontractor']
  },
  {
    match: /access control|camera|cctv|\bav\b|audio/i,
    lane: 'access_control',
    segments: ['security / access control integrators', 'AV integrators'],
    queryTerms: ['security systems integrator', 'access control installer', 'audio visual integrator']
  },
  {
    match: /healthcare|medical/i,
    lane: 'healthcare',
    segments: ['healthcare IT and clinic networks'],
    queryTerms: ['healthcare IT services field technician']
  }
];

const ALWAYS_QUERY_TERMS = ['1099 field technician', 'IT field service subcontractor'];

const REMOTE_ONLY = /\b(remote(?:\s+assignments)?\s+only|fully remote|no (?:travel|onsite|on-site)|no onsite assignments)\b/i;

export function normalizeState(state: string): string {
  const trimmed = (state ?? '').trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return STATE_ABBREVIATIONS[trimmed.toLowerCase()] ?? trimmed.toUpperCase();
}

export function titleCaseCity(city: string): string {
  return (city ?? '')
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

export function areaKeyFor(city: string, state: string): string {
  return `${normalizeState(state).toLowerCase()}-${canonicalSlug(titleCaseCity(city))}`;
}

export function requiredPaperwork(env: Record<string, string | undefined> = process.env): PaperworkItem[] {
  const configured = env.PAPERWORK_REQUIRED_ITEMS?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
  const valid = configured.filter((item): item is PaperworkItem => (PAPERWORK_ITEMS as readonly string[]).includes(item));
  return valid.length > 0 ? valid : [...DEFAULT_REQUIRED_PAPERWORK];
}

export function evaluatePaperwork(received: string[], required: PaperworkItem[] = requiredPaperwork()): PaperworkStatus {
  const receivedSet = new Set(
    received.filter((item): item is PaperworkItem => (PAPERWORK_ITEMS as readonly string[]).includes(item))
  );
  const missing = required.filter((item) => !receivedSet.has(item));
  return { complete: missing.length === 0, received: [...receivedSet], missing, required };
}

export function isRemoteOnly(applicant: Pick<ProspectingApplicant, 'transportation' | 'availability'>): boolean {
  return REMOTE_ONLY.test(`${applicant.transportation ?? ''} ${applicant.availability ?? ''}`);
}

/** Radius actually worth prospecting: keep it local even for techs who will travel far. */
export function prospectingRadius(travelRadiusMiles: number): number {
  const radius = Number.isFinite(travelRadiusMiles) ? travelRadiusMiles : 25;
  return Math.max(15, Math.min(radius, 100));
}

export function buildAreaScanPlan(applicant: ProspectingApplicant): AreaScanPlan {
  const state = normalizeState(applicant.state);
  const city = titleCaseCity(applicant.city);
  const areaKey = areaKeyFor(applicant.city, applicant.state);
  const matchedLanes = LANE_SEGMENTS.filter((entry) => applicant.workLanes.some((lane) => entry.match.test(lane)));
  const lanes = matchedLanes.map((entry) => entry.lane);
  const segments = [...new Set(matchedLanes.flatMap((entry) => entry.segments))];
  const radiusMiles = prospectingRadius(applicant.travelRadiusMiles);
  const place = `${city}, ${state}`;
  const queries = [...new Set([...ALWAYS_QUERY_TERMS, ...matchedLanes.flatMap((entry) => entry.queryTerms)])]
    .map((term) => `${term} ${place}`);

  const remoteOnly = isRemoteOnly(applicant);
  const noLanes = lanes.length === 0;

  return {
    scanId: canonicalId('areascan', areaKey),
    areaKey,
    areaLabel: `${place} (${radiusMiles} mi)`,
    city,
    state,
    zipCode: applicant.zipCode?.trim() || null,
    radiusMiles,
    lanes,
    queries,
    targetSegments: segments,
    skipped: remoteOnly || noLanes,
    skipReason: remoteOnly ? 'remote_only_applicant' : noLanes ? 'no_onsite_work_lanes' : null
  };
}

export interface QueueScanResult {
  plan: AreaScanPlan;
  writes: DatabaseReadyWrite[];
  joinedExistingScan: boolean;
}

/**
 * Build the writes that queue (or join) an area scan for one applicant.
 * `existingScan` is the current `area_prospect_scans` record for the area, if any.
 */
export function buildAreaScanWrites(
  applicant: ProspectingApplicant,
  trigger: ScanTrigger,
  existingScan?: Record<string, unknown>,
  now = new Date().toISOString()
): QueueScanResult {
  const plan = buildAreaScanPlan(applicant);
  if (plan.skipped) return { plan, writes: [], joinedExistingScan: false };

  const priorApplicants = Array.isArray(existingScan?.applicant_ids) ? (existingScan?.applicant_ids as string[]) : [];
  const applicantIds = [...new Set([...priorApplicants, applicant.applicantId])];
  const priorLanes = Array.isArray(existingScan?.lanes) ? (existingScan?.lanes as string[]) : [];
  const lanes = [...new Set([...priorLanes, ...plan.lanes])];
  const priorQueries = Array.isArray(existingScan?.queries) ? (existingScan?.queries as string[]) : [];
  const queries = [...new Set([...priorQueries, ...plan.queries])];
  const radiusMiles = Math.max(Number(existingScan?.radius_miles ?? 0), plan.radiusMiles);
  const joinedExistingScan = Boolean(existingScan);
  const priorStatus = String(existingScan?.status ?? '');
  const status = priorStatus === 'running' ? 'running' : 'queued';

  const scanWrite: DatabaseReadyWrite = {
    table: 'area_prospect_scans',
    id: plan.scanId,
    action: 'upsert',
    record: {
      id: plan.scanId,
      area_key: plan.areaKey,
      area_label: `${plan.city}, ${plan.state} (${radiusMiles} mi)`,
      city: plan.city,
      state: plan.state,
      zip_code: plan.zipCode ?? existingScan?.zip_code ?? null,
      radius_miles: radiusMiles,
      lanes,
      queries,
      target_segments: [...new Set([...(Array.isArray(existingScan?.target_segments) ? existingScan?.target_segments as string[] : []), ...plan.targetSegments])],
      applicant_ids: applicantIds,
      status,
      last_trigger: trigger,
      requested_at: now,
      outreach_allowed: false,
      approval_required: true,
      approval_policy: 'client_outreach',
      source: 'area_prospecting',
      created_at: existingScan?.created_at ?? now,
      updated_at: now
    }
  };

  const writes: DatabaseReadyWrite[] = [scanWrite];

  if (!joinedExistingScan || !priorApplicants.includes(applicant.applicantId)) {
    writes.push(buildFollowUpRecord({
      source: 'area_prospecting',
      sourceId: plan.scanId,
      organizationId: canonicalId('org', 'already-here-llc'),
      relatedRecordType: 'area_prospect_scan',
      relatedRecordId: plan.scanId,
      lane: 'client_prospecting',
      purpose: `Review client leads for ${plan.city}, ${plan.state} so ${applicant.fullName || applicant.applicantId} has local work`,
      channel: 'other',
      offer: lanes.join(', '),
      notes: `Trigger: ${trigger}. Research only; approve before any outreach.`,
      status: 'open',
      createdAt: now
    }));
  }

  writes.push({
    table: 'applicant_area_scans',
    id: canonicalId('applicant_area_scan', applicant.applicantId, plan.scanId),
    action: 'upsert',
    record: {
      applicant_id: applicant.applicantId,
      scan_id: plan.scanId,
      area_key: plan.areaKey,
      trigger,
      source: 'area_prospecting',
      created_at: now,
      updated_at: now
    }
  });

  return { plan, writes, joinedExistingScan };
}

export function applicantFromRecord(record: Record<string, unknown>): ProspectingApplicant {
  const lanes = record.workLanes ?? record.work_lanes;
  return {
    applicantId: String(record.applicantId ?? record.applicant_id ?? record.id ?? ''),
    fullName: String(record.fullName ?? record.full_name ?? ''),
    companyName: String(record.companyName ?? record.company_name ?? ''),
    city: String(record.city ?? ''),
    state: String(record.state ?? ''),
    zipCode: String(record.zipCode ?? record.zip_code ?? ''),
    workLanes: Array.isArray(lanes) ? lanes.map(String) : String(lanes ?? '').split(',').map((lane) => lane.trim()).filter(Boolean),
    travelRadiusMiles: Number(record.travelRadiusMiles ?? record.travel_radius_miles ?? 25),
    transportation: String(record.transportation ?? ''),
    availability: String(record.availability ?? ''),
    skills: String(record.skills ?? record.skills_text ?? '')
  };
}

export interface ScanDispatchResult {
  attempted: boolean;
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Hand the scan job to the ProfitEngine scanner, if one is configured.
 * Payload is signed with HMAC-SHA256 (x-ah-signature) when a secret is set.
 * The payload carries area and lanes only, never applicant contact details.
 */
export async function dispatchScanToProfitEngine(
  scanRecord: Record<string, unknown>,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<ScanDispatchResult> {
  const url = env.PROFITENGINE_AREA_SCAN_WEBHOOK_URL?.trim();
  if (!url) return { attempted: false, ok: false };
  const body = JSON.stringify({
    type: 'area_prospect_scan',
    scan_id: scanRecord.id,
    area_key: scanRecord.area_key,
    city: scanRecord.city,
    state: scanRecord.state,
    zip_code: scanRecord.zip_code,
    radius_miles: scanRecord.radius_miles,
    lanes: scanRecord.lanes,
    queries: scanRecord.queries,
    target_segments: scanRecord.target_segments,
    outreach_allowed: false,
    callback: 'results land as review items; no prospect contact without operator approval'
  });
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Idempotency-Key': String(scanRecord.id) };
  const secret = env.PROFITENGINE_AREA_SCAN_WEBHOOK_SECRET?.trim();
  if (secret) headers['x-ah-signature'] = createHmac('sha256', secret).update(body).digest('hex');
  try {
    const response = await fetchImpl(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) });
    return { attempted: true, ok: response.ok, status: response.status };
  } catch (error) {
    return { attempted: true, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Queue (or join) the area scan for an applicant and record it in the store. */
export async function queueAreaScan(
  store: CanonicalStore,
  applicant: ProspectingApplicant,
  trigger: ScanTrigger,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<{ plan: AreaScanPlan; queued: boolean; joinedExistingScan: boolean; dispatch: ScanDispatchResult }> {
  const planPreview = buildAreaScanPlan(applicant);
  if (planPreview.skipped) {
    return { plan: planPreview, queued: false, joinedExistingScan: false, dispatch: { attempted: false, ok: false } };
  }
  const existing = await store.getRecord('area_prospect_scans', planPreview.scanId);
  const { plan, writes, joinedExistingScan } = buildAreaScanWrites(applicant, trigger, existing);
  const result = await store.executeWrites(writes);
  if (!result.ok) throw new Error(result.failed.map((item) => `${item.table}:${item.id} ${item.error}`).join('; '));
  const scanRecord = writes.find((write) => write.table === 'area_prospect_scans')?.record ?? {};
  const dispatch = await dispatchScanToProfitEngine(scanRecord, env, fetchImpl);
  if (dispatch.attempted) {
    await store.executeWrites([{
      table: 'area_prospect_scans',
      id: plan.scanId,
      action: 'upsert',
      record: {
        dispatch_status: dispatch.ok ? 'sent_to_profitengine' : 'dispatch_failed',
        dispatch_error: dispatch.error ?? (dispatch.ok ? null : `status ${dispatch.status}`),
        updated_at: new Date().toISOString()
      }
    }]).catch(() => null);
  }
  return { plan, queued: true, joinedExistingScan, dispatch };
}

/** Group applicants by area for a backfill run. Remote-only applicants are listed but not scanned. */
export function groupApplicantsByArea(applicants: ProspectingApplicant[]): Array<{ plan: AreaScanPlan; applicantIds: string[] }> {
  const groups = new Map<string, { plan: AreaScanPlan; applicantIds: string[] }>();
  for (const applicant of applicants) {
    const plan = buildAreaScanPlan(applicant);
    const key = plan.skipped ? `skipped:${applicant.applicantId}` : plan.areaKey;
    const existing = groups.get(key);
    if (existing) {
      existing.applicantIds.push(applicant.applicantId);
      existing.plan = {
        ...existing.plan,
        radiusMiles: Math.max(existing.plan.radiusMiles, plan.radiusMiles),
        lanes: [...new Set([...existing.plan.lanes, ...plan.lanes])],
        queries: [...new Set([...existing.plan.queries, ...plan.queries])],
        targetSegments: [...new Set([...existing.plan.targetSegments, ...plan.targetSegments])]
      };
    } else {
      groups.set(key, { plan, applicantIds: [applicant.applicantId] });
    }
  }
  return [...groups.values()];
}
