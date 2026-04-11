import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Request Regional Coverage | Already Here LLC",
  description:
    "Send project scope, service area, number of locations, and timeline for Phoenix-market field coverage, bundled visits, recurring support, rollout work, and smart-hands execution.",
};

const useCases = [
  "Bundled visits",
  "Recurring service support",
  "Rollout projects",
  "Smart-hands requests",
  "Rework coverage",
  "Overflow support",
  "General Phoenix-market field execution needs",
];

const requestFields = [
  "Company Name",
  "Contact Name",
  "Email",
  "Phone",
  "Type of Work",
  "Number of Locations",
  "Market / City",
  "Site Type / Environment",
  "Timeline",
  "One-Time or Recurring",
  "Scope Details / Notes",
];

const requestFlags = [
  "Bundled Locations",
  "Overflow Support Needed",
  "Recurring Service Inquiry",
  "Rework / Cleanup Needed",
  "Smart-Hands / Remote Team Support",
  "After-Hours / Weekend Support",
];

export default function RequestCoveragePage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Request regional coverage
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Send the scope, service area, number of locations, and timeline
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Use this page for bundled visits, recurring service support, rollout projects,
            smart-hands requests, rework coverage, or general Phoenix-market field
            execution needs.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Continue to Dispatch Intake
            </Link>
            <a
              href="mailto:dispatch@alreadyherellc.com"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Email Scope / Locations
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Best for
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Coverage requests that need clear review and next-step availability
              </h2>
              <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
                {useCases.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
              <h2 className="text-2xl font-semibold text-slate-950">
                Important note
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-700">
                To preserve the current live workflow, coverage requests route into the
                existing dispatch intake path. That keeps the site on one verified intake
                system instead of creating a second untested submit flow.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Structured intake
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Coverage request details we want up front
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {requestFields.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-base leading-7 text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
            <h3 className="text-2xl font-semibold text-slate-950">Optional request flags</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {requestFlags.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-slate-200 bg-white p-5 text-base leading-7 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">
              Continue into the live dispatch path
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-700">
              Use the button below to move into the current dispatch intake page. Include
              the scope, number of locations, market, timeline, and any bundled or
              recurring-service details in your request.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dispatch"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Continue to Dispatch Intake
              </Link>
              <a
                href="mailto:dispatch@alreadyherellc.com"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Email Scope / Locations
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
