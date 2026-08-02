'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type JobSummary = {
  id: string;
  status: string;
  priority: string;
  trade: string;
  estimatedDurationMinutes: number;
  assignedTo?: string | null;
  createdAt: string;
  intake: { problemDescription: string };
  dispatcherPacket: { summary: string };
};

type UserSummary = { id: string; name: string; email: string; roles: string[] };

const STATUSES = ['lead', 'intake', 'quoted', 'approved', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled'];

export function DispatcherBoard() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/ahfos/jobs').then((r) => r.json()),
      fetch('/api/ahfos/users?role=technician').then((r) => r.json()),
    ])
      .then(([jobsData, usersData]: [unknown, unknown]) => {
        const j = jobsData as { ok: boolean; jobs?: JobSummary[]; message?: string };
        const u = usersData as { ok: boolean; users?: UserSummary[]; message?: string };
        if (!j.ok) throw new Error(j.message || 'Failed to load jobs.');
        if (!u.ok) throw new Error(u.message || 'Failed to load technicians.');
        setJobs(j.jobs ?? []);
        setUsers(u.users ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load board.'));
  }, []);

  async function updateJob(id: string, patch: Partial<JobSummary>) {
    const res = await fetch(`/api/ahfos/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({ message: 'Update failed.' }))) as { message?: string };
    if (!res.ok) throw new Error(data.message || 'Update failed.');
    setJobs((prev) => (prev ? prev.map((j) => (j.id === id ? { ...j, ...patch } : j)) : prev));
  }

  async function runAgent(id: string, agent: string, payload?: Record<string, unknown>) {
    const res = await fetch(`/api/ahfos/jobs/${id}/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent, payload }),
    });
    const data = (await res.json().catch(() => ({ message: 'Agent failed.' }))) as { message?: string; job?: JobSummary };
    if (!res.ok) throw new Error(data.message || 'Agent failed.');
    if (data.job) setJobs((prev) => (prev ? prev.map((j) => (j.id === id ? data.job as JobSummary : j)) : prev));
    else refresh();
  }

  function refresh() {
    fetch('/api/ahfos/jobs')
      .then((r) => r.json())
      .then((data: { ok: boolean; jobs?: JobSummary[] }) => {
        if (data.ok) setJobs(data.jobs ?? []);
      })
      .catch(() => {});
  }

  if (error) return <p className="container-shell py-16 text-red-400">{error}</p>;
  if (!jobs) return <p className="container-shell py-16 text-slate-300">Loading dispatch board...</p>;

  return (
    <div className="container-shell py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Dispatcher board</span>
          <h1 className="section-title mt-4">Live jobs</h1>
        </div>
        <Link href="/portal/request" className="inline-flex rounded-full border border-borderBrand px-5 py-2.5 text-sm font-semibold text-slate-300 hover:border-action hover:text-action">
          + Manual intake
        </Link>
      </div>

      {jobs.length === 0 && (
        <section className="mt-10 rounded-2xl border border-borderBrand bg-soft p-8 text-center">
          <p className="text-slate-300">No jobs in the system. Create a service request to start the pipeline.</p>
        </section>
      )}

      <div className="mt-10 grid gap-4">
        {jobs.map((job) => (
          <article key={job.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">{job.status}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">{job.priority}</span>
              <span className="text-sm text-slate-400">{new Date(job.createdAt).toLocaleString()}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold text-navy">{job.trade}</h2>
            <p className="mt-1 text-sm text-slate-600">{job.dispatcherPacket.summary || job.intake.problemDescription.slice(0, 200)}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Status
                <select
                  value={job.status}
                  onChange={(e) => updateJob(job.id, { status: e.target.value })}
                  className="rounded-2xl border border-borderBrand px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Technician
                <select
                  value={job.assignedTo || ''}
                  onChange={(e) => updateJob(job.id, { assignedTo: e.target.value || null })}
                  className="rounded-2xl border border-borderBrand px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col justify-end gap-2 lg:col-span-2">
                <button onClick={() => runAgent(job.id, 'dispatch')} className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-navy">
                  Auto-assign
                </button>
                <div className="flex gap-2">
                  <button onClick={() => runAgent(job.id, 'technician')} className="flex-1 rounded-full border border-borderBrand px-4 py-2 text-sm font-semibold text-slate-300 hover:border-action hover:text-action">
                    Build checklist
                  </button>
                  {job.status === 'completed' && (
                    <button onClick={() => runAgent(job.id, 'invoice')} className="flex-1 rounded-full border border-borderBrand px-4 py-2 text-sm font-semibold text-slate-300 hover:border-action hover:text-action">
                      Send invoice
                    </button>
                  )}
                  <Link href={`/technician/jobs/${job.id}`} className="flex-1 rounded-full border border-borderBrand px-4 py-2 text-center text-sm font-semibold text-slate-300 hover:border-action hover:text-action">
                    Open job
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
