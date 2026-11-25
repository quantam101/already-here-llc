import { NextResponse } from 'next/server';
import { getCanonicalStore } from '@/lib/canonical-store';
import { canonicalId } from '@/lib/canonical-ids';
import { isInternalAuthorized } from '@/lib/internal-auth';
import { PAPERWORK_ITEMS, applicantFromRecord, evaluatePaperwork, queueAreaScan, type PaperworkItem } from '@/lib/area-prospecting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/applicants/paperwork — record onboarding paperwork for an applicant.
 * Internal-only. Body: { applicantId, received: ["w9", "contractor_agreement", ...], note? }
 * When the required set is complete (PAPERWORK_REQUIRED_ITEMS, default w9 +
 * contractor_agreement), queues a client/contract scan for the applicant's area.
 * The scan is research only: results go to the review queue, no prospect is contacted.
 *
 * GET /api/applicants/paperwork?applicantId=... — current paperwork status.
 */
export async function POST(request: Request) {
  if (!isInternalAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Internal key required.' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const applicantId = typeof body.applicantId === 'string' ? body.applicantId.trim() : '';
  if (!applicantId) return NextResponse.json({ ok: false, error: 'applicantId required.' }, { status: 400 });

  const receivedInput = Array.isArray(body.received) ? body.received.map(String) : [];
  const unknown = receivedInput.filter((item) => !(PAPERWORK_ITEMS as readonly string[]).includes(item));
  if (unknown.length > 0) {
    return NextResponse.json({ ok: false, error: `Unknown paperwork items: ${unknown.join(', ')}`, allowed: PAPERWORK_ITEMS }, { status: 400 });
  }

  const store = getCanonicalStore();
  const applicant = await store.getRecord('applicants', applicantId);
  if (!applicant) return NextResponse.json({ ok: false, error: 'Applicant not found.' }, { status: 404 });

  const paperworkId = canonicalId('applicant_paperwork', applicantId);
  const existing = await store.getRecord('applicant_paperwork', paperworkId);
  const priorReceived = Array.isArray(existing?.received) ? (existing?.received as PaperworkItem[]) : [];
  const status = evaluatePaperwork([...priorReceived, ...receivedInput]);
  const now = new Date().toISOString();
  const alreadyTriggered = Boolean(existing?.area_scan_queued_at);

  const writes = await store.executeWrites([{
    table: 'applicant_paperwork',
    id: paperworkId,
    action: 'upsert',
    record: {
      applicant_id: applicantId,
      received: status.received,
      missing: status.missing,
      required: status.required,
      complete: status.complete,
      completed_at: status.complete ? (existing?.completed_at ?? now) : null,
      note: typeof body.note === 'string' ? body.note.slice(0, 1000) : existing?.note ?? null,
      source: 'operator_paperwork_update',
      created_at: existing?.created_at ?? now,
      updated_at: now
    }
  }]);
  if (!writes.ok) {
    return NextResponse.json({ ok: false, error: 'Could not save paperwork status.' }, { status: 500 });
  }

  if (!status.complete || alreadyTriggered) {
    return NextResponse.json({ ok: true, applicantId, ...status, areaScan: alreadyTriggered ? 'already_queued' : 'waiting_on_paperwork' });
  }

  try {
    const scan = await queueAreaScan(store, applicantFromRecord(applicant), 'paperwork_complete');
    if (scan.queued) {
      await store.executeWrites([{
        table: 'applicant_paperwork',
        id: paperworkId,
        action: 'upsert',
        record: { area_scan_queued_at: now, area_scan_id: scan.plan.scanId, updated_at: now }
      }]);
    }
    return NextResponse.json({
      ok: true,
      applicantId,
      ...status,
      areaScan: scan.queued ? (scan.joinedExistingScan ? 'joined_existing_scan' : 'queued') : 'skipped',
      skipReason: scan.plan.skipReason,
      scanId: scan.plan.scanId,
      area: scan.plan.areaLabel,
      dispatch: scan.dispatch
    });
  } catch (error) {
    console.error('[applicants/paperwork] area scan failed', { applicantId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: true, applicantId, ...status, areaScan: 'failed_retry_later' }, { status: 202 });
  }
}

export async function GET(request: Request) {
  if (!isInternalAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Internal key required.' }, { status: 401 });
  }
  const applicantId = new URL(request.url).searchParams.get('applicantId')?.trim() ?? '';
  if (!applicantId) return NextResponse.json({ ok: false, error: 'applicantId required.' }, { status: 400 });
  const record = await getCanonicalStore().getRecord('applicant_paperwork', canonicalId('applicant_paperwork', applicantId));
  const status = evaluatePaperwork(Array.isArray(record?.received) ? (record?.received as string[]) : []);
  return NextResponse.json({ ok: true, applicantId, ...status, areaScanId: record?.area_scan_id ?? null });
}
