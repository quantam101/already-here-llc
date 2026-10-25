import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server.js';
import { GINC_SAMPLE_ID_SET, purgeGincRecords, removeGincRecord, type GincEntityKind } from '@/lib/ginc-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sample ids previously fabricated by the auto-seeder. They are demo
// records, not real network data, and must not survive in prod.
export const GINC_SAMPLE_IDS = [...GINC_SAMPLE_ID_SET];

const KINDS = new Set<GincEntityKind>(['member', 'listing', 'job']);

function isAuthorized(request: Request): boolean {
  const expected = process.env.GINC_ADMIN_KEY?.trim();
  if (!expected) return false;
  // Header-only: keys never travel in the query string (logs, Referer).
  const header = request.headers.get('x-admin-key') ?? '';
  if (header.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * DELETE /api/ginc/admin — admin removal of GINC records.
 *
 *   ?kind=member|listing|job&id=<record>   remove one record
 *   ?purge_samples=true                    remove the fabricated seed
 *                                          records (MEM-001/002,
 *                                          LST-001, JOB-001) everywhere
 *
 * Requires the `x-admin-key` header matching GINC_ADMIN_KEY.
 */
export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  if (searchParams.get('purge_samples') === 'true') {
    const { removed } = await purgeGincRecords(GINC_SAMPLE_IDS);
    return NextResponse.json({ ok: true, purged: 'samples', removed });
  }

  const kind = searchParams.get('kind') as GincEntityKind | null;
  const id = searchParams.get('id')?.trim();
  if (!kind || !KINDS.has(kind)) {
    return NextResponse.json({ ok: false, error: "kind must be one of 'member', 'listing', 'job'." }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id is required.' }, { status: 400 });
  }

  const removed = await removeGincRecord(kind, id);
  if (!removed) {
    return NextResponse.json({ ok: false, error: `${kind} '${id}' not found.` }, { status: 404 });
  }
  return NextResponse.json({ ok: true, removed: id });
}
