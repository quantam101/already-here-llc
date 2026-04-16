import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "For Agencies & Service Providers | Phoenix Regional Field Coverage",
  description:
    "Dependable Phoenix field coverage for agencies, vendors, and service providers. Support for retail, kiosk, POS, signage, device, networking, rollout, and multi-site field execution.",
  path: "/for-agencies-service-providers",
});

const whoWeSupport = [
  "Retail execution agencies",
  "Merchandising providers",
  "Kiosk and POS vendors",
  "Signage and AV providers",
  "Networking and infrastructure teams",
  "Facilities vendors",
  "Rollout coordinators",
  "Service managers",
  "Multi-site project teams",
];

const fieldServices = [
  "Retail merchandising",
  "Store audits and site checks",
  "Planogram and compliance support",
  "Pallet display overlays and updates",
  "Sticker and graphic swaps",
  "Signage updates",
  "Fixture and display assembly",
  "Retail resets",
  "Rollout support",
  "Punch-list and rework visits",
  "Kiosk troubleshooting and component replacement",
  "POS and payment-device support",
  "Media-player and display-device replacement",
  "Thin-client, desktop, and endpoint replacement",
  "Networking smart-hands support",
  "Device swaps, refreshes, and reimage support",
  "Site surveys and field verification",
  "Store-level documentation and photo closeout",
];

const projectTypes = [
  "Single-store assignments",
  "Bundled multi-location visits",
  "Recurring service work",
  "Rush and overflow support",
  "Rework and cleanup visits",
  "Seasonal reset support",
  "Branded rollout support",
  "Refresh and replacement projects",
  "Site survey programs",
  "Conversion and modernization support",
  "Smart-hands support for remote engineers",
  "Field verification and completion reporting",
];

const environments = [
  "Retail stores",
  "Kiosk and self-service environments",
  "Restaurant and QSR sites",
  "Office and workplace environments",
  "Back-office equipment environments",
  "Healthcare and medical-center environments",
  "Controlled-access or documentation-sensitive sites",
  "New-store and remodel environments",
  "Signage and display environments",
  "Light infrastructure and networking support environments",
];

const scopeExamples = [
  "Retail audits and recurring store-check programs",
  "Merchandising and reset support",
  "Pallet display overlays and promotional changeouts",
  "Kiosk troubleshooting and parts replacement",
  "POS and payment-device support",
  "Receipt printer and peripheral replacement",
  "Digital-signage and media-player support",
  "Display replacement and mounted-screen work",
  "Device refresh, reimage, and endpoint swaps",
  "Thin-client and desktop replacement",
  "Networking smart-hands and onsite follow-through",
  "Site surveys, validation, and project verification",
  "New-site setup support",
  "Rollout, conversion, and modernization work",
  "Rework, cleanup, and missed-visit recovery",
];

const whyCompaniesUseUs = [
  "Responsive communication",
  "Dependable follow-through",
  "Local market familiarity",
  "Support for bundled locations",
  "Flexible recurring and project-based coverage",
  "Technical range beyond basic retail-only support",
  "Documentation-driven closeout",
  "Single point of contact for coordination",
];

export default function AgenciesPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            For agencies & service providers
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Phoenix regional field coverage for agencies, vendors, and service providers
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            We provide dependable on-the-ground execution for retail, kiosk, POS, signage,
            device, networking, and multi-site field work across Phoenix and surrounding
            Arizona markets.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/request-coverage"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Coverage
            </Link>
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Open Dispatch
            </Link>
          </div>

          <p className="mt-5 text-sm leading-7 text-slate-300">
            Existing dispatch threads can still use{" "}
            <a
              href="mailto:dispatch@alreadyherellc.com"
              className="font-semibold text-white underline decoration-slate-500 underline-offset-4"
            >
              dispatch@alreadyherellc.com
            </a>
            .
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="max-w-4xl text-base leading-8 text-slate-700">
            We support companies that need reliable regional execution without having to
            manage every location themselves. Whether you need overflow support, bundled
            visits, recurring service, rework coverage, rollout assistance, smart-hands
            support, or a local field partner for project-based work, we provide responsive
            communication, dependable execution, and clean documentation-driven closeout.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Who we support
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Built for buyers who need reliable local execution
              </h2>
              <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
                {whoWeSupport.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-950" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Broad field range
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Cleaner vendor consolidation
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-700">
                Many buyers do not need another narrow vendor that only handles one service
                type. They need a field partner that can absorb a wider range of onsite
                execution without creating confusion, extra handoffs, or preventable
                delays. Our work spans retail execution, kiosk and POS support, signage and
                media-player replacement, device refresh, networking smart-hands, rollout
                support, and structured site follow-through across commercial environments.
              </p>
              <p className="mt-4 text-base leading-8 text-slate-700">
                That makes it easier to assign work that falls somewhere between simple
                field tasks and more technical onsite support.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Field services we support
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Representative scope without the handoff chaos
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {fieldServices.map((item) => (
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
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Project types
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Project types we can support
              </h2>
              <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
                {projectTypes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Environments
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Environments we support
              </h2>
              <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
                {environments.map((item) => (
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

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Representative examples
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Examples of scope types supported
          </h2>
          <p className="mt-5 max-w-4xl text-base leading-8 text-slate-700">
            Representative completed work has included assignments such as:
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scopeExamples.map((item) => (
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
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
              <h2 className="text-2xl font-semibold text-slate-950">Primary service area</h2>
              <p className="mt-4 text-base leading-8 text-slate-700">
                We focus on dependable coverage across Phoenix and surrounding markets,
                including Glendale, Peoria, Surprise, Tempe, Mesa, Chandler, Scottsdale,
                Gilbert, Goodyear, and Avondale.
              </p>
              <p className="mt-4 text-base leading-8 text-slate-700">
                Additional Arizona coverage may be available depending on scope, schedule,
                travel requirements, and project volume.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
              <h2 className="text-2xl font-semibold text-slate-950">
                Why companies use us
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-700">
                Companies use us because field work fails in predictable ways: missed
                visits, weak documentation, poor communication, inconsistent execution,
                incomplete handoff, and preventable rework. Our process is built to reduce
                those problems and make store-level and site-level execution easier to
                manage.
              </p>
              <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
                {whyCompaniesUseUs.map((item) => (
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
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Need Phoenix coverage?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              If you need a local partner for recurring assignments, bundled location
              coverage, overflow support, smart-hands work, or project-based field
              execution, send the scope, service area, and timeline.
            </h2>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/request-coverage"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Coverage
            </Link>
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Open Dispatch
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
