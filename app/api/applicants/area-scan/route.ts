import { NextResponse } from 'next/server';
import { getCanonicalStore } from '@/lib/canonical-store';
import { isInternalAuthorized } from '@/lib/internal-auth';
import { applicantFromRecord, queueAreaScan, type ProspectingApplicant } from '@/lib/area-prospecting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const maxBatch = 50;

/**
 * POST /api/applicants/area-scan — queue area client scans without waiting on paperwork.
 * Internal-only. Used by the operator and by scripts/backfill-area-prospecting.mjs.
 * Body: { applicantIds?: string[], applicants?: ProspectingApplicant[], trigger?: "backfill" | "operator_request" }
 * `applicants` carries area fields only (id, city, state, zip, lanes, radius,
 * transportation/availability text) for applicants that predate the canonical store.
 * Research only; nothing here contacts a prospect.
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Internal key required.' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const trigger = body.trigger === 'operator_request' ? 'operator_request' : 'backfill';
  const store = getCanonicalStore();

  const applicants: ProspectingApplicant[] = [];
  const notFound: string[] = [];
  const ids = Array.isArray(body.applicantIds) ? body.applicantIds.map(String).slice(0, maxBatch) : [];
  for (const id of ids) {
    const record = await store.getRecord('applicants', id);
    if (record) applicants.push(applicantFromRecord(record));
    else notFound.push(id);
  }
  const inline = Array.isArray(body.applicants) ? body.applicants.slice(0, maxBatch - applicants.length) : [];
  for (const raw of inline) {
    if (raw && typeof raw === 'object') {
      const applicant = applicantFromRecord(raw as Record<string, unknown>);
      if (applicant.applicantId && applicant.city && applicant.state) applicants.push(applicant);
    }
  }
  if (applicants.length === 0) {
    return NextResponse.json({ ok: false, error: 'No applicants to scan.', notFound }, { status: 400 });
  }

  const results = [];
  for (const applicant of applicants) {
    try {
      const scan = await queueAreaScan(store, applicant, trigger);
      results.push({
        applicantId: applicant.applicantId,
        area: scan.plan.areaLabel,
        scanId: scan.plan.scanId,
        status: scan.queued ? (scan.joinedExistingScan ? 'joined_existing_scan' : 'queued') : 'skipped',
        skipReason: scan.plan.skipReason
      });
    } catch (error) {
      results.push({ applicantId: applicant.applicantId, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }
  return NextResponse.json({ ok: true, trigger, results, notFound });
}
