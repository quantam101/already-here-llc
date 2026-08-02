import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePageAuth } from '@/lib/ahfos/auth';
import { getJobs, getJobsForTechnician } from '@/lib/ahfos/store';

export const metadata: Metadata = {
  title: 'My Jobs | AHFOS',
  alternates: { canonical: '/technician/jobs' },
};

export default async function TechnicianJobsPage() {
  const user = await requirePageAuth(['technician', 'admin', 'dispatcher', 'project_manager']);
  const isTechnicianOnly = user.roles.includes('technician') && !user.roles.some((r) => ['admin', 'dispatcher', 'project_manager'].includes(r));
  const jobs = isTechnicianOnly ? await getJobsForTechnician(user.id) : await getJobs();

  return (
    <div className="container-shell py-10">
      <h1 className="section-title">{isTechnicianOnly ? 'My assigned jobs' : 'Technician job list'}</h1>
      {jobs.length === 0 && (
        <p className="mt-8 text-slate-300">No jobs assigned. Check the dispatch board for available work.</p>
      )}
      <div className="mt-8 grid gap-4">
        {jobs.map((job) => (
          <Link key={job.id} href={`/technician/jobs/${job.id}`} className="card block p-5 hover:border-action">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">{job.status}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">{job.priority}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold text-navy">{job.trade}</h2>
            <p className="mt-1 text-sm text-slate-600">{job.dispatcherPacket.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
