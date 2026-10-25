'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface GraphNode {
  id: string;
  kind: string;
  source: 'canonical' | 'ginc';
  label: string;
  detail: string;
  city: string;
  state: string;
  status: string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

interface NetworkResponse {
  ok: boolean;
  scope?: string;
  nodes?: GraphNode[];
  connections?: GraphNode[];
  edges?: GraphEdge[];
  stats?: { nodes: number; edges: number; byKind: Record<string, number> };
  error?: string;
}

const KINDS = ['person', 'organization', 'vehicle', 'equipment', 'site', 'job', 'listing', 'skill', 'lead', 'opportunity', 'dispatch'];

const KIND_LABELS: Record<string, string> = {
  person: 'People',
  organization: 'Organizations',
  vehicle: 'Vehicles',
  equipment: 'Equipment',
  site: 'Sites',
  job: 'Jobs',
  listing: 'Listings',
  skill: 'Skills',
  lead: 'Leads',
  opportunity: 'Opportunities',
  dispatch: 'Dispatches',
};

function edgeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}

function NodeCard({ node, onSelect, selected }: { node: GraphNode; onSelect: (id: string) => void; selected: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected ? 'border-action bg-action/5' : 'border-borderBrand bg-soft hover:border-action/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
          {KIND_LABELS[node.kind] ?? node.kind}
        </span>
        {node.status ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{node.status.replace(/_/g, ' ')}</span>
        ) : null}
      </div>
      <p className="mt-2 font-semibold text-navy">{node.label}</p>
      {node.detail ? <p className="mt-1 text-xs text-slate-600">{node.detail}</p> : null}
      {[node.city, node.state].filter(Boolean).length ? (
        <p className="mt-1 text-xs text-slate-500">{[node.city, node.state].filter(Boolean).join(', ')}</p>
      ) : null}
    </button>
  );
}

export function NetworkSearch() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [data, setData] = useState<NetworkResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (query: string, kindFilter: string, id?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (kindFilter) params.set('kind', kindFilter);
      if (id) params.set('id', id);
      params.set('limit', '60');
      const res = await fetch(`/api/network?${params.toString()}`, { cache: 'no-store' });
      const json = (await res.json()) as NetworkResponse;
      if (!res.ok || !json.ok) {
        setError(json.error || 'Lookup failed.');
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError('Network error.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSelectedId(null);
      search(q, kind);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, kind, search]);

  const selectNode = useCallback(
    (id: string) => {
      if (id === selectedId) {
        setSelectedId(null);
        search(q, kind);
        return;
      }
      setSelectedId(id);
      search(q, kind, id);
    },
    [q, kind, search, selectedId],
  );

  const nodes = data?.nodes ?? [];
  const connections = data?.connections ?? [];
  const edges = data?.edges ?? [];
  const stats = data?.stats;
  const selected = nodes.find((n) => n.id === selectedId) ?? connections.find((n) => n.id === selectedId);

  return (
    <div className="card p-6 sm:p-8">
      <h2 className="text-2xl font-semibold text-navy">Search the connection graph</h2>
      <p className="mt-2 text-sm text-slate-600">
        Find people, vehicles, equipment, sites, and jobs — then open a record to see everything it connects to.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, vehicle, job, city…"
          className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink sm:col-span-2"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink"
        >
          <option value="">All types</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k] ?? k}</option>
          ))}
        </select>
      </div>

      {stats ? (
        <p className="mt-4 text-sm text-slate-500">
          {stats.nodes} record{stats.nodes === 1 ? '' : 's'} · {stats.edges} connection{stats.edges === 1 ? '' : 's'} in the public network
        </p>
      ) : null}

      {loading ? <p className="mt-6 text-sm text-slate-500">Searching…</p> : null}
      {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

      {selected && connections.length > 0 ? (
        <div className="mt-8 rounded-2xl border border-action/30 bg-action/5 p-5">
          <p className="text-sm font-semibold text-navy">
            {selected.label} connects to:
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {connections.map((conn) => {
              const edge = edges.find((e) => e.from === selected.id && e.to === conn.id || e.to === selected.id && e.from === conn.id);
              return (
                <li key={conn.id} className="rounded-xl border border-borderBrand bg-white p-3">
                  <p className="text-sm font-semibold text-navy">{conn.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {KIND_LABELS[conn.kind] ?? conn.kind}
                    {edge ? ` — ${edgeLabel(edge.type)}` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {nodes.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => (
            <NodeCard key={node.id} node={node} onSelect={selectNode} selected={node.id === selectedId} />
          ))}
        </div>
      ) : null}

      {!loading && data && nodes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-borderBrand bg-soft p-8 text-center">
          <p className="text-sm text-slate-600">No records match. The network fills in as members join, assets are listed, and jobs come in.</p>
        </div>
      ) : null}
    </div>
  );
}
