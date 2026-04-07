import Link from 'next/link';
import { siteConfig } from '@/lib/site';

const capabilityCards = [
  {
    title: 'Remote support team assist',
    body: 'Work alongside remote support teams on bridge calls, laptop and endpoint troubleshooting, guided field execution, and onsite follow-through when the remote team needs reliable hands on site.'
  },
  {
    title: 'Smart hands, servers, and port changes',
    body: 'Eyes-and-hands onsite support for servers, storage, drive swaps, patching, port changes, rack activity, and data-center or closet work that cannot be solved remotely.'
  },
  {
    title: 'Healthcare, biomed, and regulated environments',
    body: 'Current field experience includes healthcare and biomed-related work where access control, documentation discipline, and careful onsite communication matter.'
  },
  {
    title: 'New technology builds and upgrade programs',
    body: 'Support for rollout, install, modernization, RFID upgrade work, remediation, and project follow-through when a build needs dependable onsite execution.'
  }
];

const trustItems = [
  {
    title: 'Current / recent field experience',
    body: 'GE HealthCare, McKesson, HPE, Starbucks, and current H&M RFID upgrade work.'
  },
  {
    title: 'Working model',
    body: 'Defined scope, direct communication, workable scheduling, and clean closeout instead of vague field coverage promises.'
  },
  {
    title: 'Primary contact path',
    body: 'Structured dispatch intake form plus direct email for follow-up, documentation exchange, and project communication.'
  }
];

const fitItems = [
  'MSPs and remote support teams that need onsite laptop, endpoint, or hands-on execution',
  'Data-center, server, storage, rack, patching, drive swap, and port-change work that needs physical presence',
  'Healthcare and biomed-adjacent environments where access, handling, and documentation discipline matter',
  'Retail, restaurant, and rollout teams needing upgrade, modernization, RFID, or remediation support'
];

const processItems = [
  {
    step: '01',
    title: 'Send the scope',
    body: 'Send city, timing, scope summary, ticket reference, and site constraints through the dispatch form.'
  },
  {
    step: '02',
    title: 'We confirm fit',
    body: 'Coverage, schedule alignment, access, and execution requirements are reviewed before the visit is accepted.'
  },
  {
    step: '03',
    title: 'Onsite execution and closeout',
    body: 'The work is executed onsite with communication, field notes, and closeout your team can actually use.'
  }
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div>
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
              Phoenix-based • Commercially insured • Structured closeout
            </div>

            <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.95] tracking-tight text-slate-900 md:text-7xl">
              Arizona field execution for remote support teams, MSPs, healthcare operators, and rollout programs.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              Already Here LLC handles onsite smart hands, laptop and endpoint work, server and data-center activity,
              drive swaps, port changes, remediation, site verification, and upgrade support across Arizona.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
                Remote team coordination
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
                Smart hands / eyes-on-hands
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
                Servers, drive swaps, and port changes
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Request Dispatch
              </Link>

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