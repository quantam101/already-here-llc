import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Who We Serve | Already Here LLC',
  description:
    'Phoenix-based, Arizona-first onsite technical field execution for remote teams, MSPs, vendors, healthcare-adjacent operators, and rollout programs that need disciplined onsite support and structured closeout.',
};

const buyerGroups = [
  {
    title: 'MSPs and Remote Support Teams',
    body: 'Built for teams that already own the ticket, workflow, bridge, or customer relationship but need reliable onsite execution to complete work that cannot be resolved remotely.',
    fitPoints: [
      'Bridge-call coordination',
      'Guided troubleshooting',
      'Endpoint and user-device support',
      'Smart hands and physical follow-through',
      'Validation, remediation, and documented closeout',
    ],
  },
  {
    title: 'Vendors and Prime Contractors',
    body: 'Already Here LLC supports vendors, subcontracting workflows, and delivery partners that need disciplined onsite execution without vague labor coverage or loose communication.',
    fitPoints: [
      'Defined scopes',
      'Site-based execution',
      'Install and remediation support',
      'Escalation-sensitive field work',
      'Structured communication during and after the visit',
    ],
  },
  {
    title: 'Healthcare and Biomed-Adjacent Operators',
    body: 'Strong fit for healthcare-adjacent and controlled environments where access handling, professionalism, communication discipline, and documentation standards matter.',
    fitPoints: [
      'Healthcare-adjacent field work',
      'Documentation-sensitive environments',
      'Access-controlled settings',
      'Careful onsite communication',
      'Structured closeout for remote stakeholders',
    ],
  },
  {
    title: 'Rollout, Upgrade, and Modernization Teams',
    body: 'Built for project teams handling refreshes, modernization work, RFID-related field execution, remediation, and multi-site follow-through that need reliable onsite completion.',
    fitPoints: [
      'Rollout and refresh support',
      'RFID-related field execution',
      'Remediation tied to project delivery',
      'Mapped deployment support',
      'Structured onsite follow-through',
    ],
  },
];

const goodFitItems = [
  'Defined scope',
  'Real site context',
  'Requested timing and access information',
  'Remote-team coordination when needed',
  'Work that benefits from clear communication and structured closeout',
  'Single-site or qualified multi-site execution',
];

const notIdealItems = [
  'Consumer or residential tech support',
  'Generic walk-up “IT help” expectations',
  'Undefined handyman-style requests',
  'Low-detail dispatches with no site context',
  'Broad “come out and figure it out” calls with no real brief',
  'Work that is better suited to commodity labor coverage than controlled field execution',
];

const engagementModel = [
  {
    title: 'Qualified before accepted',
    body: 'Already Here LLC reviews scope, timing, access, service fit, and travel requirements before work is accepted.',
  },
  {
    title: 'Structured onsite execution',
    body: 'Work is performed against a defined objective with communication that supports the remote team, vendor, or operator behind the request.',
  },
  {
    title: 'Closeout that can be used',
    body: 'The output is not just physical presence. It is execution plus documentation, field notes, and usable follow-through.',
  },
];

export default function WhoWeServePage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Who we serve
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Built for buyers who need onsite work handled cleanly, not vaguely covered
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Already Here LLC is not positioned as broad local IT help. It is built for remote
            teams, MSPs, vendors, healthcare-adjacent operators, and rollout programs that need
            disciplined onsite technical field execution across Arizona, with qualified travel
            support for the right work.
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

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Buyer groups
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              The site is built to self-screen for the right operating model
            </h2>
          </div>

          <div className="mt-10 space-y-6">
            {buyerGroups.map((group) => (
              <article
                key={group.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8"
              >
                <h3 className="text-2xl font-semibold text-slate-950">{group.title}</h3>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
                  {group.body}
                </p>

                <ul className="mt-6 grid gap-3 text-base leading-7 text-slate-700 lg:grid-cols-2">
                  {group.fitPoints.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <h2 className="text-2xl font-semibold text-slate-950">Good fit</h2>
              <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
                {goodFitItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-950" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
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
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Engagement model
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Structured for controlled field execution
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {engagementModel.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8"
              >
                <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
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
              Need a field partner that can execute onsite without confusion?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Send the site, timing, scope summary, and access details through dispatch intake.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Arizona is primary coverage. Regional and out-of-market requests are reviewed for
              qualified work.
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
