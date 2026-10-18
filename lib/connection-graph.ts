import { getCanonicalStore, type CanonicalStore } from './canonical-store';
import { loadNetwork } from './ginc-store';
import { sanitizeMember } from './ginc-store';
import type { GincNetwork } from './ginc';

/**
 * Unified person / vehicle / equipment / job connection graph.
 *
 * Joins the canonical store tables (organizations, contacts, technicians,
 * sites, assets, vehicles, jobs, assignments, closeouts, skills) with the
 * GINC member/listing/job network into one node-edge view so lookups can
 * answer "which people connect to which vehicles, assets, and jobs".
 *
 * Everything returned here is public-safe: direct identifiers (email,
 * phone, street address, zip, VIN, license plate) never leave this layer.
 */

export type GraphNodeKind =
  | 'person'
  | 'organization'
  | 'vehicle'
  | 'equipment'
  | 'site'
  | 'job'
  | 'listing'
  | 'skill'
  | 'lead'
  | 'opportunity'
  | 'dispatch'
  | 'knowledge';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  source: 'canonical' | 'ginc';
  label: string;
  detail: string;
  city: string;
  state: string;
  status: string;
  createdAt: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

export interface GraphStats {
  nodes: number;
  edges: number;
  byKind: Record<GraphNodeKind, number>;
}

export interface ConnectionGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
}

// Fields that must never surface on a public lookup — PII and direct
// identifiers. Anything not listed is treated as safe business metadata.
const PRIVATE_FIELD_PATTERNS = [
  /email/i,
  /phone/i,
  /\bzip\b/i,
  /address/i,
  /\bvin\b/i,
  /license_plate/i,
  /\bssn\b/i,
  /token/i,
  /secret/i,
];

export function publicFields(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (PRIVATE_FIELD_PATTERNS.some((p) => p.test(key))) continue;
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'object' && !Array.isArray(value)) continue;
    out[key] = value;
  }
  return out;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function firstText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return '';
}

const CANONICAL_TABLES = [
  'organizations',
  'contacts',
  'technicians',
  'sites',
  'assets',
  'vehicles',
  'jobs',
  'assignments',
  'closeouts',
  'skills',
  'technician_skills',
  'leads',
  'opportunities',
  'dispatches',
  'hauling_jobs',
  'knowledge',
] as const;

function nodeId(kind: GraphNodeKind, source: 'canonical' | 'ginc', id: string): string {
  return `${source}:${kind}:${id}`;
}

interface Builder {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  ids: Map<string, string>; // raw record id → node id
}

function addNode(b: Builder, node: GraphNode, rawId: string): void {
  const key = node.id;
  if (!b.nodes.has(key)) b.nodes.set(key, node);
  if (rawId) b.ids.set(`${node.source}:${rawId}`, key);
}

function addEdge(b: Builder, from: string | undefined, to: string | undefined, type: string): void {
  if (!from || !to || from === to) return;
  if (!b.nodes.has(from) || !b.nodes.has(to)) return;
  b.edges.push({ from, to, type });
}

function ref(b: Builder, source: 'canonical' | 'ginc', rawId: unknown): string | undefined {
  const id = text(rawId);
  if (!id) return undefined;
  return b.ids.get(`${source}:${id}`);
}

function scalar(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return text(value);
}

function vehicleLabel(record: Record<string, unknown>): string {
  const unit = firstText(record, ['unit_number', 'fleet_id', 'asset_tag', 'unit']);
  const ymd = [record.year, record.make, record.model].map(scalar).filter(Boolean).join(' ');
  const base = ymd || firstText(record, ['title', 'name']) || 'Vehicle';
  return unit ? `Unit ${unit} — ${base}` : base;
}

// Business identifiers (unit number, fleet tag) are safe to surface;
// VIN and plate stay stored-only per PRIVATE_FIELD_PATTERNS.
function vehicleDetail(record: Record<string, unknown>): string {
  return [
    firstText(record, ['unit_number', 'fleet_id', 'asset_tag', 'unit']),
    firstText(record, ['fuel_scope', 'color', 'source']),
  ].filter(Boolean).join(' · ');
}

function assetLabel(record: Record<string, unknown>): string {
  return firstText(record, ['name', 'title', 'asset_name', 'equipment_name', 'asset_type']) || 'Equipment';
}

function siteLabel(record: Record<string, unknown>): string {
  const city = firstText(record, ['city', 'site_city']);
  const state = firstText(record, ['state', 'site_state']);
  const name = firstText(record, ['site_name', 'name', 'label']);
  // Some writers fall back to "<street>, <city>, <state>" when no site
  // name is given — never publish a street address as a label.
  const address = text(record.address).toLowerCase();
  if (name && !(address && name.toLowerCase().includes(address))) return name;
  return [city, state].filter(Boolean).join(', ') || 'Site';
}

function jobLabel(record: Record<string, unknown>): string {
  return firstText(record, ['title', 'service_type', 'complaint', 'scope', 'lane']) || 'Job';
}

function jobDetail(record: Record<string, unknown>): string {
  return firstText(record, ['complaint', 'scope', 'description', 'service_type', 'lane']);
}

function buildCanonical(b: Builder, tables: Map<string, Record<string, unknown>[]>): void {
  for (const record of tables.get('organizations') ?? []) {
    addNode(b, {
      id: nodeId('organization', 'canonical', text(record.id)),
      kind: 'organization',
      source: 'canonical',
      label: firstText(record, ['name', 'legal_name']) || 'Organization',
      detail: firstText(record, ['organization_type', 'service_area', 'source']),
      city: firstText(record, ['city']),
      state: firstText(record, ['state']),
      status: firstText(record, ['status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('contacts') ?? []) {
    addNode(b, {
      id: nodeId('person', 'canonical', text(record.id)),
      kind: 'person',
      source: 'canonical',
      label: firstText(record, ['full_name', 'name']) || 'Contact',
      detail: firstText(record, ['role', 'channel', 'source']),
      city: firstText(record, ['city']),
      state: firstText(record, ['state']),
      status: firstText(record, ['status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('technicians') ?? []) {
    addNode(b, {
      id: nodeId('person', 'canonical', text(record.id)),
      kind: 'person',
      source: 'canonical',
      label: firstText(record, ['full_name', 'name']) || 'Technician',
      detail: firstText(record, ['skills_text', 'role']) || 'technician',
      city: firstText(record, ['city', 'coverage_city']),
      state: firstText(record, ['state', 'coverage_state']),
      status: firstText(record, ['status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('sites') ?? []) {
    addNode(b, {
      id: nodeId('site', 'canonical', text(record.id)),
      kind: 'site',
      source: 'canonical',
      label: siteLabel(record),
      detail: firstText(record, ['site_type', 'source']),
      city: firstText(record, ['city', 'site_city']),
      state: firstText(record, ['state', 'site_state']),
      status: firstText(record, ['status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('assets') ?? []) {
    addNode(b, {
      id: nodeId('equipment', 'canonical', text(record.id)),
      kind: 'equipment',
      source: 'canonical',
      label: assetLabel(record),
      detail: firstText(record, ['asset_type', 'equipment_type', 'description', 'source']),
      city: firstText(record, ['city']),
      state: firstText(record, ['state']),
      status: firstText(record, ['status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('vehicles') ?? []) {
    addNode(b, {
      id: nodeId('vehicle', 'canonical', text(record.id)),
      kind: 'vehicle',
      source: 'canonical',
      label: vehicleLabel(record),
      detail: vehicleDetail(record),
      city: firstText(record, ['city']),
      state: firstText(record, ['state']),
      status: firstText(record, ['status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('skills') ?? []) {
    addNode(b, {
      id: nodeId('skill', 'canonical', text(record.id)),
      kind: 'skill',
      source: 'canonical',
      label: firstText(record, ['name', 'skill', 'label']) || 'Skill',
      detail: firstText(record, ['category']),
      city: '',
      state: '',
      status: '',
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('knowledge') ?? []) {
    addNode(b, {
      id: nodeId('knowledge', 'canonical', text(record.id)),
      kind: 'knowledge',
      source: 'canonical',
      label: firstText(record, ['key']) || 'Knowledge',
      detail: [firstText(record, ['scope']), firstText(record, ['summary'])].filter(Boolean).join(' · '),
      city: '',
      state: '',
      status: firstText(record, ['source']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('jobs') ?? []) {
    addNode(b, {
      id: nodeId('job', 'canonical', text(record.id)),
      kind: 'job',
      source: 'canonical',
      label: jobLabel(record),
      detail: jobDetail(record),
      city: firstText(record, ['location_city', 'city']),
      state: firstText(record, ['location_state', 'state']),
      status: firstText(record, ['status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('leads') ?? []) {
    addNode(b, {
      id: nodeId('lead', 'canonical', text(record.id)),
      kind: 'lead',
      source: 'canonical',
      label: firstText(record, ['title', 'body']) || 'Lead',
      detail: firstText(record, ['lane', 'source_channel', 'source']),
      city: firstText(record, ['city']),
      state: firstText(record, ['state']),
      status: firstText(record, ['status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('opportunities') ?? []) {
    addNode(b, {
      id: nodeId('opportunity', 'canonical', text(record.id)),
      kind: 'opportunity',
      source: 'canonical',
      label: firstText(record, ['title', 'next_action']) || 'Opportunity',
      detail: firstText(record, ['lane', 'status', 'source']),
      city: firstText(record, ['city']),
      state: firstText(record, ['state']),
      status: firstText(record, ['status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('dispatches') ?? []) {
    addNode(b, {
      id: nodeId('dispatch', 'canonical', text(record.id)),
      kind: 'dispatch',
      source: 'canonical',
      label: firstText(record, ['title', 'service_type']) || 'Dispatch',
      detail: firstText(record, ['dispatch_status', 'lane', 'source']),
      city: firstText(record, ['city', 'site_city']),
      state: firstText(record, ['state', 'site_state']),
      status: firstText(record, ['dispatch_status', 'status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  for (const record of tables.get('hauling_jobs') ?? []) {
    addNode(b, {
      id: nodeId('job', 'canonical', text(record.id)),
      kind: 'job',
      source: 'canonical',
      label: firstText(record, ['title', 'load_type']) || 'Hauling job',
      detail: firstText(record, ['load_type', 'status']),
      city: firstText(record, ['city', 'pickup_city']),
      state: firstText(record, ['state', 'pickup_state']),
      status: firstText(record, ['status']),
      createdAt: firstText(record, ['created_at']),
    }, text(record.id));
  }

  // ---- edges between canonical records ----
  for (const record of tables.get('contacts') ?? []) {
    const id = ref(b, 'canonical', record.id);
    addEdge(b, id, ref(b, 'canonical', record.organization_id), 'person_of_organization');
  }
  for (const record of tables.get('technicians') ?? []) {
    const id = ref(b, 'canonical', record.id);
    addEdge(b, id, ref(b, 'canonical', record.organization_id), 'technician_of_organization');
  }
  for (const record of tables.get('sites') ?? []) {
    const id = ref(b, 'canonical', record.id);
    addEdge(b, id, ref(b, 'canonical', record.organization_id), 'site_of_organization');
  }
  for (const record of tables.get('assets') ?? []) {
    const id = ref(b, 'canonical', record.id);
    addEdge(b, id, ref(b, 'canonical', record.site_id), 'equipment_at_site');
    addEdge(b, id, ref(b, 'canonical', record.organization_id), 'equipment_of_organization');
  }
  for (const record of tables.get('vehicles') ?? []) {
    const id = ref(b, 'canonical', record.id);
    addEdge(b, id, ref(b, 'canonical', record.contact_id), 'vehicle_of_person');
    addEdge(b, id, ref(b, 'canonical', record.organization_id), 'vehicle_of_organization');
  }
  for (const record of tables.get('jobs') ?? []) {
    const id = ref(b, 'canonical', record.id);
    addEdge(b, id, ref(b, 'canonical', record.contact_id), 'job_for_person');
    addEdge(b, id, ref(b, 'canonical', record.organization_id), 'job_for_organization');
    addEdge(b, id, ref(b, 'canonical', record.vehicle_id), 'job_on_vehicle');
    addEdge(b, id, ref(b, 'canonical', record.asset_id), 'job_on_equipment');
    addEdge(b, id, ref(b, 'canonical', record.site_id), 'job_at_site');
  }
  // field-operations assignments/closeouts key the work order as
  // work_order_id; other producers use job_id — accept either.
  for (const record of tables.get('assignments') ?? []) {
    const jobId = ref(b, 'canonical', record.job_id) ?? ref(b, 'canonical', record.work_order_id);
    const techId = ref(b, 'canonical', record.technician_id);
    addEdge(b, techId, jobId, 'assigned_to_job');
  }
  for (const record of tables.get('closeouts') ?? []) {
    const jobId = ref(b, 'canonical', record.job_id) ?? ref(b, 'canonical', record.work_order_id);
    addEdge(b, jobId, ref(b, 'canonical', record.technician_id), 'closed_by_technician');
  }
  for (const record of tables.get('technician_skills') ?? []) {
    addEdge(b, ref(b, 'canonical', record.technician_id), ref(b, 'canonical', record.skill_id), 'has_skill');
  }
  for (const record of tables.get('leads') ?? []) {
    const id = ref(b, 'canonical', record.id);
    addEdge(b, id, ref(b, 'canonical', record.contact_id), 'lead_from_person');
    addEdge(b, id, ref(b, 'canonical', record.organization_id), 'lead_from_organization');
  }
  for (const record of tables.get('opportunities') ?? []) {
    const id = ref(b, 'canonical', record.id);
    addEdge(b, id, ref(b, 'canonical', record.lead_id), 'opportunity_from_lead');
    addEdge(b, id, ref(b, 'canonical', record.contact_id), 'opportunity_for_person');
    addEdge(b, id, ref(b, 'canonical', record.organization_id), 'opportunity_for_organization');
    addEdge(b, id, ref(b, 'canonical', record.job_id), 'opportunity_to_job');
  }
  for (const record of tables.get('dispatches') ?? []) {
    const id = ref(b, 'canonical', record.id);
    addEdge(b, id, ref(b, 'canonical', record.job_id) ?? ref(b, 'canonical', record.work_order_id), 'dispatch_for_job');
    addEdge(b, id, ref(b, 'canonical', record.contact_id), 'dispatch_requested_by');
    addEdge(b, id, ref(b, 'canonical', record.technician_id), 'dispatch_to_technician');
    addEdge(b, id, ref(b, 'canonical', record.vehicle_id), 'dispatch_on_vehicle');
  }
  for (const record of tables.get('hauling_jobs') ?? []) {
    const id = ref(b, 'canonical', record.id);
    addEdge(b, id, ref(b, 'canonical', record.opportunity_id), 'hauling_from_opportunity');
    addEdge(b, id, ref(b, 'canonical', record.vehicle_id), 'hauling_on_vehicle');
  }
}

function buildGinc(b: Builder, network: GincNetwork): void {
  for (const member of network.members) {
    const pub = sanitizeMember(member);
    addNode(b, {
      id: nodeId('person', 'ginc', member.id),
      kind: 'person',
      source: 'ginc',
      label: pub.fullName || 'Member',
      detail: [member.type, member.role, pub.skills].filter(Boolean).join(' · '),
      city: pub.city ?? '',
      state: pub.state ?? '',
      status: '',
      createdAt: member.createdAt ?? '',
    }, member.id);
  }
  for (const listing of network.listings) {
    addNode(b, {
      id: nodeId('listing', 'ginc', listing.id),
      kind: 'listing',
      source: 'ginc',
      label: listing.title,
      detail: [listing.assetType, listing.category, listing.price && `${listing.price}/${listing.period}`].filter(Boolean).join(' · '),
      city: listing.city ?? '',
      state: listing.state ?? '',
      status: listing.status,
      createdAt: listing.createdAt ?? '',
    }, listing.id);
  }
  for (const job of network.jobs) {
    addNode(b, {
      id: nodeId('job', 'ginc', job.id),
      kind: 'job',
      source: 'ginc',
      label: job.title,
      detail: [job.assetType, job.category, job.schedule, job.budget].filter(Boolean).join(' · '),
      city: job.city ?? '',
      state: job.state ?? '',
      status: job.status,
      createdAt: job.createdAt ?? '',
    }, job.id);
  }
  for (const listing of network.listings) {
    addEdge(b, b.ids.get(`ginc:${listing.id}`), b.ids.get(`ginc:${listing.memberId}`), 'listing_by_member');
  }
  for (const job of network.jobs) {
    addEdge(b, b.ids.get(`ginc:${job.id}`), b.ids.get(`ginc:${job.memberId}`), 'job_posted_by_member');
  }
}

/**
 * includeCanonical=false returns the public graph — GINC members,
 * listings and jobs, plus canonical `knowledge` rows only: those are
 * upstream-filtered non-sensitive brain facts (no customer records,
 * technicians, work orders, or assets — all still full-scope only).
 */
export async function loadConnectionGraph(store?: CanonicalStore, includeCanonical = true): Promise<ConnectionGraph> {
  // The canonical store must not be constructed for public requests —
  // a missing private config would reject the whole public graph.
  let canonical: CanonicalStore | undefined;
  try {
    canonical = store ?? getCanonicalStore();
  } catch {
    canonical = undefined;
  }
  const [rows, network] = await Promise.all([
    canonical
      ? Promise.all(CANONICAL_TABLES.map((t) => canonical.queryTable(t, 1000).catch(() => [] as Record<string, unknown>[])))
      : Promise.resolve([] as Record<string, unknown>[][]),
    loadNetwork().catch(() => ({ members: [], listings: [], jobs: [] }) as GincNetwork),
  ]);

  const tables = new Map<string, Record<string, unknown>[]>();
  CANONICAL_TABLES.forEach((t, i) => tables.set(t, rows[i] ?? []));
  if (!includeCanonical) {
    // Public scope: knowledge is the only canonical table served.
    for (const t of CANONICAL_TABLES) if (t !== 'knowledge') tables.set(t, []);
  }

  const b: Builder = { nodes: new Map(), edges: [], ids: new Map() };
  buildCanonical(b, tables);
  buildGinc(b, network);

  const nodes = [...b.nodes.values()];
  const byKind = Object.fromEntries(
    (['person', 'organization', 'vehicle', 'equipment', 'site', 'job', 'listing', 'skill', 'lead', 'opportunity', 'dispatch', 'knowledge'] as GraphNodeKind[])
      .map((k) => [k, nodes.filter((n) => n.kind === k).length])
  ) as Record<GraphNodeKind, number>;

  return { nodes, edges: b.edges, stats: { nodes: nodes.length, edges: b.edges.length, byKind } };
}

export interface LookupResult {
  matches: GraphNode[];
  connections: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
}

/**
 * Substring lookup over the graph. Matched nodes are returned together
 * with their direct neighbors and the edges between them — the answer to
 * "what connects to this person / vehicle / job".
 */
export function lookupGraph(graph: ConnectionGraph, options: { q?: string; kind?: GraphNodeKind; id?: string; limit?: number }): LookupResult {
  const q = options.q?.trim().toLowerCase() ?? '';
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200));

  let matched = graph.nodes.filter((node) => {
    if (options.kind && node.kind !== options.kind) return false;
    if (options.id && node.id !== options.id) return false;
    if (!q) return true;
    const haystack = [node.label, node.detail, node.city, node.state, node.status, node.kind].join(' ').toLowerCase();
    return haystack.includes(q);
  });
  if (options.id) matched = matched.filter((n) => n.id === options.id);
  matched = matched.slice(0, limit);

  const matchedIds = new Set(matched.map((n) => n.id));
  const edges = graph.edges.filter((e) => matchedIds.has(e.from) || matchedIds.has(e.to));
  const neighborIds = new Set<string>();
  for (const e of edges) {
    if (!matchedIds.has(e.from)) neighborIds.add(e.from);
    if (!matchedIds.has(e.to)) neighborIds.add(e.to);
  }
  const connections = graph.nodes.filter((n) => neighborIds.has(n.id));

  return { matches: matched, connections, edges, stats: graph.stats };
}
