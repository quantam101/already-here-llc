import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPageMetadata } from "@/lib/metadata";

type Industry = {
  slug: string;
  name: string;
  headline: string;
  intro: string;
  pains: string[];
  services: { name: string; price: string }[];
  retainerFit: string;
};

const industries: Industry[] = [
  {
    slug: "healthcare",
    name: "Healthcare",
    headline: "Field technology support for Arizona clinics, hospitals, and healthcare OEMs",
    intro:
      "Clinical environments need technicians who respect infection control, patient privacy, and documentation requirements. We support healthcare IT teams and equipment OEMs across Arizona with experienced, professional onsite hands.",
    pains: [
      "OEM installs waiting weeks for a qualified local technician",
      "Biomedical device inventories that exist only on paper",
      "Clinic networks and printers with no local support between vendor visits",
      "Compliance audits that need photo evidence of physical controls",
    ],
    services: [
      { name: "Healthcare equipment installation", price: "$150/hr" },
      { name: "Biomedical equipment inventory", price: "$600–$1,500" },
      { name: "Network health assessment", price: "$500–$900" },
      { name: "Compliance documentation support", price: "$125/hr" },
    ],
    retainerFit:
      "Enterprise tier includes dedicated healthcare technology support; Business tier covers clinic groups with quarterly assessments and asset management.",
  },
  {
    slug: "restaurants",
    name: "Restaurant Technology",
    headline: "POS, KDS, and back-office support for Arizona restaurant groups",
    intro:
      "When a POS lane or kitchen display dies on a Friday night, a ticket queue in another state doesn't help. We support restaurant technology providers and multi-location operators with fast, documented onsite response across Arizona.",
    pains: [
      "POS and payment device failures during service hours",
      "New store openings with no local install partner",
      "Menu board, KDS, and printer issues piling up between vendor visits",
      "Franchise rollouts that need the same work done right at every site",
    ],
    services: [
      { name: "POS deployment", price: "$150/lane" },
      { name: "Restaurant technology assessment", price: "$400–$800" },
      { name: "New store survey", price: "$350+" },
      { name: "Standard dispatch visit", price: "$130 minimum" },
    ],
    retainerFit:
      "Essential tier covers a small group's break/fix; Business tier adds same-day-when-available response and quarterly site assessments across locations.",
  },
  {
    slug: "retail",
    name: "Retail",
    headline: "Store technology support and rollout execution across Arizona",
    intro:
      "Retail IT lives and dies on consistency: every store, same standard, photo-proof of completion. We execute rollouts, refreshes, and break/fix for retail operators and the integrators who serve them.",
    pains: [
      "Rollouts stalled because a national partner has no Arizona bench",
      "Store closets that drift out of standard between visits",
      "Peripheral sprawl — scanners, printers, kiosks — with no single point of support",
      "Openings and remodels that need surveys before the GC finishes",
    ],
    services: [
      { name: "Retail store technology assessment", price: "$400–$800" },
      { name: "Device rollout", price: "$60/unit (10+)" },
      { name: "Digital signage installation", price: "$150–$350/unit" },
      { name: "New site readiness assessment", price: "$350–$600" },
    ],
    retainerFit:
      "Business tier fits multi-store operators: asset inventory, quarterly assessments, and priority response with per-unit rollout pricing on top.",
  },
  {
    slug: "data-centers",
    name: "Data Centers",
    headline: "Smart hands and remote hands in Phoenix — a top-five US data center market",
    intro:
      "Your engineers are remote; your racks are in Phoenix. We provide badged, documented smart hands across the metro's data centers — swaps, rack and stack, cabling, escorts, and audits — under your direction.",
    pains: [
      "Paying travel day-rates for 30-minute cable swaps",
      "Colo remote-hands queues during your maintenance window",
      "Racks with no current elevation docs or port maps",
      "Vendor deliveries nobody local can receive and verify",
    ],
    services: [
      { name: "Remote hands block", price: "$200 minimum" },
      { name: "Rack & stack", price: "$200 min + $125/hr" },
      { name: "Rack audit", price: "$200/rack" },
      { name: "Data center walkthrough", price: "$500 minimum" },
    ],
    retainerFit:
      "Enterprise tier includes data center support with a dedicated technician; Essential works for teams needing occasional guaranteed-response smart hands.",
  },
  {
    slug: "msps",
    name: "MSPs",
    headline: "White-label Arizona field coverage for managed service providers",
    intro:
      "Keep your brand, your ticketing, and your client relationship — we're the local hands. Out-of-state MSPs use our retainers to guarantee onsite SLAs in Arizona without recruiting, trucks, or bench risk.",
    pains: [
      "Arizona clients on contracts that promise onsite response you can't staff",
      "Marketplace technicians who've never seen the site before",
      "No photo trail proving what was done at the client site",
      "One-off dispatch costs that make Arizona accounts unprofitable",
    ],
    services: [
      { name: "Smart hands half-day", price: "$400" },
      { name: "Network engineering visit", price: "$125/hr" },
      { name: "AP installation", price: "$85/AP (5+)" },
      { name: "Site survey", price: "$250–$500" },
    ],
    retainerFit:
      "Business tier is the MSP workhorse: 35 hours, priority response, white-label delivery, and $95/hr overage you can mark up in your own agreements.",
  },
  {
    slug: "av-low-voltage",
    name: "AV & Low Voltage",
    headline: "Overflow labor and installs for AV and security integrators",
    intro:
      "Integrators win Arizona projects faster than they can staff them. We provide install labor, service calls, and audits for AV, CCTV, and access control scopes — documented to your closeout standard.",
    pains: [
      "Project backlogs waiting on install crews",
      "Service calls that pull senior installers off new builds",
      "Camera and access systems sold statewide with no service coverage",
      "Closeout documentation that eats project margin",
    ],
    services: [
      { name: "Camera / CCTV assessment", price: "$400–$900" },
      { name: "Access control audit", price: "$400–$900" },
      { name: "Digital signage installation", price: "$150–$350/unit" },
      { name: "Structured cabling (small runs)", price: "Quoted per scope" },
    ],
    retainerFit:
      "Essential tier gives integrators a standing service arm for installed-base calls; project labor quotes separately at catalog rates.",
  },
  {
    slug: "national-dispatch",
    name: "National Dispatch Partners",
    headline: "A reliable Arizona bench for national field service companies",
    intro:
      "Dispatch companies and national providers need in-market technicians they don't have to re-vet per ticket. We take Arizona work orders with your SLAs, your deliverable format, and photo-documented closeout — every time.",
    pains: [
      "Re-vetting a new technician for every Phoenix ticket",
      "No-shows that burn your SLA with the end client",
      "Inconsistent deliverables across one-off contractors",
      "After-hours and hard-to-cover geographies inside Arizona",
    ],
    services: [
      { name: "Standard dispatch visit", price: "$130 minimum" },
      { name: "Smart hands full-day", price: "$760" },
      { name: "Emergency response", price: "1.5× standard" },
      { name: "Equipment verification visit", price: "$130 minimum" },
    ],
    retainerFit:
      "Essential tier reserves a guaranteed-response Arizona bench at a flat monthly number — typically cheaper than 5 one-off market-rate tickets.",
  },
];

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ind = industries.find((i) => i.slug === slug);
  if (!ind) return {};
  return createPageMetadata({
    title: `${ind.name} Field Services in Arizona`,
    description: ind.intro.slice(0, 155),
    path: `/industries/${ind.slug}`,
  });
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ind = industries.find((i) => i.slug === slug);
  if (!ind) notFound();

  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            {ind.name} — Arizona field coverage
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
            {ind.headline}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            {ind.intro}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Reserve Coverage
            </Link>
            <Link
              href="/services-catalog"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Full Service Catalog
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                The problems we take off your plate
              </h2>
              <ul className="mt-6 space-y-3 text-base leading-7 text-slate-700">
                {ind.pains.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Most-ordered services
              </h2>
              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {ind.services.map((s, i) => (
                      <tr key={s.name} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                        <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                        <td className="px-5 py-3 text-right text-slate-700">{s.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Fixed scopes and deliverables for every service are in the{" "}
                <Link href="/services-catalog" className="font-semibold text-slate-900 underline underline-offset-4">
                  full catalog
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Retainer fit for {ind.name.toLowerCase()}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
              {ind.retainerFit}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/arizona-field-coverage"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Compare Retainer Tiers
              </Link>
              <Link
                href="/dispatch"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
              >
                Start a Request
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
