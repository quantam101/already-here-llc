import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Field Services Catalog",
  description:
    "40 productized Arizona field services with fixed scope, deliverables, pricing, and time estimates — assessments, smart hands, deployments, data center, healthcare, and managed add-ons.",
  path: "/services-catalog",
});

type Service = {
  name: string;
  scope: string;
  deliverable: string;
  price: string;
  time: string;
};

const catalog: { category: string; services: Service[] }[] = [
  {
    category: "Assessments & Audits",
    services: [
      { name: "Network Health Assessment", scope: "Single-site wired network review: switching, cabling, rack condition, ISP handoff, labeling.", deliverable: "Findings report with photos + prioritized fix list", price: "$500–$900", time: "3–5 hrs onsite" },
      { name: "Wi-Fi Assessment", scope: "Coverage walk, AP placement review, interference check, guest/corp segmentation review.", deliverable: "Coverage findings + remediation recommendations", price: "$500–$1,200", time: "3–6 hrs onsite" },
      { name: "Printer Fleet Assessment", scope: "Inventory of print devices, supply status, firmware, connectivity, and utilization.", deliverable: "Fleet inventory sheet + consolidation recommendations", price: "$350–$700", time: "2–4 hrs onsite" },
      { name: "Restaurant Technology Assessment", scope: "POS, KDS, network, peripherals, and back-office systems review for one location.", deliverable: "Site technology report + risk flags", price: "$400–$800", time: "2–4 hrs onsite" },
      { name: "Retail Store Technology Assessment", scope: "POS lanes, handhelds, network closet, connectivity, and peripheral health for one store.", deliverable: "Store readiness report + photos", price: "$400–$800", time: "2–4 hrs onsite" },
      { name: "New Site Readiness Assessment", scope: "Pre-buildout walkthrough: power, pathways, demarc, closet condition, mounting surfaces.", deliverable: "Site readiness checklist + photo package", price: "$350–$600", time: "2–3 hrs onsite" },
      { name: "Data Center Walkthrough", scope: "Cage/row inspection: airflow, cable hygiene, labeling, capacity, physical security observations.", deliverable: "Walkthrough report with photo evidence", price: "$500 minimum", time: "2–4 hrs onsite" },
      { name: "Rack Audit", scope: "Per-rack elevation verification, port mapping spot checks, power draw review, labeling.", deliverable: "Rack elevation docs + discrepancy list", price: "$200/rack", time: "~1 hr per rack" },
      { name: "UPS Audit", scope: "UPS inventory, battery age/status, load check, alerting configuration review.", deliverable: "UPS status report + replacement schedule", price: "$300–$600", time: "2–3 hrs onsite" },
      { name: "Camera / CCTV Assessment", scope: "Camera count, coverage angles, recording health, NVR storage, and cabling condition.", deliverable: "Coverage map + health report", price: "$400–$900", time: "2–5 hrs onsite" },
      { name: "Access Control Audit", scope: "Door hardware, controllers, credential hygiene, fail-safe/fail-secure verification.", deliverable: "Door-by-door audit sheet + risk notes", price: "$400–$900", time: "2–5 hrs onsite" },
      { name: "Biomedical Equipment Inventory", scope: "Clinical device inventory with model, serial, location, and connectivity capture.", deliverable: "Asset register (CSV/report) + photo tags", price: "$600–$1,500", time: "4–8 hrs onsite" },
      { name: "Infrastructure Assessment (Full)", scope: "Comprehensive multi-system site review: network, power, racks, endpoints, physical security.", deliverable: "Executive report + prioritized roadmap", price: "$500–$1,500", time: "1 day onsite" },
      { name: "Asset Inventory", scope: "IT asset capture across one site: make, model, serial, location, condition.", deliverable: "Asset register ready for CMDB import", price: "$400–$1,000", time: "3–8 hrs onsite" },
      { name: "Warranty Verification", scope: "Serial capture and warranty/entitlement lookup across the device fleet.", deliverable: "Coverage matrix + renewal recommendations", price: "$300–$600", time: "Remote + 2–3 hrs onsite" },
    ],
  },
  {
    category: "Smart Hands & Onsite Support",
    services: [
      { name: "Smart Hands Half-Day", scope: "4 hours of directed onsite work under your remote team's guidance.", deliverable: "Work log + photo documentation", price: "$400", time: "4 hrs" },
      { name: "Smart Hands Full-Day", scope: "8 hours of directed onsite work under your remote team's guidance.", deliverable: "Work log + photo documentation", price: "$760", time: "8 hrs" },
      { name: "Remote Hands Block (Data Center)", scope: "Reboots, cable moves, media swaps, console access inside a data center environment.", deliverable: "Ticket-by-ticket completion notes", price: "$200 minimum", time: "Per visit" },
      { name: "Standard Dispatch Visit", scope: "Single-issue onsite response: diagnose, fix or stabilize, document.", deliverable: "Resolution notes + photos", price: "$130 minimum, then $100/hr", time: "1–2 hrs typical" },
      { name: "Emergency Response Visit", scope: "After-hours or same-day urgent dispatch for outage-level events.", deliverable: "Incident report + stabilization summary", price: "1.5× standard rates", time: "ASAP scheduling" },
      { name: "Vendor Escort", scope: "Badged escort and oversight for third-party vendors on your site.", deliverable: "Visit log + observation notes", price: "$90/hr", time: "As scheduled" },
      { name: "Equipment Verification Visit", scope: "Receive, inspect, serial-capture, and stage delivered equipment.", deliverable: "Receiving report + serial manifest", price: "$130 minimum", time: "1–2 hrs" },
      { name: "Preventive Maintenance Visit", scope: "Scheduled cleaning, patch-cable hygiene, filter/fan checks, visual inspection.", deliverable: "PM checklist + exception flags", price: "$150/visit", time: "1–2 hrs" },
    ],
  },
  {
    category: "Installation & Deployment",
    services: [
      { name: "Server Installation", scope: "Rack, cable, label, and power-on one server per your build sheet.", deliverable: "As-built photos + port map", price: "$200 minimum + $125/hr", time: "1–3 hrs" },
      { name: "Access Point Installation", scope: "Mount, cable-terminate verification, and adoption support per AP.", deliverable: "Placement photos + AP inventory", price: "$85/AP (5+ APs) or $130 minimum", time: "30–60 min per AP" },
      { name: "POS Deployment", scope: "Install and verify one POS lane: terminal, printer, cash drawer, payment device.", deliverable: "Lane test checklist + photos", price: "$150/lane", time: "1–2 hrs per lane" },
      { name: "Device Rollout (Desktop/Kiosk)", scope: "Swap or deploy end-user devices per runbook, per unit.", deliverable: "Per-unit completion checklist", price: "$60/unit (10+) or $100/hr", time: "30–45 min per unit" },
      { name: "Rack & Stack (Per Rack)", scope: "Physical install of rack equipment per elevation: mount, cable, label, power.", deliverable: "As-built elevation + photos", price: "$200 minimum + $125/hr", time: "2–6 hrs per rack" },
      { name: "Network Cutover Support", scope: "Onsite hands during a switch/firewall/circuit cutover window.", deliverable: "Cutover log + rollback notes", price: "$125/hr (1.5× after hours)", time: "Per window" },
      { name: "Printer Installation", scope: "Deploy and network one print device, driver verification with your team.", deliverable: "Install confirmation + test page", price: "$130 minimum", time: "~1 hr" },
      { name: "Digital Signage Installation", scope: "Mount display/player, cable, and verify content loading.", deliverable: "Install photos + sign-off sheet", price: "$150–$350/unit", time: "1–3 hrs per unit" },
      { name: "Structured Cabling (Small Runs)", scope: "Patch and short-run cabling, terminations, and testing up to 10 drops.", deliverable: "Test results + labeling map", price: "Quoted per scope", time: "Per scope" },
    ],
  },
  {
    category: "Specialized & Project Services",
    services: [
      { name: "Site Survey (Standard)", scope: "Documented walkthrough for a planned project: measurements, photos, pathways.", deliverable: "Survey packet in your template or ours", price: "$250–$500", time: "2–4 hrs onsite" },
      { name: "New Store Survey", scope: "Retail/restaurant pre-opening survey: closet, counts, mounting, power, connectivity.", deliverable: "Opening-readiness survey packet", price: "$350+", time: "2–4 hrs onsite" },
      { name: "Healthcare Equipment Installation", scope: "Clinical-environment device install with infection-control awareness.", deliverable: "Install record + serial capture", price: "$150/hr", time: "Per scope" },
      { name: "Network Engineering Visit", scope: "Onsite switch/firewall/AP configuration work with your change ticket.", deliverable: "Change log + configuration notes", price: "$125/hr", time: "Per scope" },
      { name: "Wireless Survey (Active)", scope: "Active signal survey with heat-mapping of coverage per floor.", deliverable: "Heat map + AP placement plan", price: "$500–$1,200", time: "4–8 hrs onsite" },
      { name: "Office Move Support", scope: "Disconnect/reconnect of workstations, network gear, and peripherals.", deliverable: "Move checklist + per-seat verification", price: "Quoted per seat count", time: "Per scope" },
      { name: "Lifecycle Planning Report", scope: "Fleet age analysis and refresh scheduling from inventory data.", deliverable: "Refresh roadmap + budget estimate", price: "$400–$800", time: "Remote" },
      { name: "Executive Technology Report", scope: "Quarterly plain-language technology posture summary for leadership.", deliverable: "Executive PDF report", price: "$350/quarter", time: "Remote" },
      { name: "Annual DR/BCP Walkthrough", scope: "Physical verification of backup power, failover gear, and recovery documentation.", deliverable: "Walkthrough findings + gap list", price: "$500–$900", time: "Half day onsite" },
      { name: "Compliance Documentation Support", scope: "Photo/document evidence collection for audits (PCI, HIPAA physical controls).", deliverable: "Evidence package per your checklist", price: "$125/hr", time: "Per scope" },
    ],
  },
];

const totalServices = catalog.reduce((n, c) => n + c.services.length, 0);

export default function ServicesCatalogPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Service catalog
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
            {totalServices} productized field services. Fixed scope. Known price.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Every service below has a defined scope, a concrete deliverable, and a
            time estimate — so remote teams, MSPs, and national providers can order
            Arizona field work like a product, not a negotiation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Order a Service
            </Link>
            <Link
              href="/arizona-field-coverage"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              See Retainer Pricing
            </Link>
          </div>
        </div>
      </section>

      {catalog.map((group, gi) => (
        <section
          key={group.category}
          className={`border-b border-slate-200 ${gi % 2 ? "bg-slate-50" : "bg-white"}`}
        >
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {group.category}
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {group.services.map((s) => (
                <div
                  key={s.name}
                  className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 lg:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-950">
                      {s.name}
                    </h3>
                    <span className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                      {s.price}
                    </span>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-700">
                    {s.scope}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    <span className="font-semibold text-slate-900">Deliverable:</span>{" "}
                    {s.deliverable}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {s.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Need something not on the list?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Send the scope through dispatch intake and we&apos;ll return a written
            quote with fixed pricing — or fold it into a monthly coverage retainer.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request a Quote
            </Link>
            <Link
              href="/arizona-field-coverage"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-8 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Reserve Monthly Coverage
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
