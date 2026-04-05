import Link from "next/link";

const capabilities = [
  {
    title: "Dispatch and recurring field support",
    body:
      "Single-site dispatches, recurring visits, post-install follow-through, remediation work, and clean onsite ownership from arrival to closeout.",
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
];

const operatingModel = [
  {
    title: "Coverage model",
    body: "Phoenix-based with Arizona project support based on scope, schedule, and site requirements.",
  },
  {
    title: "Core work",
    body: "Dispatches, recurring visits, install support, remediation, site verification, and closeout documentation.",
  },
  {
    title: "Closeout",
    body: "Clear communication, usable notes, photo proof when needed, and documentation your team can act on.",
  },
];

const whoWeServe = [
  "Vendors needing reliable onsite execution",
  "MSPs coordinating remote teams and field dispatches",
  "Multi-site operators with store and branch technology needs",
  "Project teams that need clean documentation and closeout",
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
          <div>
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
              Phoenix-based • Commercially insured
            </div>

            <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.95] tracking-tight text-slate-900 md:text-7xl">
              Onsite field support for vendors, MSPs, and multi-site operators.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              Already Here LLC handles dispatches, recurring visits, installs,
              remediation, and closeout documentation across Arizona.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Request Dispatch
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Send Project Scope
              </Link>

              <Link
                href="/services"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                View Services
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {operatingModel.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {item.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Core capabilities
            </p>

            <div className="mt-6 space-y-4">
              {capabilities.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6"
                >
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
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
                You hand over the scope. We execute onsite, communicate clearly,
                and return documentation your team can actually use.
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
              {whoWeServe.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-base leading-8 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
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
                Use the dispatch form to send scope details, schedule windows,
                ticket references, and any supporting files or notes that affect
                the site visit.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Open Dispatch Form
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Review Services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}