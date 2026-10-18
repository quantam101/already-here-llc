import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { loadConnectionGraph, lookupGraph, type GraphNodeKind } from '@/lib/connection-graph';
import { isRateLimited } from '@/lib/ginc-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KINDS = new Set<GraphNodeKind>([
  'person', 'organization', 'vehicle', 'equipment', 'site', 'job',
  'listing', 'skill', 'lead', 'opportunity', 'dispatch', 'knowledge',
]);

function clientKey(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return 'unknown';
}

/**
 * GET /api/network — unified person / vehicle / equipment / job lookup.
 *
 * Joins the canonical store (orgs, contacts, technicians, sites, assets,
 * vehicles, jobs, assignments, closeouts, skills) with the GINC member /
 * listing / job network into one connection graph.
 *
 *   ?q=<text>    substring match over label, detail, location, status
 *   ?kind=<k>    one of: person, organization, vehicle, equipment, site,
 *                job, listing, skill, lead, opportunity, dispatch
 *   ?id=<node>   exact node id (e.g. ginc:listing:LST-001)
 *   ?limit=<n>   max matched nodes (default 50, cap 200)
 *
 * Response: matched `nodes`, their direct `connections`, the `edges`
 * between them, and graph `stats`. Direct identifiers (email, phone,
 * street address, VIN, plate) are never returned.
 */
// Canonical rows are private business records (customers, technicians,
// work orders, assets). Anonymous callers get the public GINC graph
// only; the full graph requires an internal admin bearer.
function isAuthorized(request: Request): boolean {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
  if (!token) return false;
  const keys = [process.env.AHFOS_INTERNAL_API_KEY, process.env.GINC_ADMIN_KEY]
    .map((k) => k?.trim()).filter((k): k is string => !!k);
  return keys.some((key) => {
    if (key.length !== token.length) return false;
    try {
      return timingSafeEqual(Buffer.from(key), Buffer.from(token));
    } catch {
      return false;
    }
  });
}

export async function GET(request: Request) {
  if (await isRateLimited(clientKey(request), 60, 60)) {
    return NextResponse.json({ ok: false, error: 'Too many requests.' }, { status: 429 });
  }
  const includeCanonical = isAuthorized(request);

  const { searchParams } = new URL(request.url);
  const kindParam = searchParams.get('kind')?.trim();
  const kind = kindParam && KINDS.has(kindParam as GraphNodeKind) ? kindParam as GraphNodeKind : undefined;
  if (kindParam && !kind) {
    return NextResponse.json({ ok: false, error: `Unknown kind '${kindParam}'.`, kinds: [...KINDS] }, { status: 400 });
  }
  const limit = Number(searchParams.get('limit') ?? 50);

  const graph = await loadConnectionGraph(undefined, includeCanonical);
  const q = searchParams.get('q') ?? undefined;
  const id = searchParams.get('id')?.trim() || undefined;
  const result = lookupGraph(graph, { q, kind, id, limit: Number.isFinite(limit) ? limit : 50 });

  return NextResponse.json({
    ok: true,
    scope: includeCanonical ? 'full' : 'public',
    count: result.matches.length,
    nodes: result.matches,
    connections: result.connections,
    edges: result.edges,
    stats: result.stats,
  });
}
