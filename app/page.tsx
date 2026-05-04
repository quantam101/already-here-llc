// app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Phoenix Field Execution Partner | Already Here LLC",
  description:
    "Phoenix-based onsite field execution for remote teams, MSPs, vendors, rollout operators, POS/device support, smart-hands work, and documented closeout.",
  path: "/",
});

const serviceHighlights = [
  "POS, kiosk, payment-device, and peripheral support",
  "Smart-hands support for remote engineers and MSPs",
  "Retail technology rollout, refresh, and remediation work",
  "Network rack, port, cable, and device verification support",
  "Site surveys, photo closeout, and field documentation",
  "Phoenix-first coverage with qualified Arizona travel review",
];

const buyerGroups = [
  {
    title: "MSPs and remote support teams",
    body: "Onsite hands for tickets, bridge calls, guided troubleshooting, device checks, and physical remediation that cannot be completed remotely.",
  },
  {
    title: "Vendors and rollout operators",
    body: "Local execution for defined scopes, retail programs, refreshes, project follow-through, rework, and documentation-sensitive visits.",
  },
  {
    title: "Agencies and service providers",
    body: "Phoenix regional coverage for buyers that need reliable local execution without loose communication or vague labor coverage.",
  },
];

const operatingModel = [
  "Qualified before accepted",
  "Site and access details reviewed first",
  "Scope, schedule, and closeout requirements captured up front",
  "Execution documented for the buyer, remote team, or service provider",
];

export default function HomePage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">
            Phoenix field execution / onsite technical support
          </p>
          <h1 className="mt-5 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Onsite work handled cleanly for teams that cannot afford vague field coverage.
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Already Here LLC supports remote teams, MSPs, vendors, agencies, and rollout operators with Phoenix-based field execution: smart hands, POS and device support, infrastructure follow-through, site surveys, and documented closeout.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Open Dispatch Intake
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

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Service focus
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Built around the real work buyers send to the field.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {serviceHighlights.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-base leading-7 text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-6 lg:grid-cols-3">
            {buyerGroups.map((group) => (
              <article key={group.title} className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
                <h2 className="text-2xl font-semibold text-slate-950">{group.title}</h2>
                <p className="mt-4 text-base leading-8 text-slate-700">{group.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Operating model
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Qualified dispatch, controlled execution, usable closeout.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-700">
                The dispatch path is structured to capture the information needed to make a responsible acceptance decision before committing to work: site, schedule, access, onsite contact, billing contact, scope, bridge details, tools, lift needs, and closeout expectations.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <ul className="space-y-4 text-base leading-7 text-slate-700">
                {operatingModel.map((item) => (
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

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Need onsite execution?
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Send the site, timing, contacts, and scope details through dispatch intake.
              </h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                Submission does not guarantee acceptance. Requests are reviewed by service fit, schedule, access, closeout requirements, and travel impact.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link
                href="/dispatch"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Start Dispatch Intake
              </Link>
              <Link
                href="/request-coverage"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
              >
                Request Coverage
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
