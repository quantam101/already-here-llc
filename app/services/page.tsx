import Link from 'next/link';
import { siteConfig } from '@/lib/site';

const serviceCards = [
  {
    title: 'Remote support team assist and laptop work',
    body:
      'Work with remote support teams on bridge calls, guided troubleshooting, laptop and endpoint checks, user-facing device work, and clean onsite follow-through when the remote team needs reliable execution on site.'
  },
  {
    title: 'Smart hands / eyes-on-hands onsite',
    body:
      'Provide physical presence for remote teams that need hands onsite for cabling, checks, console access, basic hardware handling, patching, labeling, photos, and field confirmation.'
  },
  {
    title: 'Data center, server, and storage field work',
    body:
      'Handle server-room, MDF / IDF, and data-center-adjacent work including drive swaps, server checks, storage handling, rack activity, and hands-on coordination when the work cannot be completed remotely.'
  },
  {
    title: 'Drive swaps, port changes, and infrastructure activity',
    body:
      'Support hardware replacement, drive swaps, port changes, patching, router and edge-device activity, AP follow-up, low-voltage checks, and related infrastructure tasks.'
  },
  {
    title: 'Healthcare and biomed-adjacent support',
    body:
      'Current experience includes healthcare and biomed-related environments where access constraints, communication discipline, and structured closeout matter.'
  },
  {
    title: 'Retail rollout, RFID, and new technology build support',
    body:
      'Support technology build activity, rollout work, modernization, remediation, and upgrade programs, including current H&M RFID upgrade work and related field execution.'
  }
];

const operatingPoints = [
  'Phoenix-based with Arizona project support based on scope, timing, access, and site requirements.',
  'Built for vendors, MSPs, remote support teams, healthcare operators, and multi-site rollout programs.',
  'Best for scoped field activity, smart hands execution, upgrade work, infrastructure follow-through, and documentation-heavy closeout.'
];

const requestExamples = [
  'Remote support team needs onsite hands for a laptop issue, guided troubleshooting, or endpoint recovery',
  'Server room or data closet work involving drive swaps, port changes, rack activity, or patching',
  'Healthcare or biomed-adjacent field assignment that needs careful onsite execution and documentation',
  'RFID rollout, modernization, store technology upgrade, or new technology build follow-through',
  'Starbucks, HPE, McKesson, GE HealthCare, or similar vendor-driven field scope needing onsite ownership'
];

const experiencePoints = [
  'GE HealthCare',
  'McKesson',
  'HPE',
  'Starbucks',
  'Current H&M RFID upgrade work'
];

export default function ServicesPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
              Services
            </div>

            <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-tight text-slate-900 md:text-6xl">
              Onsite field services built for real dispatch, smart hands, and upgrade work.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Already Here LLC supports remote support teams, vendors, MSPs, healthcare operators, and multi-site programs
              with onsite execution across Arizona. The work is scoped, handled cleanly, and closed out with documentation your team can use.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {operatingPoints.map((item) => (
              <div key={item} className="rounded-3xl border border-slate-200 bg-white p-6 text-base leading-8 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Core capabilities
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Service coverage that fits remote-team assist, data-center field work, biomed-adjacent execution, and closeout-heavy dispatches.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {serviceCards.map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8">
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{item.title}</h3>
                <p className="mt-4 text-base leading-8 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Common requests
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Best fit for teams that already know the site, scope, and outcome they need.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              This is not generic labor coverage. It is structured field support for remote-team execution, laptop and endpoint work, server and infrastructure activity, biomed-adjacent environments, and documentation-driven closeout.
            </p>
          </div>

          <div className="space-y-4">
            {requestExamples.map((item) => (
              <div key={item} className="rounded-3xl border border-slate-200 bg-white p-6 text-base leading-8 text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Current / recent experience
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-5">
              {experiencePoints.map((item) => (
                <div key={item} className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-medium leading-7 text-slate-700">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Request Dispatch
              </Link>

              <a
                href={`mailto:${siteConfig.email}`}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Email Dispatch
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}