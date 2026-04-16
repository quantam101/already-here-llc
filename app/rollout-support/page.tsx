import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Rollout Support',
  description:
    'Rollout, RFID, modernization, refresh, and remediation support for vendors, remote teams, MSPs, and multi-site operators that need disciplined onsite technical field execution.',
  path: '/rollout-support',
});

const fitItems = [
  'RFID-related field execution',
  'Refresh and modernization work',
  'Remediation tied to rollout delivery',
  'Mapped deployment support',
  'Single-site and multi-site execution',
  'Structured closeout for vendors and remote operators',
];

export default function RolloutSupportPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Rollout support
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Structured rollout, RFID, refresh, and modernization field execution
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Already Here LLC supports rollout operators, vendors, remote teams, and multi-site
            programs that need disciplined onsite technical field execution instead of vague
            labor coverage.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Dispatch
            </Link>
            <Link
              href="/service-area"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Review Service Area
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Best fit
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
              {fitItems.map((item) => (
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
