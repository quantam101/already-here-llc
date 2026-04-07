import Link from 'next/link';
import { siteConfig } from '@/lib/site';

const capabilityCards = [
  {
    title: 'Dispatch and recurring field support',
    body: 'Single-site dispatches, recurring visits, post-install follow-through, remediation work, and clear onsite ownership from arrival to closeout.'
  },
  {
    title: 'Store technology and endpoint work',
    body: 'Onsite execution for payment devices, thin clients, workstations, printers, peripherals, and related store technology tasks.'
  },
  {
    title: 'Network and infrastructure field activity',
    body: 'Router and Cradlepoint work, AP replacement revisits, low-voltage checks, rack-and-stack support, and related infrastructure tasks.'
  },
  {
    title: 'Surveys, AV, and site verification',
    body: 'Pre-work validation, photo documentation, device verification, light AV support, and site-readiness checks that reduce failed trips.'
  }
];

const trustItems = [
  {
    title: 'Coverage model',
    body: 'Phoenix-based with Arizona project support based on scope, schedule, site requirements, and travel fit.'
  },
  {
    title: 'Closeout standard',
    body: 'Clear notes, field observations, and documentation your internal team can actually use.'
  },
  {
    title: 'Intake path',
    body: 'Structured dispatch form for faster intake, cleaner scoping, and fewer follow-up questions.'
  }
];

const fitItems = [
  'Vendors that already know the scope and need reliable onsite execution',
  'MSPs coordinating remote teams, dispatches, and follow-up remediation',
  'Multi-site operators with store, branch, and field-technology needs',
  'Project teams that need clean documentation and closeout instead of vague updates'
];

const processItems = [
  {
    step: '01',
    title: 'Send the scope',
    body: 'Use the dispatch form to send city, timing, access conditions, ticket reference, and the one-line scope summary.'
  },
  {
    step: '02',
    title: 'We review fit',
    body: 'We review coverage, schedule alignment, site requirements, and whether the scope fits the operating model.'
  },
  {
    step: '03',
    title: 'Onsite execution and closeout',
    body: 'When the fit is workable, the visit is executed and closed with usable notes, communication, and documentation.'
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
              Arizona field execution for vendors, MSPs, and multi-site operators.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              Already Here LLC handles dispatches, recurring visits, install support, remediation,
              site verification, and documentation-heavy onsite work across Arizona project markets.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
                Clean onsite ownership
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
                Documentation your team can use
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
                Direct dispatch contact
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
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                >
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
                Best for direct follow-up, documentation exchange, project communication, and scope
                clarification after first contact.
              </p>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Best fit
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <li className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>Defined scope with known deliverables</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>Need for clean closeout and field communication</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>Arizona site coverage based on schedule and travel fit</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>Store, branch, network, survey, AV, and infrastructure-related field work</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Intake shortcut
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Send city, timing, scope summary, site constraints, and any shared file links through
                the dispatch form so the visit starts with the right context.
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
              The model is simple: defined scopes, workable scheduling, direct communication, and
              clean documentation at closeout.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {capabilityCards.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 md:p-7"
              >
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {item.title}
                </h3>
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
                Who we serve
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                Built for teams that need onsite work handled without confusion.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                You hand over the scope. We execute onsite, communicate clearly, and return
                documentation your team can actually use.
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
                <div
                  key={item}
                  className="rounded-3xl border border-slate-200 bg-white p-6 text-base leading-8 text-slate-700"
                >
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
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                  {item.title}
                </h3>
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
                Use the dispatch form to send scope details, schedule windows, ticket references,
                and any supporting files or notes that affect the site visit.
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