#!/usr/bin/env bash
set -euo pipefail

mkdir -p app/services app/contact

cat > app/page.tsx <<'EOF'
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Arizona Onsite Field Execution for Remote Teams | Already Here LLC',
  description:
    'Phoenix-based, Arizona-first onsite technical field execution for remote teams, MSPs, vendors, healthcare-adjacent operators, and rollout programs. Qualified dispatch, structured closeout, and regional travel support available.',
};

const proofItems = [
  'GE HealthCare',
  'McKesson',
  'HPE',
  'Starbucks',
  'current H&M RFID upgrade support',
];

const heroBullets = [
  'Remote team coordination',
  'Smart hands and eyes-on-site',
  'Endpoint, infrastructure, and rollout support',
];

const capabilities = [
  {
    title: 'Remote Team Support',
    body: 'Work alongside remote teams on bridge calls, guided troubleshooting, onsite validation, ticket-based remediation, and physical follow-through when the issue cannot be resolved remotely.',
  },
  {
    title: 'Endpoint and User-Device Support',
    body: 'Laptop and endpoint troubleshooting, swap activity, hardware remediation, desk-side validation, and related user-device support where physical access is required.',
  },
  {
    title: 'Infrastructure Field Work',
    body: 'Smart hands, rack activity, patching, port changes, MDF / IDF support, drive swaps, server-room follow-through, storage-adjacent tasks, and other physical infrastructure work that remote teams cannot complete without someone onsite.',
  },
  {
    title: 'Rollout and Modernization Support',
    body: 'Rollout support, RFID-related field work, modernization activity, upgrade execution, remediation, and structured project follow-through across one site or multiple locations.',
  },
  {
    title: 'Healthcare / Controlled Environment Support',
    body: 'Onsite support in healthcare-adjacent and documentation-sensitive environments where access control, handling discipline, and clear communication matter.',
  },
];

const fitItems = [
  'MSPs and remote support teams',
  'Vendors and prime contractors',
  'Healthcare and biomed-adjacent operators',
  'Rollout, upgrade, and modernization teams',
  'Distributed operators needing dependable onsite execution',
];

const processSteps = [
  {
    step: '01',
    title: 'Send the scope',
    body: 'Send the full site address, state, timing, scope summary, service type, priority, and any ticket, access, or remote-team details through the dispatch form.',
  },
  {
    step: '02',
    title: 'We confirm fit',
    body: 'Coverage, schedule alignment, access requirements, travel factors, and execution fit are reviewed before the visit is accepted.',
  },
  {
    step: '03',
    title: 'Onsite execution and closeout',
    body: 'The work is executed onsite with clear communication, field notes, and closeout documentation your team can actually use.',
  },
];

const bestFitItems = [
  'Defined scope',
  'Real site context',
  'Remote-team coordination when needed',
  'Structured field execution',
  'Rollout and remediation support',
  'Work that benefits from reliable onsite follow-through rather than generic labor coverage',
];

export default function HomePage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="font-medium">
            Phoenix-based • Commercially insured • Structured closeout
          </div>
          <a
            href="mailto:dispatch@alreadyherellc.com"
            className="text-slate-200 underline underline-offset-4 hover:text-white"
          >
            dispatch@alreadyherellc.com
          </a>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
              Onsite technical field support for remote teams, vendors, and rollout operators
            </p>

            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Already Here LLC
              </p>
              <p className="mt-1 text-base font-medium text-slate-700">
                Field Execution Partner
              </p>
            </div>

            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              When remote teams need work done correctly on site
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
              Already Here LLC supports remote teams, MSPs, healthcare-adjacent operators,
              vendors, and rollout programs with disciplined onsite technical field execution.
              Based in Phoenix and serving Arizona first, we provide qualified regional and
              project-based travel support for dispatches, remediation work, multi-site rollouts,
              and scheduled onsite execution across surrounding markets and beyond.
            </p>

            <ul className="mt-8 grid gap-3 text-sm font-medium text-slate-800 sm:grid-cols-3">
              {heroBullets.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Request Dispatch
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Review Services
              </Link>
              <a
                href="mailto:dispatch@alreadyherellc.com"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Email Dispatch
              </a>
            </div>
          </div>

          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Current and recent field experience
            </p>
            <p className="mt-4 text-base leading-7 text-slate-700">
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
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Disciplined onsite execution, not vague field coverage
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Built for teams that already know what needs to happen
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              Already Here LLC is built for qualified field execution. We review the request,
              align on scope and timing, execute onsite, communicate clearly, document what
              happened, and close the work out cleanly.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Core capabilities
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Work structured around execution clarity, not broad local IT help
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {capabilities.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8"
              >
                <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-700">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10">
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Review Services
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Built for teams that need onsite work handled without confusion
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                You hand over the scope. We handle onsite execution.
              </h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
                Already Here LLC qualifies the request, executes onsite, coordinates with the
                remote team when needed, and returns documentation your team can actually use.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-slate-950">Best fit for</h3>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                {fitItems.map((item) => (
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
                className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8"
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

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Coverage
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Phoenix-based. Arizona-first. Travel-capable for qualified work.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-700">
                Phoenix is home base and Arizona is primary coverage. For the right scope,
                Already Here LLC also supports regional travel, scheduled project work,
                remediation assignments, and multi-site execution across surrounding markets and
                beyond.
              </p>
              <p className="mt-4 text-base leading-7 text-slate-700">
                Common travel consideration includes Southern Nevada / Las Vegas, California,
                Texas, and other surrounding western and southwestern markets, with additional
                out-of-market work reviewed based on scope, logistics, and commercial fit.
              </p>

              <div className="mt-8">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Request Coverage / Dispatch
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-slate-950">Best-fit work</h3>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                {bestFitItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-950" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
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
              Send the scope, site details, requested timing, and service type.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Regional and out-of-market requests are welcome for qualified work.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
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
EOF

cat > app/services/page.tsx <<'EOF'
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Onsite Technical Field Services for Remote Teams | Already Here LLC',
  description:
    'Phoenix-based, Arizona-first onsite technical field services for remote teams, MSPs, vendors, healthcare-adjacent operators, and rollout programs. Smart hands, endpoint work, infrastructure field support, rollout execution, and qualified travel support.',
};

const serviceGroups = [
  {
    title: 'Remote Team Support',
    body: 'When the remote team already owns the ticket, bridge, or workflow but needs reliable hands on site, Already Here LLC steps in as the field execution layer.',
    includes: [
      'Smart hands support',
      'Eyes-on-site verification',
      'Remote bridge coordination',
      'Guided troubleshooting with remote teams',
      'Onsite validation and follow-through',
      'Ticket-based remediation support',
      'Physical presence for tasks that cannot be completed remotely',
    ],
    bestFit:
      'Built for MSPs, internal IT teams, vendors, and remote support teams that need a dependable onsite operator who can execute clearly, communicate directly, and return usable closeout.',
  },
  {
    title: 'Endpoint and User-Device Support',
    body: 'Already Here LLC supports onsite endpoint work where physical access, user-device handling, swap activity, or structured remediation is required.',
    includes: [
      'Laptop troubleshooting',
      'Endpoint swap support',
      'Hardware remediation',
      'Desk-side validation',
      'Peripheral and device replacement support',
      'Onsite follow-through for user-device issues',
      'Execution support for defined endpoint tasks',
    ],
    bestFit:
      'Best for organizations that already know the issue, have a defined outcome in mind, and need onsite execution rather than broad walk-up tech support.',
  },
  {
    title: 'Infrastructure Field Work',
    body: 'Already Here LLC handles physical infrastructure activity that remote teams cannot complete without someone on site.',
    includes: [
      'Rack activity',
      'Patching',
      'Port changes',
      'MDF support',
      'IDF support',
      'Server-room follow-through',
      'Storage-adjacent field work',
      'Drive swaps',
      'Hardware replacement support',
      'Visual verification and physical execution tied to remote direction',
    ],
    bestFit:
      'Built for teams that need dependable onsite follow-through in closets, server rooms, structured IT spaces, and other infrastructure environments where physical presence matters.',
  },
  {
    title: 'Rollout and Modernization Support',
    body: 'Already Here LLC supports rollout, upgrade, refresh, remediation, and modernization work that requires structured onsite execution across one site or multiple locations.',
    includes: [
      'Rollout field support',
      'Modernization activity',
      'Site refresh support',
      'Remediation tied to project execution',
      'RFID-related field support',
      'Mapped store deployment support',
      'AP move coordination',
      'New AP install coordination',
      'MDF-related data run planning support',
      'Lift-required ceiling-zone environments',
      'Structured store survey and zone-based execution',
    ],
    bestFit:
      'Best for rollout operators, vendors, and project teams that need a field partner who can execute against a defined scope, work within site constraints, and support documented project follow-through.',
  },
  {
    title: 'Healthcare / Controlled Environment Support',
    body: 'Already Here LLC supports onsite work in healthcare-adjacent and other controlled environments where access handling, communication discipline, and documentation standards matter.',
    includes: [
      'Healthcare-adjacent onsite support',
      'Documentation-sensitive field work',
      'Structured communication during onsite activity',
      'Controlled-environment follow-through',
      'Coordination where access, handling, and site conduct matter',
      'Remediation and execution support in environments that require more discipline than generic labor coverage',
    ],
    bestFit:
      'Built for healthcare operators, biomed-adjacent teams, vendors, and other organizations that need onsite work handled carefully and communicated clearly.',
  },
];

const processSteps = [
  {
    step: '01',
    title: 'Qualify the request',
    body: 'We review the scope, site details, timing, access requirements, and service fit before the work is accepted.',
  },
  {
    step: '02',
    title: 'Align on execution',
    body: 'Coverage, scheduling, travel factors, and onsite requirements are confirmed so the visit is structured before arrival.',
  },
  {
    step: '03',
    title: 'Execute and close out',
    body: 'The work is carried out onsite with communication, field notes, and closeout documentation your team can use.',
  },
];

const bestFitItems = [
  'Defined scope',
  'Real site context',
  'Requested timing',
  'Remote-team coordination when needed',
  'Clear onsite objectives',
  'Work that benefits from disciplined execution and structured closeout',
];

const notIdealItems = [
  'Consumer or residential tech support',
  'Vague handyman-style requests',
  'Undefined break-fix requests with no scope',
  'Broad “come see what’s wrong” dispatches',
  'Low-detail emergency calls without site, timing, or access information',
];

export default function ServicesPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Onsite technical field support for remote teams, vendors, and rollout operators
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Disciplined field execution for work that has to be handled correctly on site
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Already Here LLC supports remote teams, MSPs, healthcare-adjacent operators,
            vendors, and rollout programs that need qualified onsite execution instead of vague
            field coverage. Based in Phoenix and serving Arizona first, we provide structured
            onsite support for remediation, infrastructure activity, endpoint work, rollout
            programs, and scheduled project execution, with qualified regional and project-based
            travel available for the right scope.
          </p>
          <p className="mt-5 max-w-4xl text-base leading-7 text-slate-300">
            We qualify the request, align on scope and timing, execute onsite, document what
            happened, and close the work out cleanly.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Dispatch
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

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Service groups
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Structured around buying intent, not a vague list of tasks
            </h2>
          </div>

          <div className="mt-10 space-y-6">
            {serviceGroups.map((group) => (
              <article
                key={group.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8"
              >
                <h3 className="text-2xl font-semibold text-slate-950">{group.title}</h3>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
                  {group.body}
                </p>

                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Includes
                    </p>
                    <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                      {group.includes.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Best fit
                    </p>
                    <p className="mt-3 text-base leading-7 text-slate-700">{group.bestFit}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              How work is handled
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Qualified first. Executed cleanly.
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
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
              <h2 className="text-2xl font-semibold text-slate-950">Best-fit work</h2>
              <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
                {bestFitItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-950" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
              <h2 className="text-2xl font-semibold text-slate-950">Not ideal for</h2>
              <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
                {notIdealItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">Coverage note</h2>
            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
              Phoenix is home base and Arizona is primary coverage. Regional and project-based
              travel can be supported for qualified work based on scope, logistics, scheduling,
              and commercial fit.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Need onsite execution tied to a defined scope?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Send the site details, requested timing, service type, and one-line scope summary.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Regional and out-of-market requests are welcome for qualified work.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Dispatch
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
EOF

cat > app/contact/page.tsx <<'EOF'
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Request Dispatch | Already Here LLC',
  description:
    'Request onsite technical field execution from Already Here LLC. Phoenix-based, Arizona-first support for remote teams, MSPs, vendors, healthcare-adjacent operators, and rollout programs.',
};

const serviceTypes = [
  'Remote Team Support',
  'Endpoint and User-Device Support',
  'Infrastructure Field Work',
  'Rollout and Modernization Support',
  'Healthcare / Controlled Environment Support',
  'Emergency / Time-Sensitive Request',
];

const priorityOptions = ['Standard', 'Urgent', 'Critical / Time-Sensitive'];

const windowOptions = [
  'Anytime',
  'Morning',
  'Midday',
  'Afternoon',
  'Evening',
  'After Hours',
  'Customer-Specified Window',
];

const yesNoOptions = ['No', 'Yes'];

const stateOptions = [
  'Arizona',
  'Nevada',
  'California',
  'Texas',
  'New Mexico',
  'Utah',
  'Colorado',
  'Other',
];

const bestFitItems = [
  'Structured work orders with a defined scope',
  'Remote-team coordination and bridge-call support',
  'Infrastructure, endpoint, rollout, remediation, and controlled-environment work',
  'Multi-site or travel-capable work with real site context',
  'Buyers who need documentation and usable closeout, not just physical presence',
];

const notIdealItems = [
  'Consumer or residential tech support',
  'Undefined handyman-style requests',
  'Low-detail emergency requests with no scope or access information',
  'Broad “come look and tell us what is wrong” calls with no real brief',
  'Requests that cannot provide a real site address, timing window, or onsite contact',
];

const handlingSteps = [
  {
    step: '01',
    title: 'Submit the request',
    body: 'Send the site details, requested timing, service type, scope summary, and any supporting context that affects onsite execution.',
  },
  {
    step: '02',
    title: 'We review fit',
    body: 'Coverage, schedule alignment, access requirements, travel factors, and execution fit are reviewed before the request is accepted.',
  },
  {
    step: '03',
    title: 'Onsite execution and closeout',
    body: 'Accepted work is handled onsite with communication, field notes, and closeout documentation your team can actually use.',
  },
];

export default function ContactPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Request dispatch
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Qualified onsite execution starts with a clear request
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            This is not a generic contact page. It is a qualification gate for remote teams,
            MSPs, vendors, healthcare-adjacent operators, and rollout programs that need onsite
            work handled correctly. The more precise the request, the faster it can be reviewed,
            routed, and executed.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:dispatch@alreadyherellc.com"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Email dispatch@alreadyherellc.com
            </a>
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
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Dispatch intake
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Send the work the way it needs to be routed
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
              Include the site, timing, scope, access considerations, and the operational context
              that matters. Regional and out-of-market travel requests are welcome for qualified
              work.
            </p>

            <form
              action="/api/dispatch"
              method="POST"
              className="mt-10 space-y-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8"
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Company
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="businessEmail"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Business email
                  </label>
                  <input
                    id="businessEmail"
                    name="businessEmail"
                    type="email"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-900">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid gap-6">
                <div>
                  <label
                    htmlFor="fullSiteAddress"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Full site address
                  </label>
                  <input
                    id="fullSiteAddress"
                    name="fullSiteAddress"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="state" className="block text-sm font-semibold text-slate-900">
                    State
                  </label>
                  <select
                    id="state"
                    name="state"
                    required
                    defaultValue="Arizona"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    {stateOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="siteCount"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    One site or multi-site
                  </label>
                  <select
                    id="siteCount"
                    name="siteCount"
                    required
                    defaultValue=""
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    <option value="" disabled>
                      Select one
                    </option>
                    <option value="One site">One site</option>
                    <option value="Multi-site">Multi-site</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="travelLikely"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Travel likely
                  </label>
                  <select
                    id="travelLikely"
                    name="travelLikely"
                    required
                    defaultValue="No"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    {yesNoOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="requestedDate"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Requested date
                  </label>
                  <input
                    id="requestedDate"
                    name="requestedDate"
                    type="date"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="requestedWindow"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Requested window
                  </label>
                  <select
                    id="requestedWindow"
                    name="requestedWindow"
                    required
                    defaultValue=""
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    <option value="" disabled>
                      Select one
                    </option>
                    {windowOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="dueByTime"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Due-by time
                  </label>
                  <input
                    id="dueByTime"
                    name="dueByTime"
                    type="time"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="serviceType"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Service type
                  </label>
                  <select
                    id="serviceType"
                    name="serviceType"
                    required
                    defaultValue=""
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    <option value="" disabled>
                      Select one
                    </option>
                    {serviceTypes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="priority"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    required
                    defaultValue="Standard"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    {priorityOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ticketReference"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Ticket / reference number
                  </label>
                  <input
                    id="ticketReference"
                    name="ticketReference"
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="onsiteContact"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Onsite contact
                  </label>
                  <input
                    id="onsiteContact"
                    name="onsiteContact"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="billingContact"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Billing contact
                  </label>
                  <input
                    id="billingContact"
                    name="billingContact"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="liftRequired"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Lift required
                  </label>
                  <select
                    id="liftRequired"
                    name="liftRequired"
                    required
                    defaultValue="No"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    {yesNoOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="toolsOrStagingRequired"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Tools / staging required
                  </label>
                  <select
                    id="toolsOrStagingRequired"
                    name="toolsOrStagingRequired"
                    required
                    defaultValue="No"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    {yesNoOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-6">
                <div>
                  <label
                    htmlFor="scopeSummary"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    One-line scope summary
                  </label>
                  <input
                    id="scopeSummary"
                    name="scopeSummary"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="remoteBridgeDetails"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Remote bridge details
                  </label>
                  <textarea
                    id="remoteBridgeDetails"
                    name="remoteBridgeDetails"
                    rows={4}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="accessNotes"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Access notes
                  </label>
                  <textarea
                    id="accessNotes"
                    name="accessNotes"
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sharedFileLink"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Shared file link
                  </label>
                  <input
                    id="sharedFileLink"
                    name="sharedFileLink"
                    type="url"
                    placeholder="https://"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="additionalNotes"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Additional notes
                  </label>
                  <textarea
                    id="additionalNotes"
                    name="additionalNotes"
                    rows={5}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Submit Dispatch Request
                </button>
                <a
                  href="mailto:dispatch@alreadyherellc.com"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-white"
                >
                  Email Dispatch Instead
                </a>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Direct dispatch contact
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                dispatch@alreadyherellc.com
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                Best for follow-up, documentation exchange, scope clarification, and project
                communication.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Best fit
              </p>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                {bestFitItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Not ideal for
              </p>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                {notIdealItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              How requests are handled
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Clear qualification before the visit is accepted
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {handlingSteps.map((item) => (
              <article
                key={item.step}
                className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8"
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

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Coverage note
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Phoenix-based. Arizona-first. Qualified travel support available.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Regional and out-of-market requests can be supported for qualified work based on
              scope, timing, logistics, and commercial fit.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
EOF

cat > app/sitemap.ts <<'EOF'
import type { MetadataRoute } from 'next';

const baseUrl = 'https://www.alreadyherellc.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/who-we-serve`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
EOF

echo "Complete replacements written:"
echo "  - app/page.tsx"
echo "  - app/services/page.tsx"
echo "  - app/contact/page.tsx"
echo "  - app/sitemap.ts"
