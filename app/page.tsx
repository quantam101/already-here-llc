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
                href="/dispatch"
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
                  href="/service-area"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  View Service Area
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
              <Link
                href="/services"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Review Services
              </Link>

              <a
                href={`mailto:${siteConfig.email}`}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Email Dispatch
              </a>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {trustItems.map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {item.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Direct dispatch contact
            </p>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Dispatch email
              </p>
              <a
                href={`mailto:${siteConfig.email}`}
                className="mt-3 block text-2xl font-semibold tracking-tight text-slate-900 underline decoration-slate-300 underline-offset-4 hover:text-action"
              >
                {siteConfig.email}
              </a>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Best for direct follow-up, documentation exchange, project communication, and scope clarification after first contact.
              </p>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Current / recent environments
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <li className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>GE HealthCare and McKesson-related healthcare field activity</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>HPE-related enterprise and infrastructure work</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>Starbucks field execution and restaurant technology environments</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>Current H&M RFID upgrade support and new technology build activity</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Best fit
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Defined scope, real site context, remote team coordination when needed, and work that benefits from reliable onsite execution rather than generic labor coverage.
              </p>
              <div className="mt-5">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Open Dispatch Form
                </Link>
              </div>
            </div>
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
              Work built around execution clarity, not vague field coverage claims.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              The model is defined scopes, direct communication, workable scheduling, and clean documentation at closeout.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {capabilityCards.map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 md:p-7">
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{item.title}</h3>
                <p className="mt-3 text-base leading-8 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                Who this is built for
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                Teams that need onsite work handled without confusion.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                You hand over the scope. Already Here LLC executes onsite, works with the remote team if needed, and returns documentation your team can use.
              </p>

              <div className="mt-8">
                <Link
                  href="/who-we-serve"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  See who we support
                </Link>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {fitItems.map((item) => (
                <div key={item} className="rounded-3xl border border-slate-200 bg-white p-6 text-base leading-8 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              How dispatch starts
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Faster intake. Less back-and-forth. Cleaner execution.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {processItems.map((item) => (
              <div key={item.step} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Step {item.step}
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 md:p-10">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                Request dispatch
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                Send scope, city, timing, and site constraints.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Use the dispatch form to send scope details, requested timing, ticket references, remote-team context, and any supporting files or notes that affect onsite execution.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Open Dispatch Form
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
