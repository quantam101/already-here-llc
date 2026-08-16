'use client';

import { useMemo, useState } from 'react';

type FollowUpRecord = {
  id: string;
  purpose: string;
  lane: string;
  channel: string;
  status: string;
  offer: string | null;
  assigned_to: string | null;
  due_at: string | null;
  notes: string | null;
  related_record_type: string | null;
  related_record_id: string | null;
  created_at: string;
  updated_at: string;
};

const statusOptions = ['open', 'in_progress', 'waiting', 'closed', 'no_response', 'do_not_contact'];

function isOverdue(dueAt: string | null): boolean {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}

export default function FollowupsClient({ initialRecords }: { initialRecords: Record<string, unknown>[] }) {
  const [records, setRecords] = useState<FollowUpRecord[]>(initialRecords as unknown as FollowUpRecord[]);
  const [filter, setFilter] = useState<string>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const api = useMemo(() => '/api/followups', []);

  const load = async () => {
    const res = await fetch(api, { cache: 'no-store' });
    const json = await res.json();
    if (json.ok && Array.isArray(json.records)) {
      setRecords(json.records);
    }
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    setLoadingId(id);
    setMessage(null);
    try {
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, notes })
      });
      const json = await res.json();
      if (json.ok) {
        setMessage('Follow-up updated.');
        await load();
      } else {
        setMessage(`Error: ${json.error ?? 'Failed'}`);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = filter === 'all'
    ? records
    : filter === 'overdue'
      ? records.filter((r) => r.status === 'open' && isOverdue(r.due_at))
      : records.filter((r) => r.status === filter);

  return (
    <main className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Follow-up queue</span>
      <h1 className="section-title mt-5">Open and overdue follow-ups</h1>
      <p className="section-copy">
        Review follow-ups created from intake, outreach, and revenue events. Update status and notes as work progresses.
      </p>

      {message ? (
        <div className="mt-6 rounded-2xl border border-action/30 bg-action/5 p-4 text-sm text-navy">
          {message}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {['all', 'open', 'overdue', 'in_progress', 'waiting', 'closed', 'no_response', 'do_not_contact'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              filter === s
                ? 'border-action bg-action text-white'
                : 'border-borderBrand text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
        <button onClick={load} className="ml-auto rounded-full border border-navy px-4 py-2 text-sm font-medium text-navy hover:bg-navy/5">
          Refresh
        </button>
      </div>

      <section className="mt-8 rounded-2xl border border-borderBrand bg-soft p-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No follow-ups match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-borderBrand text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2 pr-4">Lane</th>
                  <th className="py-2 pr-4">Offer</th>
                  <th className="py-2 pr-4">Due</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className={`border-b border-borderBrand/50 ${r.status === 'open' && isOverdue(r.due_at) ? 'bg-red-50' : ''}`}>
                    <td className="py-2 pr-4 font-medium text-navy">{r.purpose}</td>
                    <td className="py-2 pr-4 text-slate-600">{r.lane}</td>
                    <td className="py-2 pr-4 text-slate-600">{r.offer ?? '—'}</td>
                    <td className="py-2 pr-4 text-slate-600">
                      {r.due_at ? new Date(r.due_at).toLocaleString() : '—'}
                      {r.status === 'open' && isOverdue(r.due_at) ? <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">overdue</span> : null}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        r.status === 'closed' ? 'bg-green-100 text-green-700' :
                        r.status === 'do_not_contact' ? 'bg-red-100 text-red-700' :
                        r.status === 'open' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2">
                      <select
                        disabled={loadingId === r.id}
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value, r.notes ?? undefined)}
                        className="link-ring rounded-xl border border-borderBrand bg-white px-2 py-1 text-sm text-ink"
                      >
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
