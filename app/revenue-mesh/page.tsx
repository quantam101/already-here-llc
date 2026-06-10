import type { Metadata } from 'next';
import Link from 'next/link';
import { productizedRevenueOffers, revenueMeshOperatingRules } from '@/lib/revenue-mesh';

export const metadata: Metadata = {
  title: 'Revenue Mesh v1 | Daily Work, Dispatch Partners, and AI Automation Offers',
  description:
    'Already Here Revenue Mesh v1 turns local work scanning, dispatch partner acquisition, AI automation offers, and approval-gated execution into one revenue operating system.',
  alternates: { canonical: 'https://www.alreadyherellc.com/revenue-mesh' },
  openGraph: {
    title: 'Revenue Mesh v1 | Already Here LLC',
    description:
      'A revenue operating system for field dispatch, local cash work, direct partner outreach, productized AI automation, and approval-gated execution.',
    url: 'https://www.alreadyherellc.com/revenue-mesh',
    siteName: 'Already Here LLC',
    type: 'website'
  }
};

const lanes = [
  {
    title: 'Premium dispatch',
    body: 'Prioritize IT, smart-hands, POS, printer, wireless/AP, access control, low-voltage, AV, data center, and healthcare device work at a $65/hr effective floor, $130 minimum dispatch value, and $200 preferred flat rate for server/data-center work.'
  },
  {
    title: 'Local cash backup',
    body: 'Stack hauling, delivery, inspection, and clean local service tasks only when the scope is clear, travel is controlled, fees are separated, and the work protects the daily cash floor.'
  },
  {
    title: 'Dispatch partners',
    body: 'Build direct relationships with MSPs, POS vendors, printer firms, low-voltage contractors, access control/CCTV integrators, AV firms, and national dispatch companies needing Phoenix-area coverage.'
  },
  {
    title: 'AI automation offers',
    body: 'Sell concrete systems: missed-call capture, quote intake, field-tech closeout, review response, dispatch intake, and local-service booking workflows with setup fees and monthly management.'
  }
];

const safeguards = [
  'No work is accepted without approval.',
  'No outreach is sent without approval.',
  'No money is moved without approval.',
  'No credentials are changed without approval.',
  'No client-facing production claim is published without approval.',
  'No low-margin job is treated as premium work.'
];

export default function RevenueMeshPage() {
  return (
    <div className="proof-light bg-white">
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-12 py-16 lg:grid-cols-[1fr_0.85fr] lg:py-24">
          <div>
            <span className="eyebrow proof-label">Revenue Mesh v1</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
              Turn every work-scan cycle into cash work, partner pipeline, or a sellable automation offer.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Revenue Mesh v1 is the operating layer for Already Here LLC daily income generation. It grades work,
              identifies backup cash options, creates direct dispatch partner targets, and packages AI automation offers
              that can be sold to local service businesses and field-service vendors.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/ai-agent" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
                Sell AI Web Agent
              </Link>
              <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                Request Dispatch
              </Link>
            </div>
          </div>

          <div className="card p-8" data-proof-surface>
            <p className="grid-label proof-label">Operating economics</p>
            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-borderBrand bg-white p-4" data-proof-border>
                <p className="text-sm font-semibold text-navy">Daily cash floor</p>
                <p className="mt-1 text-3xl font-semibold text-navy">${revenueMeshOperatingRules.cashFloorTarget}</p>
              </div>
              <div className="rounded-2xl border border-borderBrand bg-white p-4" data-proof-border>
                <p className="text-sm font-semibold text-navy">Premium field rate floor</p>
                <p className="mt-1 text-3xl font-semibold text-navy">${revenueMeshOperatingRules.premiumTargetHourly}/hr</p>
              </div>
              <div className="rounded-2xl border border-borderBrand bg-white p-4" data-proof-border>
                <p className="text-sm font-semibold text-navy">Minimum dispatch value</p>
                <p className="mt-1 text-3xl font-semibold text-navy">${revenueMeshOperatingRules.minimumDispatchValue}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <span className="eyebrow proof-label">Daily income lanes</span>
        <h2 className="section-title mt-5">Every scan must produce a revenue path or a task replacement recommendation.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {lanes.map((lane) => (
            <article key={lane.title} className="card p-6" data-proof-surface>
              <h3 className="text-xl font-semibold text-navy">{lane.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{lane.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell py-16">
          <span className="eyebrow proof-label">Productized offers</span>
          <h2 className="section-title mt-5">Sell simple systems that solve visible revenue leaks.</h2>
          <p className="section-copy proof-muted">
            The system does not sell abstract AI. It sells lead capture, faster response, cleaner closeout, better routing,
            and recurring optimization.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {productizedRevenueOffers.map((offer) => (
              <article key={offer.id} className="card p-6" data-proof-surface>
                <p className="grid-label proof-label">{offer.name}</p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <h3 className="text-3xl font-semibold text-navy">${offer.setupFee.toLocaleString()} setup</h3>
                  <p className="pb-1 text-sm font-semibold text-slate-600">${offer.monthlyFee.toLocaleString()}/mo</p>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{offer.buyer}</p>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-borderBrand bg-white p-4" data-proof-border>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pain signal</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{offer.painSignal}</p>
                  </div>
                  <div className="rounded-2xl border border-borderBrand bg-white p-4" data-proof-border>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Proof metric</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{offer.proofMetric}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-16">
        <span className="eyebrow proof-label">Execution guardrails</span>
        <h2 className="section-title mt-5">Automation prepares the decision. Stephen approves the commitment.</h2>
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {safeguards.map((safeguard) => (
            <div key={safeguard} className="rounded-2xl border border-borderBrand bg-white px-4 py-4 text-sm font-semibold text-slate-700" data-proof-border>
              {safeguard}
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/ai-agent#free-trial" className="link-ring inline-flex justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white">
            Start AI Agent Demo Intake
          </Link>
          <Link href="/rfq" className="link-ring inline-flex justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-700">
            Submit Project RFQ
          </Link>
        </div>
      </section>
    </div>
  );
}
