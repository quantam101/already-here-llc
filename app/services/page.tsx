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
              href="/dispatch"
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
              href="/dispatch"
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
