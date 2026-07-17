import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Arizona Field Coverage Retainers",
  description:
    "Reserved Arizona field operations capacity on a monthly retainer — smart hands, data center, network, POS, healthcare, and low-voltage coverage anchored from Phoenix. Essential, Business, and Enterprise tiers.",
  path: "/arizona-field-coverage",
});

const tiers = [
  {
    name: "Essential Coverage",
    price: "$2,000",
    cadence: "/month",
    tagline: "Reserved Arizona capacity for teams that need dependable boots on the ground.",
    features: [
      "Reserved Arizona field capacity",
      "Up to 20 onsite service hours",
      "24–48 hour response SLA",
      "Priority scheduling",
      "Unlimited scheduling requests",
      "Basic remote troubleshooting",
      "Site assessments",
      "Equipment verification",
      "Photo documentation",
      "Monthly service report",
    ],
    overage: "Overage $100/hr · $130 minimum dispatch · $200 minimum data center / smart-hands dispatch",
    highlighted: false,
  },
  {
    name: "Business Coverage",
    price: "$3,500",
    cadence: "/month",
    tagline: "Priority coverage with asset management for multi-vendor and multi-site operations.",
    features: [
      "Up to 35 onsite service hours",
      "Priority response",
      "Same-day dispatch when available",
      "Quarterly site assessment",
      "Asset inventory management",
      "Vendor escort",
      "Smart hands & network support",
      "Printer and POS support",
      "Photo documentation",
      "Executive reporting",
    ],
    overage: "Overage $95/hr · standard dispatch minimums apply",
    highlighted: true,
  },
  {
    name: "Enterprise Arizona Partner",
    price: "$6,000",
    cadence: "/month",
    tagline: "Dedicated statewide coverage for enterprises, MSPs, and national service providers.",
    features: [
      "Up to 60 onsite service hours",
      "Guaranteed priority response",
      "Same-day response when available",
      "Dedicated technician",
      "Data center support & rack and stack",
      "Healthcare and restaurant technology support",
      "Multi-site coordination",
      "Project management support",
      "Vendor management",
      "Executive reporting",
    ],
    overage: "Additional hours $90/hr",
    highlighted: false,
  },
];

const standaloneRates = [
  ["Minimum dispatch", "$130"],
  ["General onsite service", "$100/hr"],
  ["Network engineering", "$125/hr"],
  ["Wireless engineering", "$125/hr"],
  ["Data center / smart hands", "$200 minimum"],
  ["Rack & stack", "$200 minimum"],
  ["Site survey", "$250–$500"],
  ["Infrastructure assessment", "$500–$1,500"],
  ["New store / site survey", "$350+"],
  ["Emergency after-hours", "1.5× standard rate"],
];

const addOns = [
  "Quarterly infrastructure health reports",
  "Asset inventory verification",
  "Warranty tracking",
  "Lifecycle planning",
  "Executive summary reports",
  "Vendor escort",
  "Remote project management",
  "Preventive maintenance visits",
  "Annual DR/BCP walkthroughs",
  "Compliance documentation",
];

const coreServices = [
  "Smart Hands",
  "Remote Hands",
  "Data Center Support",
  "Rack & Stack",
  "Network Engineering",
  "Wireless",
  "POS & Retail Technology",
  "Restaurant Technology",
  "Printer & Peripheral Support",
  "Access Control",
  "CCTV",
  "AV & Low Voltage",
  "Healthcare Technology",
  "Site Surveys",
  "Infrastructure Assessments",
  "Asset Inventory",
  "Warranty Verification",
  "Executive Reporting",
  "Project Management",
  "Emergency Dispatch",
];

export default function ArizonaFieldCoveragePage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Already Here LLC — Arizona Field Operations Partner
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Your dedicated Arizona field operations partner — without hiring a
            full-time technician.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            A monthly retainer reserves Arizona field capacity, guarantees response
            times, and includes a defined block of onsite service hours. Projects,
            rollouts, and deployments are scoped and billed separately — so the
            retainer stays predictable for both sides.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Reserve Coverage
            </Link>
            <Link
              href="/capability-statement"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              View Capability Statement
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Retainer tiers
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Reserved operational capacity, not prepaid labor
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`flex flex-col rounded-3xl border p-6 lg:p-8 ${
                  tier.highlighted
                    ? "border-blue-600 bg-slate-950 text-white shadow-xl"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    tier.highlighted ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {tier.tagline}
                </p>
                <p className="mt-5 text-4xl font-bold">
                  {tier.price}
                  <span className="text-base font-medium">{tier.cadence}</span>
                </p>
                <ul
                  className={`mt-6 flex-1 space-y-2 text-sm leading-6 ${
                    tier.highlighted ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span
                        className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                          tier.highlighted ? "bg-blue-400" : "bg-blue-600"
                        }`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <p
                  className={`mt-6 text-xs leading-5 ${
                    tier.highlighted ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {tier.overage}
                </p>
                <Link
                  href="/dispatch"
                  className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    tier.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "border border-slate-300 bg-white text-slate-900 hover:border-slate-400"
                  }`}
                >
                  Reserve {tier.name.split(" ")[0]}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-7 text-slate-600">
            Every retainer reserves capacity first: guaranteed response windows and
            scheduling priority. Included hours cover break/fix, smart hands, and
            assessments. Projects — rollouts, rack builds, cabling, installations —
            are quoted separately as professional services.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Standalone rates
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                On-demand rate card
              </h2>
              <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {standaloneRates.map(([service, rate], i) => (
                      <tr
                        key={service}
                        className={i % 2 ? "bg-slate-50" : "bg-white"}
                      >
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {service}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">
                          {rate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Retainer add-ons
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                High-value additions
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-700">
                Documentation and planning services that raise operational maturity
                without materially increasing onsite hours.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {addOns.map((a) => (
                  <li
                    key={a}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                  >
                    {a}
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
            Core services
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            One partner across the full field stack
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {coreServices.map((s) => (
              <div
                key={s}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800"
              >
                {s}
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/services-catalog"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Browse the Full Service Catalog
            </Link>
            <Link
              href="/industries"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
            >
              Industries We Serve
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Reserve your Arizona coverage
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Send your service area, site count, and coverage needs through dispatch
            intake. We respond with tier fit, availability, and a written retainer
            agreement — usually within one business day.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Reserve Coverage
            </Link>
            <a
              href="mailto:dispatch@alreadyherellc.com"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-8 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              dispatch@alreadyherellc.com
            </a>
          </div>
          <p className="mt-6 text-sm leading-7 text-slate-400">
            Still comparing options? Read the free{" "}
            <a
              href="https://quantam101.github.io/content/ebooks/arizona-field-coverage-guide/"
              className="font-semibold text-white underline decoration-slate-500 underline-offset-4"
            >
              Arizona Field Coverage Buyer&apos;s Guide
            </a>{" "}
            — coverage models compared, 2026 price benchmarks, and the SLA terms
            to demand from any provider.
          </p>
        </div>
      </section>
    </main>
  );
}
