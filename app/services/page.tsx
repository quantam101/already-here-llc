import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services | Phoenix Field Execution & Multi-Site Support | Already Here LLC",
  description:
    "Merchandising, audits, resets, kiosk and POS support, signage updates, device replacement, networking smart-hands, and rollout support across Phoenix and qualified Arizona work.",
};

const serviceGroups = [
  {
    title: "Merchandising, Audits & Resets",
    body: "Support for recurring retail visits, audits, resets, display updates, sticker and graphic swaps, and repeat site execution where consistency and closeout matter.",
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
    title: "Kiosk, POS & Payment Device Support",
    body: "Onsite support for kiosk, POS, and payment-device issues where physical access, replacement activity, troubleshooting, or structured follow-through is required.",
    includes: [
      "Kiosk troubleshooting",
      "POS support",
      "Payment-device support",
      "Receipt printer and scanner replacement",
      "Card reader and input device replacement",
      "Retrofit and refresh support",
    ],
    bestFit:
      "Built for self-service, retail-tech, payment, and front-of-house environments that need reliable onsite handling.",
  },
  {
    title: "Signage, Media Player & Display Updates",
    body: "Field support for mounted screens, display hardware, media players, digital signage, and related visual system replacements or troubleshooting.",
    includes: [
      "Media-player replacement",
      "Digital-signage troubleshooting",
      "TV and display support",
      "Menu board support",
      "Mounted display work",
      "Visual hardware refresh activity",
    ],
    bestFit:
      "Best for signage, display, AV, and store-technology scopes that need clean onsite execution and usable closeout.",
  },
  {
    title: "Endpoint, Thin Client & Device Replacement",
    body: "Structured device replacement, refresh, reimage, and endpoint-side remediation support where field follow-through is needed to complete the scope correctly.",
    includes: [
      "Thin-client replacement",
      "Desktop and workstation replacement",
      "Device refresh and swap support",
      "Reimage and deployment follow-through",
      "Storage and peripheral replacement",
      "Device-side remediation support",
    ],
    bestFit:
      "Built for remote teams, vendors, and multi-site operators that need onsite device work completed without avoidable back-and-forth.",
  },
  {
    title: "Networking Smart-Hands & Field Verification",
    body: "Onsite smart-hands support for remote teams that need qualified physical execution around network devices, rack activity, port-side work, surveys, and verification.",
    includes: [
      "Smart-hands support",
      "Rack and server-room follow-through",
      "Port and patching activity",
      "Router, gateway, and device support",
      "Site surveys",
      "Field verification and closeout",
    ],
    bestFit:
      "Best for remote engineers, infrastructure vendors, and project teams that need disciplined onsite follow-through tied to a defined scope.",
  },
  {
    title: "Rollout, Rework & Bundled Location Coverage",
    body: "Project-based execution for rollout support, new-site setup, refresh programs, bundled location visits, rework, cleanup, and repeat market coverage.",
    includes: [
      "New-site setup support",
      "Rollout and conversion work",
      "Modernization and refresh support",
      "Bundled site groups",
      "Repeat program execution",
      "Cleanup, recovery, and rework visits",
    ],
    bestFit:
      "Built for companies that need broader field responsibility across one site, multiple sites, or recurring market coverage.",
  },
];

const environments = [
  "Retail stores",
  "Kiosk and self-service environments",
  "Restaurant and QSR environments",
  "Healthcare-adjacent and medical environments",
  "Office and workplace environments",
  "Back-office equipment environments",
  "Controlled-access sites",
  "Remodel, conversion, and refresh environments",
];

const projectModels = [
  "Single-location service calls",
  "Bundled multi-location visits",
  "Recurring service support",
  "Overflow and backup coverage",
  "Rework and missed-visit recovery",
  "Rollout and conversion programs",
  "Site survey and field verification visits",
  "Refresh and replacement projects",
];

export default function ServicesPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Phoenix field execution & multi-site support
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Structured services built around real field scope, not vague task lists
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Already Here LLC supports a controlled range of onsite work across retail,
            kiosk, POS, signage, device, networking, rollout, and documentation-driven
            closeout scopes. The exact work varies by client and environment, but the
            delivery standard stays the same: responsive communication, dependable
            execution, and usable closeout.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/request-coverage"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Coverage
            </Link>
            <Link
              href="/for-agencies-service-providers"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Discuss a Project
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Service architecture
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Six buyer-facing service buckets that reflect the real work mix
            </h2>
          </div>

          <div className="mt-10 space-y-6">
            {serviceGroups.map((group) => (
              <article
                key={group.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8"
              >
                <h3 className="text-2xl font-semibold text-slate-950">{group.title}</h3>
                <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
                  {group.body}
                </p>

                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Includes
                    </p>
                    <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                      {group.includes.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Best fit
                    </p>
                    <p className="mt-3 text-base leading-7 text-slate-700">{group.bestFit}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <h2 className="text-2xl font-semibold text-slate-950">
                Environments we commonly support
              </h2>
              <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
                {environments.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-950" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <h2 className="text-2xl font-semibold text-slate-950">
                Project models we commonly support
              </h2>
              <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
                {projectModels.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">Coverage note</h2>
            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
              Phoenix is home base and Arizona is primary coverage. Additional Arizona work
              may be supported for qualified scopes based on schedule, travel, site
              readiness, and commercial fit.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Need a local execution partner?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Send the scope, service area, number of locations, and timeline.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              We review fit, coverage, and next-step availability before confirming work.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/request-coverage"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Coverage
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