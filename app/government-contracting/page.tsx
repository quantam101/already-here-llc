import type { Metadata } from 'next';
import Link from 'next/link';
import { naicsCodes, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Government Contracting Readiness',
  description: 'Already Here LLC government, municipal, and prime-contractor readiness profile for onsite IT field execution, smart hands, infrastructure support, retail technology, and closeout-heavy technical dispatch.'
};

const readiness = [
  'SAM.gov registered buyer-facing profile referenced on public trust bar',
  'Veteran-owned and small-business positioning for appropriate procurement paths',
  'Phoenix-based onsite field execution with Arizona metro coverage and project-based national coverage by scope',
  'W-9, capability statement, insurance, references, and closeout samples available for qualified buyers',
  'Structured documentation workflow for photos, signoff, asset records, and escalation notes'
];

const procurementFits = [
  'Municipal IT support overflow',
  'Prime-contractor field execution support',
  'Network troubleshooting and site verification',
  'Printer, endpoint, POS, kiosk, and peripheral support',
  'Data-center smart hands and controlled-site technical assistance',
  'IT asset recovery, inventory, packing, labeling, and return logistics'
];

export default function GovernmentContractingPage() {
  return (
    <section className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Procurement and prime-contractor support</span>
      <h1 className="section-title mt-5">Government-ready onsite IT field execution from Phoenix.</h1>
      <p className="section-copy">
        Already Here LLC supports public-sector buyers, prime contractors, MSPs, and infrastructure teams that need a reliable onsite technical operator for defined scope, rapid closeout, and accountable field documentation.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-navy">Procurement readiness</h2>
          <div className="mt-6 grid gap-3">
            {readiness.map((item) => (
              <div key={item} className="rounded-2xl border border-borderBrand bg-soft p-4 text-sm leading-6 text-slate-700">{item}</div>
            ))}
          </div>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-navy">NAICS alignment</h2>
          <div className="mt-6 grid gap-3">
            {naicsCodes.map(({ code, desc }) => (
              <div key={code} className="rounded-2xl border border-borderBrand bg-soft p-4">
                <p className="text-sm font-semibold text-navy">{code}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {procurementFits.map((fit) => (
          <div key={fit} className="card p-6 text-sm leading-7 text-slate-700">{fit}</div>
        ))}
      </div>

      <section className="mt-12 rounded-3xl border border-borderBrand bg-navy p-8 text-white">
        <h2 className="text-2xl font-semibold">Request procurement documents</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80">
          Qualified buyers may request the capability statement, W-9, insurance documentation, service scope notes, closeout samples, and project references when available and permitted.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/capability-statement" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white hover:text-navy">Capability Statement</Link>
          <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full border border-white/35 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">Submit RFQ</Link>
        </div>
        <p className="mt-6 text-sm font-semibold text-white/90">Procurement email: {siteConfig.email}</p>
      </section>
    </section>
  );
}
