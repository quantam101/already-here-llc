import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";

type ServiceBucket = {
  title: string;
  description: string;
  includes: string[];
  bestFit: string;
};

export const metadata: Metadata = createPageMetadata({
  title: "Services | Phoenix Field Execution & Multi-Site Support",
  description:
    "Merchandising, audits, resets, kiosk and POS support, signage updates, device replacement, networking smart-hands, and rollout support across Phoenix and qualified Arizona work.",
  path: "/services",
});

const serviceBuckets: ServiceBucket[] = [
  {
    title: "Merchandising, Audits & Resets",
    description:
      "Support for recurring retail visits, audits, resets, display updates, sticker and graphic swaps, and repeat site execution where consistency and closeout matter.",
    includes: [
      "Merchandising support",
      "Store audits and site checks",
      "Resets and changeouts",
      "Pallet and display updates",
      "Sticker and graphic swaps",
      "Punch-list and rework visits",
    ],
    bestFit:
      "Best for agencies, vendors, and operators that need repeatable store-level execution across one or more locations.",
  },
  {
    title: "POS, Devices & Signage",
    description:
      "Onsite field support for POS hardware, payment devices, kiosks, digital signage, displays, printers, and related retail technology that still needs hands on site.",
    includes: [
      "POS swaps and troubleshooting",
      "Kiosk installs and remediation",
      "Digital signage replacement",
      "Peripheral and printer support",
      "Media player and display work",
      "Device staging and replacement",
    ],
    bestFit:
      "Best for retail technology teams, device operators, and service providers that need field execution with clear documentation.",
  },
  {
    title: "Remote Team Support",
    description:
      "Bridge-call coordination, guided troubleshooting, validation, remediation, and onsite follow-through when the remote team cannot finish the work from a distance.",
    includes: [
      "Guided troubleshooting onsite",
      "Remote bridge-call support",
      "Validation and verification",
      "Physical follow-through",
      "Photo and note-based closeout",
      "Repeat follow-up visits",
    ],
    bestFit:
      "Best for MSPs, NOCs, service desks, and remote support teams that need dependable onsite hands in Arizona.",
  },
  {
    title: "Infrastructure Field Work",
    description:
      "Smart hands, patching, rack work, structured follow-through, port and device checks, basic low-voltage activity, and physical infrastructure work that requires onsite presence.",
    includes: [
      "Rack and server-room support",
      "Patching and port verification",
      "Cable tracing and replacement",
      "Drive, part, and device swaps",
      "Basic low-voltage field execution",
      "Physical site remediation",
    ],
    bestFit:
      "Best for infrastructure teams, field service partners, and operators that need clear onsite execution rather than general handyman work.",
  },
  {
    title: "Rollout and Modernization Support",
    description:
      "Rollout execution, refresh activity, modernization work, multi-site coordination, and structured project follow-through across one site or many.",
    includes: [
      "Rollout support",
      "Refresh and modernization visits",
      "Multi-site coordination",
      "Project-based travel support",
      "Revisit and punch-list closeout",
      "Documentation-first execution",
    ],
    bestFit:
      "Best for rollout operators, implementation teams, and buyers that need a field partner who can execute to scope and close cleanly.",
  },
  {
    title: "Healthcare / Controlled Environments",
    description:
      "Access-sensitive, documentation-sensitive, and workflow-sensitive onsite work where professionalism, handling discipline, and clean closeout matter.",
    includes: [
      "Healthcare-adjacent field support",
      "Sensitive equipment handling",
      "Structured onsite communication",
      "Documentation-driven closeout",
      "Controlled environment professionalism",
      "Repeatable site process compliance",
    ],
    bestFit:
      "Best for healthcare-adjacent operators, vendors, and support teams that need careful onsite execution in structured environments.",
  },
];

export default function ServicesPage() {
  const displayBuckets = [...serviceBuckets].reverse();

  return (
    <main className="bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Service Architecture
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Six buyer-facing service buckets that reflect the real work mix
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Already Here LLC supports the work that buyers actually need done on
            site: remote team follow-through, infrastructure work, retail tech,
            controlled environment execution, rollouts, resets, and recurring
            field activity with usable closeout.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/request-coverage"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Request Coverage
            </Link>
            <Link
              href="/for-agencies-service-providers"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              Discuss a Project
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
        <div className="space-y-8">
          {displayBuckets.map((bucket) => (
            <section
              key={bucket.title}
              className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
            >
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                    {bucket.title}
                  </h2>
                  <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                    {bucket.description}
                  </p>

                  <div className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Includes
                    </p>
                    <ul className="mt-5 space-y-4">
                      {bucket.includes.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 text-lg leading-8 text-slate-700"
                        >
                          <span className="mt-2 h-3 w-3 rounded-full bg-blue-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <aside className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 sm:p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Best Fit
                  </p>
                  <p className="mt-5 text-lg leading-8 text-slate-700">
                    {bucket.bestFit}
                  </p>
                </aside>
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                Need onsite execution?
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Send the site, timing, scope summary, and access details through
                dispatch.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Same-day and urgent Arizona work is reviewed by scope, access,
                schedule, and execution fit.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/dispatch"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Open Dispatch Form
              </Link>
              <Link
                href="/request-coverage"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
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
