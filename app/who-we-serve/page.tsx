import Link from "next/link";

const audienceCards = [
  {
    title: "Vendors",
    body:
      "For teams that need reliable onsite execution, clean communication, and usable closeout without babysitting the field visit.",
  },
  {
    title: "MSPs",
    body:
      "For managed service providers coordinating remote teams, recurring site support, technology rollouts, and follow-up dispatches.",
  },
  {
    title: "Multi-site operators",
    body:
      "For operators managing stores, branches, or distributed locations that need onsite technology and infrastructure work handled consistently.",
  },
  {
    title: "Project teams",
    body:
      "For implementation and operations teams that need site verification, remediation, documentation, and completion details they can actually use.",
  },
];

const goodFitPoints = [
  "Single-site dispatches with a defined objective and clear outcome",
  "Recurring field visits, post-install follow-through, and punch-list work",
  "Store, branch, and multi-site technology support that depends on onsite execution",
  "Projects that need photos, notes, validation, and documentation-heavy closeout",
];

const notIdealPoints = [
  "Unscoped general labor without a defined technical or operational objective",
  "Requests that depend on unapproved access, missing site details, or unclear ownership",
  "Jobs where no one can provide timing, ticket references, or basic execution context",
];

const supportPoints = [
  "Dispatches, recurring visits, remediation, and follow-up field activity",
  "Store technology, endpoint work, infrastructure checks, surveys, and verification",
  "Clear communication before, during, and after the onsite visit",
];

export default function WhoWeServePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
              Who we serve
            </div>

            <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-tight text-slate-900 md:text-6xl">
              Built for teams that need onsite work handled without confusion.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Already Here LLC works best with vendors, MSPs, multi-site
              operators, and project teams that already know the site, scope,
              timing, and outcome they need. The value is clean onsite
              execution, clear communication, and documentation that supports
              closeout.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {audienceCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[2rem] border border-slate-200 bg-white p-8"
              >
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {item.title}
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Good fit
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Best for scoped field work with a clear objective, site context,
              and expected outcome.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              The strongest engagements are the ones where the request already
              has scope, site information, timing, and practical constraints
              defined before the dispatch is sent.
            </p>

            <div className="mt-8 space-y-4">
              {goodFitPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-base leading-8 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              How support is delivered
            </p>

            <div className="mt-6 space-y-4">
              {supportPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-slate-200 bg-white p-6 text-base leading-8 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                Working model
              </h3>
              <p className="mt-4 text-base leading-8 text-slate-600">
                You provide the scope, site details, timing window, and any
                constraints that matter. Already Here LLC executes onsite,
                communicates clearly, and returns closeout information your team
                can use without rework.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                Not ideal
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                The work goes better when the request is specific, structured,
                and ready to execute.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                If the job is missing scope, access details, timing, or a clear
                onsite objective, the right next step is to tighten the request
                before dispatching it.
              </p>
            </div>

            <div className="space-y-4">
              {notIdealPoints.map((item) => (
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