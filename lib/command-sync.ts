import { safeCanonicalUpsert } from './canonical-upsert';
import type { CanonicalStore } from './canonical-store';
import { getCanonicalStore } from './canonical-store';

/**
 * Daily Command OS intake → canonical graph sync.
 *
 * Pulls Leads, RFQs, and DispatchRequests from the daily-command-os
 * /api/sync/export endpoint and upserts them into the canonical store
 * with `dcos-`-prefixed ids, so the connection graph links command-side
 * intake to field-operations jobs, people, and vehicles.
 *
 * Records carry `source: 'daily-command-os'`; re-running the sync is
 * idempotent because upserts merge into the same canonical ids.
 */

export interface DcosLead {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  channel?: string | null;
  message?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface DcosRfq {
  id: string;
  requester?: string | null;
  email?: string | null;
  details?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface DcosDispatch {
  id: string;
  requester?: string | null;
  service?: string | null;
  location?: string | null;
  urgency?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

interface DcosExport {
  leads?: DcosLead[];
  rfqs?: DcosRfq[];
  dispatchRequests?: DcosDispatch[];
}

export interface SyncSummary {
  ok: boolean;
  fetched: { leads: number; rfqs: number; dispatchRequests: number };
  upserted: number;
  errors: string[];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function locationParts(location: string): { city: string; state: string } {
  // DispatchRequest.location is freeform ("Tempe, AZ"); best-effort split.
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { city: parts[0], state: parts[parts.length - 1] };
  return { city: location, state: '' };
}

export async function syncFromExport(payload: DcosExport, store: CanonicalStore = getCanonicalStore()): Promise<SyncSummary> {
  const errors: string[] = [];
  let upserted = 0;

  const write = async (table: string, id: string, record: Record<string, unknown>) => {
    try {
      await safeCanonicalUpsert(table, id, record, store);
      upserted += 1;
    } catch (error) {
      errors.push(`${table}:${id}: ${error instanceof Error ? error.message : 'write failed'}`);
    }
  };

  for (const lead of payload.leads ?? []) {
    const contactId = `dcos-contact-${lead.id}`;
    const orgId = lead.company ? `dcos-org-${lead.id}` : undefined;
    const created = text(lead.createdAt) || undefined;

    if (orgId) {
      await write('organizations', orgId, {
        name: text(lead.company) || 'Unknown Organization',
        organization_type: 'lead_source',
        source: 'daily-command-os',
        created_at: created,
      });
    }
    await write('contacts', contactId, {
      organization_id: orgId ?? null,
      full_name: text(lead.name) || 'Unknown Contact',
      email: text(lead.email) || null,
      phone: text(lead.phone) || null,
      source: 'daily-command-os',
      channel: text(lead.channel) || 'unknown',
      created_at: created,
    });
    await write('leads', `dcos-lead-${lead.id}`, {
      contact_id: contactId,
      organization_id: orgId ?? null,
      title: `[${text(lead.channel) || 'lead'}] ${text(lead.name) || 'Inbound lead'}`,
      body: text(lead.message),
      lane: 'Lead',
      source_channel: text(lead.channel) || 'daily-command-os',
      source: 'daily-command-os',
      status: text(lead.status) || 'uncontacted',
      created_at: created,
    });
  }

  for (const rfq of payload.rfqs ?? []) {
    const contactId = `dcos-contact-rfq-${rfq.id}`;
    const created = text(rfq.createdAt) || undefined;

    await write('contacts', contactId, {
      full_name: text(rfq.requester) || 'RFQ Requester',
      email: text(rfq.email) || null,
      source: 'daily-command-os',
      channel: 'rfq',
      created_at: created,
    });
    await write('leads', `dcos-rfq-${rfq.id}`, {
      contact_id: contactId,
      title: `RFQ — ${text(rfq.requester) || 'requester'}`,
      body: text(rfq.details),
      lane: 'RFQ',
      source_channel: 'rfq',
      source: 'daily-command-os',
      status: text(rfq.status) || 'new',
      created_at: created,
    });
  }

  for (const dispatch of payload.dispatchRequests ?? []) {
    const contactId = `dcos-contact-dispatch-${dispatch.id}`;
    const jobId = `dcos-job-${dispatch.id}`;
    const created = text(dispatch.createdAt) || undefined;
    const { city, state } = locationParts(text(dispatch.location));

    await write('contacts', contactId, {
      full_name: text(dispatch.requester) || 'Dispatch Requester',
      source: 'daily-command-os',
      channel: 'dispatch',
      created_at: created,
    });
    await write('jobs', jobId, {
      title: text(dispatch.service) || 'Dispatch request',
      service_type: text(dispatch.service) || 'dispatch',
      location_city: city || null,
      location_state: state || null,
      status: text(dispatch.status) || 'new',
      source: 'daily-command-os',
      created_at: created,
    });
    await write('dispatches', `dcos-dispatch-${dispatch.id}`, {
      job_id: jobId,
      contact_id: contactId,
      title: text(dispatch.service) || 'Dispatch request',
      dispatch_status: text(dispatch.status) || 'new',
      urgency: text(dispatch.urgency) || 'standard',
      city: city || null,
      state: state || null,
      source: 'daily-command-os',
      created_at: created,
    });
  }

  return {
    ok: errors.length === 0,
    fetched: {
      leads: payload.leads?.length ?? 0,
      rfqs: payload.rfqs?.length ?? 0,
      dispatchRequests: payload.dispatchRequests?.length ?? 0,
    },
    upserted,
    errors,
  };
}

/**
 * Pull the export from daily-command-os and sync it. Requires
 * DCOS_SYNC_SECRET (the command brain's admin-tier bearer) and uses
 * COMMAND_CENTER_URL (defaulting to the production deployment).
 * Pages through truncated exports via `nextSince` until complete —
 * upserts are idempotent, so boundary re-reads are harmless.
 */
export async function syncFromDailyCommand(since?: string, store?: CanonicalStore): Promise<SyncSummary> {
  const secret = process.env.DCOS_SYNC_SECRET?.trim();
  if (!secret) throw new Error('DCOS_SYNC_SECRET not configured.');
  const base = (process.env.COMMAND_CENTER_URL?.trim() || 'https://daily-command-os.vercel.app').replace(/\/$/, '');
  const canonical = store ?? getCanonicalStore();

  const combined: SyncSummary = {
    ok: true,
    fetched: { leads: 0, rfqs: 0, dispatchRequests: 0 },
    upserted: 0,
    errors: [],
  };

  let cursor = since;
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({ limit: '500' });
    if (cursor) params.set('since', cursor);
    const res = await fetch(`${base}/api/sync/export?${params}`, {
      headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      combined.ok = false;
      combined.errors.push(`daily-command-os export failed: HTTP ${res.status}`);
      return combined;
    }
    const payload = (await res.json()) as DcosExport & { nextSince?: string; truncated?: boolean };
    const part = await syncFromExport(payload, canonical);
    combined.fetched.leads += part.fetched.leads;
    combined.fetched.rfqs += part.fetched.rfqs;
    combined.fetched.dispatchRequests += part.fetched.dispatchRequests;
    combined.upserted += part.upserted;
    combined.errors.push(...part.errors);
    combined.ok = combined.errors.length === 0;

    if (!payload.truncated || !payload.nextSince || payload.nextSince === cursor) {
      return combined;
    }
    cursor = payload.nextSince;
  }
  // Page cap hit while the export is still truncated — report honestly
  // that records beyond it were not synced rather than claiming success.
  combined.ok = false;
  combined.errors.push(`Export still truncated after page cap; resume with since=${cursor}.`);
  return combined;
}
