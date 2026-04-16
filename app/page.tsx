import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Phoenix Field Services | Retail, Kiosk, POS, Networking & Multi-Site Support",
  description:
    "Phoenix-based regional field execution for retail, kiosk, POS, signage, device, networking, rollout, and multi-site support. Built for agencies, vendors, operators, and project teams.",
  path: "/",
});

const proofItems = [
  "Phoenix-based",
  "Arizona-first coverage",
  "Structured closeout",
  "Multi-site capable",
];

const buyerPoints = [
  "Bundled location coverage",
  "Overflow and backup support",
  "Retail, kiosk, POS, signage, and device support",
  "Networking smart-hands and technical field execution",
  "Store-level documentation and photo closeout",
  "Single point of contact for execution and coordination",
];

const scopeGroups = [
  {
    title: "Merchandising, Audits & Resets",
    items: [
      "Merchandising support",
      "Store audits and verification visits",
      "Resets and changeouts",
      "Pallet and display updates",
      "Sticker and graphic swaps",
      "Punch-list and rework visits",
    ],
  },
  {
    title: "Kiosk, POS & Payment Device Support",
    items: [
      "Kiosk troubleshooting and replacement support",
      "Payment-device and POS support",
      "Peripheral replacement",
      "Receipt printer and scanner support",
      "Card reader and input device replacement",
      "Retrofit and refresh support",
    ],
  },
  {
    title: "Signage, Media Player & Display Updates",
    items: [
      "Media-player replacement",
      "Display and screen replacement support",
      "Digital-signage troubleshooting",
      "Menu board and mounted display support",
      "AV-related field replacement and swap work",
      "Store-level visual hardware refresh activity",
    ],
  },
  {
    title: "Endpoint, Thin Client & Device Replacement",
    items: [
      "Thin-client replacement",
      "Desktop and workstation replacement",
      "Device refresh and swap support",
      "Reimage and deployment follow-through",
      "Storage, power, and peripheral replacement",
      "Device-side remediation support",
    ],
  },
  {
    title: "Networking Smart-Hands & Field Verification",
    items: [
      "Smart-hands support for remote teams",
      "Rack and server-room follow-through",
      "Port, patching, and device-side field work",
      "Router, gateway, and network device support",
      "Site surveys and onsite validation",
      "Field verification and closeout support",
    ],
  },
  {
    title: "Rollout, Rework & Bundled Location Coverage",
    items: [
      "New-site setup support",
      "Rollout and conversion programs",
      "Modernization and refresh support",
      "Bundled site groups",
      "Repeat program execution across multiple locations",
      "Cleanup, recovery, and rework visits",
    ],
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
  "Signage and display environments",
  "Multi-site commercial locations",
];

const intakeModels = [
  "Single-site dispatches",
  "Bundled multi-site work",
  "Recurring support schedules",
  "Overflow and backup coverage",
  "Rework and missed-visit recovery",
  "Rollout and conversion programs",
  "Remote-team smart-hands requests",
  "Site survey and field verification visits",
  "Refresh and replacement projects",
  "Documentation-sensitive closeout work",
];

const faqItems = [
  {
    question: "What types of field projects do you support?",
    answer:
      "We support retail, commercial, and technical field scopes such as merchandising, audits, resets, kiosk and POS support, signage and display work, device replacement, media-player support, networking smart-hands, rollout support, rework visits, and store-level documentation.",
  },
  {
    question: "Do you only handle simple field tasks?",
    answer:
      "No. Our work ranges from light onsite support and repeat site tasks to more technical field execution such as kiosk and POS support, signage and device replacement, rollout support, and networking smart-hands depending on scope.",
  },
  {
    question: "Can you support bundled or multi-location work?",
    answer:
      "Yes. We support bundled location coverage, grouped site visits, recurring service schedules, and project-based field execution.",
  },
  {
    question: "Do you provide photo documentation and closeout reporting?",
    answer:
      "Yes. Clean documentation and photo closeout are part of how we help clients keep projects moving and reduce preventable rework.",
  },
  {
    question: "Can you assist with overflow or backup coverage?",
    answer:
      "Yes. We support overflow coverage, missed-visit recovery, rework assignments, and situations where a local execution partner is needed quickly.",
  },
  {
    question: "Do you support commercial and controlled environments beyond standard retail?",
    answer:
      "Yes. In addition to retail sites, we commonly support kiosk, restaurant, office, healthcare-adjacent, controlled-access, and other structured commercial environments depending on scope and site requirements.",
  },
  {
    question: "How do we send scope and location details?",
    answer:
      "Use the Request Coverage page or contact us directly with your project scope, service area, number of locations, and timeline.",
  },
];

export default function HomePage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Phoenix-Based Regional Field Coverage
          </p>

          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Field execution for retail, kiosk, POS, signage, device, networking, rollout,
            and multi-site support
          </h1>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Already Here LLC supports agencies, vendors, operators, and remote teams with
            dependable onsite execution across Phoenix and qualified Arizona work. We handle
            scopes ranging from routine field visits and device swaps to kiosk support,
            signage and media-player work, networking smart-hands, rollout execution, and
            documentation-driven closeout.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {proofItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200"
              >
                {item}
              </span>
            ))}
          </div>

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
              Buyer-facing coverage
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Regional field coverage for agencies, vendors, and multi-site projects
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              We support agencies, service providers, vendors, and project teams that need
              dependable field execution across Phoenix and surrounding Arizona markets. Our
              work includes merchandising, audits, resets, kiosk and POS support, signage
              and graphic updates, media-player replacement, device swaps, networking
              smart-hands, rollout support, and overflow coverage.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {buyerPoints.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-white p-5 text-base leading-7 text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/request-coverage"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Coverage
            </Link>
            <Link
              href="/for-agencies-service-providers"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Discuss a Project
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Representative field scope
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Broad field capability, controlled execution
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              Our work ranges from light field tasks and repeat site support to more
              technical onsite execution for remote teams, vendors, and multi-site
              operators. Scope varies by client, site conditions, documentation
              requirements, and program needs.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {scopeGroups.map((group) => (
              <article
                key={group.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8"
              >
                <h3 className="text-2xl font-semibold text-slate-950">{group.title}</h3>
                <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Environments served
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Environments we commonly support
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-700">
                We support onsite work across structured commercial environments where
                communication, scope control, and usable closeout matter.
              </p>

              <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
                {environments.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-950" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Dispatch models supported
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                How work commonly comes in
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-700">
                We support both one-off and repeat execution models depending on scope,
                schedule, travel requirements, and closeout needs.
              </p>

              <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
                {intakeModels.map((item) => (
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

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Why companies use us
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Built for operational reliability
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              Field work fails in predictable ways: missed visits, weak communication,
              incomplete closeout, inconsistent execution, preventable rework, and poor
              handoff between remote teams and onsite work. Our process is built to reduce
              those problems and give clients a dependable regional field partner that can
              step in, complete work cleanly, and close out clearly.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Responsive communication",
              "Dependable follow-through",
              "Local market familiarity",
              "Support for bundled locations and repeat programs",
              "Recurring and project-based coverage",
              "Broad field range from routine site tasks to technical smart-hands support",
              "Documentation-driven closeout",
              "Single point of contact for coordination",
            ].map((item) => (
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
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Coverage
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Phoenix metro coverage
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              We provide field coverage across Phoenix and surrounding markets, including
              Tempe, Mesa, Chandler, Scottsdale, Glendale, Peoria, Surprise, Goodyear,
              Avondale, Gilbert, and nearby service areas. Additional Arizona coverage may
              be available depending on scope, schedule, and project requirements.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Common buyer questions
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <h3 className="text-xl font-semibold text-slate-950">{item.question}</h3>
                <p className="mt-3 text-base leading-8 text-slate-700">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Need dependable Phoenix field coverage?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Contact us for bundled visits, recurring service, rollout support, overflow
              coverage, smart-hands work, and project-based field execution.
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
    </main>
  );
}
