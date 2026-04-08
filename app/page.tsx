import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Arizona Onsite Field Execution for Remote Teams | Already Here LLC',
  description:
    'Phoenix-based, Arizona-first onsite technical field execution for remote teams, MSPs, vendors, healthcare-adjacent operators, and rollout programs. Same-day and next-day Arizona dispatch reviewed by scope and schedule.',
};

const proofItems = [
  'GE HealthCare',
  'McKesson',
  'HPE',
  'Starbucks',
  'current H&M RFID upgrade support',
];

const heroBullets = [
  'Same-day and next-day Arizona dispatch reviewed by scope and schedule',
  'Phoenix-based • Arizona-first • qualified travel support',
  'Documentation and closeout remote teams can actually use',
];

const whyTeamsUseUs = [
  'Defined scope execution, not vague onsite guessing',
  'Direct communication with remote teams and stakeholders',
  'Structured documentation and closeout',
  'Reliable follow-through instead of partial completion',
  'Experience in controlled, rollout, and documentation-sensitive environments',
];

const capabilities = [
  {
    title: 'Remote Team Support',
    body: 'Bridge-call coordination, guided troubleshooting, validation, remediation, and onsite follow-through when the remote team cannot finish the work from a distance.',
  },
  {
    title: 'Infrastructure Field Work',
    body: 'Smart hands, rack activity, patching, port changes, server-room follow-through, drive swaps, and other physical infrastructure execution that requires real onsite presence.',
  },
  {
    title: 'Rollout and Modernization Support',
    body: 'Rollout execution, modernization work, RFID-related field support, remediation, and structured project follow-through across one site or multiple locations.',
  },
  {
    title: 'Healthcare / Controlled Environments',
    body: 'Access-sensitive and documentation-sensitive work where professionalism, handling discipline, and clear closeout matter.',
  },
];

const buyerFit = [
  'MSPs and remote support teams',
  'Vendors and prime contractors',
  'Healthcare-adjacent operators',
  'Rollout, upgrade, and modernization teams',
  'Distributed operators that need dependable onsite execution',
];

const processSteps = [
  {
    step: '01',
    title: 'Send the scope',
    body: 'Submit the site, timing, service type, scope summary, access details, and remote-team context through dispatch.',
  },
  {
    step: '02',
    title: 'We review fit',
    body: 'Scope quality, timing, access readiness, travel burden, and execution fit are reviewed before the work is accepted.',
  },
  {
    step: '03',
    title: 'We execute and close out',
    body: 'Accepted work is handled onsite with communication, field notes, and closeout documentation buyers can actually use.',
  },
];

export default function HomePage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Onsite technical field support for remote teams, vendors, and rollout operators
          </p>

          <div className="mt-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Already Here LLC
            </p>
            <p className="mt-1 text-base font-medium text-slate-300">Field Execution Partner</p>
          </div>

          <h1 className="mt-6 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            When remote teams need work done correctly on site
          </h1>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Already Here LLC supports remote teams, MSPs, healthcare-adjacent operators,
            vendors, and rollout programs with disciplined onsite technical field execution.
            Phoenix is home base. Arizona is primary coverage. Qualified regional and
            project-based travel is available for the right work.
          </p>

          <ul className="mt-8 grid gap-3 lg:grid-cols-3">
            {heroBullets.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 text-sm font-medium text-slate-200"
              >
                {item}
              </li>
            ))}
          </ul>

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
            <a
              href="mailto:dispatch@alreadyherellc.com"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Email Dispatch
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Why teams use Already Here LLC
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Lower-risk onsite execution for teams that already know what needs to happen
              </h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
                The value is not generic labor coverage. The value is defined scope execution,
                direct coordination, structured field communication, and closeout that supports
                the team behind the request.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <ul className="space-y-3 text-base leading-7 text-slate-700">
                {whyTeamsUseUs.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Current and recent field environments
            </p>
            <p className="mt-4 text-lg leading-8 text-slate-700">
              Current and recent field experience aligned with healthcare, enterprise
              infrastructure, retail, restaurant, and RFID / modernization environments.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {proofItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                >
                  {item}
                </span>
              ))}
            </div>

            <p className="mt-6 text-base leading-7 text-slate-700">
              Work performed in structured, access-controlled, and documentation-sensitive
              environments where clear communication and usable closeout matter.
            </p>
          </div>

          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Commercial clarity
            </p>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Dispatches are quoted by scope, duration, location, urgency, and travel burden.
              Minimums and travel costs apply where appropriate.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Same-day, emergency, staging, lift, and no-access conditions affect commercial
              fit and final pricing.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Core capabilities
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Built around execution clarity, not broad local IT help
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {capabilities.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8"
              >
                <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-700">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Review Services
            </Link>
            <Link
              href="/rollout-support"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Review Rollout Support
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Built for
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Buyers who need onsite work handled without confusion
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
              Already Here LLC qualifies the request, executes onsite, coordinates with the
              remote team when needed, and returns documentation buyers can actually use.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
            <ul className="space-y-3 text-base leading-7 text-slate-700">
              {buyerFit.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-950" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              How dispatch starts
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Faster intake. Less back-and-forth. Cleaner execution.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {processSteps.map((item) => (
              <article
                key={item.step}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Step {item.step}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-700">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Coverage
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Phoenix-based. Arizona-first. Travel-capable for qualified work.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              Arizona is primary coverage. Regional and project-based travel is available for
              qualified work where scope, logistics, schedule, and commercial fit make sense.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/service-area"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Review Service Area
              </Link>
              <Link
                href="/dispatch"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Request Dispatch
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Common travel consideration
            </p>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
              <li className="flex gap-3">
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span>Arizona (primary)</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span>Nevada, including Las Vegas</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span>California for project-based work</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span>Texas and surrounding western / southwestern markets</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Need onsite execution?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Send the site, timing, scope summary, and access details through dispatch.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Same-day and urgent Arizona work is reviewed by scope, access, and schedule.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Open Dispatch Form
            </Link>
            <a
              href="mailto:dispatch@alreadyherellc.com"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Email Dispatch
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
