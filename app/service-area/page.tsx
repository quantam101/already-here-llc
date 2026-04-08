import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Service Area | Already Here LLC',
  description:
    'Phoenix-based, Arizona-first onsite technical field execution with qualified regional and project-based travel support for remote teams, MSPs, vendors, healthcare-adjacent operators, and rollout programs.',
};

const primaryCoverage = [
  'Phoenix metro and surrounding Arizona markets',
  'Arizona-first support for qualified onsite dispatches',
  'Single-site and multi-site execution across Arizona',
  'Scheduled work, remediation, rollout support, and structured onsite follow-through',
];

const commonMarkets = [
  'Arizona (primary)',
  'Nevada, including Las Vegas',
  'California for project-based work',
  'Texas for project-based work',
  'Surrounding western and southwestern markets when commercially sound',
];

export default function ServiceAreaPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Service area
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Phoenix-based. Arizona-first. Travel-capable for qualified onsite work.
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Already Here LLC is based in Phoenix and built to support Arizona first. Regional
            and project-based travel is available for qualified dispatches, multi-site rollout
            work, remediation assignments, and scheduled onsite technical field execution across
            surrounding markets and beyond.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Dispatch
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Review Services
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Primary coverage
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
              {primaryCoverage.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-950" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Common regional markets
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
              {commonMarkets.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
