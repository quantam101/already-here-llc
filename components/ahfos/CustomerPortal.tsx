'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type JobSummary = {
  id: string;
  status: string;
  priority: string;
  trade: string;
  estimatedDurationMinutes: number;
  createdAt: string;
  dispatcherPacket: { summary: string };
};

export function CustomerPortal({ user }: { user: { name: string; email: string; roles: string[] } }) {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ahfos/jobs')
      .then((res) => res.json())
      .then((data: { ok: boolean; jobs?: JobSummary[]; message?: string }) => {
        if (!data.ok) throw new Error(data.message || 'Failed to load jobs.');
        setJobs(data.jobs ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load jobs.'));
  }, []);

  return (
    <div className="container-shell py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Customer portal</span>
          <h1 className="section-title mt-4">Welcome, {user.name}</h1>
          <p className="section-copy">Track your service requests, view status, and request new field service.</p>
        </div>
        <Link href="/portal/request" className="inline-flex rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy">
          Request service
        </Link>
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {jobs === null && <p className="mt-10 text-slate-400">Loading jobs...</p>}

      {jobs !== null && jobs.length === 0 && (
        <section className="mt-10 rounded-2xl border border-borderBrand bg-soft p-8 text-center">
          <p className="text-slate-300">No jobs yet. Submit your first service request.</p>
          <Link href="/portal/request" className="mt-4 inline-flex rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy">
            Request service
          </Link>
        </section>
      )}

      {jobs !== null && jobs.length > 0 && (
        <div className="mt-10 grid gap-4">
          {jobs.map((job) => (
            <article key={job.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">{job.status}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">{job.priority}</span>
                <span className="text-sm text-slate-400">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-navy">{job.trade}</h2>
              <p className="mt-1 text-sm text-slate-600">{job.dispatcherPacket.summary}</p>
              <p className="mt-3 text-sm text-slate-500">Estimated duration: {job.estimatedDurationMinutes} minutes</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
