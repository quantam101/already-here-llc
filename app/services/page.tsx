import Link from "next/link";

const serviceCards = [
  {
    title: "Dispatch and recurring field support",
    body:
      "Single-site dispatches, recurring visits, post-install follow-through, remediation work, and onsite ownership from arrival through closeout.",
  },
  {
    title: "Store technology and endpoint work",
    body:
      "Onsite execution for payment devices, thin clients, workstations, printers, peripherals, and related store technology tasks.",
  },
  {
    title: "Network and infrastructure field activity",
    body:
      "Router and cradlepoint work, AP replacement revisits, low-voltage checks, rack-and-stack support, and related infrastructure tasks.",
  },
  {
    title: "Surveys, AV, and site verification",
    body:
      "Pre-work validation, photo documentation, device verification, light AV support, and site-readiness checks that reduce failed trips.",
  },
  {
    title: "Install support and remediation",
    body:
      "Hands-on field support for installs, punch-list work, follow-up corrections, and site cleanup when the original scope needs tighter execution.",
  },
  {
    title: "Documentation and closeout",
    body:
      "Clear notes, photo proof when required, ticket references, completion details, and usable closeout documentation your team can act on.",
  },
];

const operatingPoints = [
  "Phoenix-based with Arizona project support based on scope, timing, and site requirements.",
  "Built for vendors, MSPs, and multi-site operators that need clean onsite execution.",
  "Best for scoped field activity, follow-through visits, verification work, and documentation-heavy closeout.",
];

const requestExamples = [
  "Store hardware replacement, payment-device swap, workstation work, and device verification",
  "Recurring site visits, post-install follow-through, and punch-list remediation",
  "Router, cradlepoint, AP, and related branch or store infrastructure activity",
  "Survey, readiness check, photo documentation, and site validation support",
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
              Onsite field services built for real dispatch work.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Already Here LLC supports vendors, MSPs, and multi-site operators
              with onsite execution across Arizona. The work is scoped, handled
              cleanly, and closed out with documentation your team can use.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {operatingPoints.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-white p-6 text-base leading-8 text-slate-600"
              >
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
              Service coverage that fits dispatches, recurring visits, and
              closeout-heavy field work.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {serviceCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8"
              >
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  {item.body}
                </p>
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
              Best fit for teams that already know the site, scope, and outcome
              they need.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              This is not generic labor coverage. It is structured field support
              for technology, infrastructure, verification, remediation, and
              documentation-driven site work.
            </p>
          </div>

          <div className="space-y-4">
            {requestExamples.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-white p-6 text-base leading-8 text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 md:p-10">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                Request dispatch
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                Send the scope, city, timing, and site constraints.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Use the dispatch form to send project details, requested timing,
                ticket references, and any supporting notes or links that affect
                onsite execution.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Request Dispatch
              </Link>

              <Link
                href="/who-we-serve"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                See Who We Support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}