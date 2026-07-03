import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Same-Day Phoenix IT Dispatch',
  description: 'Same-day and next-day Phoenix metro onsite IT field support for smart hands, POS, network, AV, camera/cabling, printer, access-control, and closeout-heavy dispatch work.'
};

const urgentServices = [
  'Smart hands and remote-hands support',
  'POS, payment device, printer, and kiosk support',
  'Network, AP, SD-WAN, router, and switch troubleshooting',
  'Camera, AV, display, cabling, and signal-path checks',
  'Access-control, low-voltage-adjacent, and site-verification support',
  'Rack/stack, part swaps, asset photos, and closeout documentation'
];

const dispatchFit = [
  'Phoenix, Tempe, Mesa, Chandler, Scottsdale, Glendale, Goodyear, Buckeye, Gilbert, and nearby metro sites',
  'Best for MSPs, vendors, project managers, retail operators, data-center teams, and multi-site technology programs',
  'Clear scope, approved rate, site contact, access notes, closeout requirements, and parts readiness required before dispatch',
  'Return trips caused by missing parts, access failures, incomplete site readiness, or remote-team delays are separate billable dispatches'
];

export default function EmergencyDispatchPage() {
  return (
    <section className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Phoenix same-day / next-day dispatch</span>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div>
          <h1 className="section-title">Need a Phoenix technician today?</h1>
          <p className="section-copy">
            Already Here LLC provides onsite technical field execution when remote teams need reliable ground truth, hands-on remediation, and closeout documentation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
              Start Dispatch Intake
            </Link>
            <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
              Request Project Quote
            </Link>
          </div>
          <div className="mt-8 rounded-3xl border border-borderBrand bg-soft p-6">
            <p className="grid-label">Preferred dispatch structure</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {['$130 minimum', '2-hour minimum', '$200 smart-hands preferred'].map((item) => (
                <div key={item} className="rounded-2xl border border-borderBrand bg-white p-4 text-sm font-semibold text-navy">{item}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-navy">High-fit same-day work</h2>
          <div className="mt-6 grid gap-3">
            {urgentServices.map((service) => (
              <div key={service} className="rounded-2xl border border-borderBrand bg-soft p-4 text-sm leading-6 text-slate-700">{service}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {dispatchFit.map((item) => (
          <div key={item} className="card p-6 text-sm leading-7 text-slate-700">{item}</div>
        ))}
      </div>

      <section className="mt-12 rounded-3xl border border-borderBrand bg-navy p-8 text-white">
        <h2 className="text-2xl font-semibold">What to include before dispatch</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80">
          Send the site address, scope, access window, onsite contact, required tools, parts status, photos required, signoff process, approved rate, and escalation contact. Attachments and SOWs should go through the dispatch or RFQ intake path.
        </p>
        <p className="mt-6 text-sm font-semibold text-white/90">Dispatch email: {siteConfig.email}</p>
      </section>
    </section>
  );
}
