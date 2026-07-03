import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Partner With Already Here LLC',
  description: 'Partner with Already Here LLC for Phoenix metro onsite IT field execution, MSP overflow, retail technology support, data-center smart hands, and closeout-heavy technical dispatch.'
};

const partnerTypes = [
  {
    title: 'MSPs and IT providers',
    body: 'White-label Phoenix metro onsite coverage for tickets that require a local technical operator, structured notes, photos, and buyer-ready closeout.'
  },
  {
    title: 'National vendors and integrators',
    body: 'Project-based onsite execution for retail, infrastructure, POS, networking, AP, printer, camera/cabling, and smart-hands assignments.'
  },
  {
    title: 'Prime contractors',
    body: 'Field execution support for government, municipal, healthcare-adjacent, commercial, and multi-site scopes where onsite reliability matters.'
  },
  {
    title: 'Retail and restaurant technology teams',
    body: 'Support for POS, payment devices, printers, kiosks, store technology, rollout recovery, surveys, asset capture, and closeout documentation.'
  }
];

const partnerRules = [
  '$130 minimum standard Phoenix metro dispatch',
  '2-hour minimum unless specifically contracted otherwise',
  '$200 flat preferred for server, data-center, after-hours, or infrastructure smart-hands work',
  'No unpaid return trips for access failures, missing parts, or incomplete site readiness',
  'Clear scope, approved rate, site contact, and closeout requirements before dispatch'
];

export default function PartnerWithUsPage() {
  return (
    <section className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Partner and overflow coverage</span>
      <h1 className="section-title mt-5">Phoenix onsite execution partner for MSPs, vendors, integrators, and prime contractors.</h1>
      <p className="section-copy">
        Already Here LLC is built for teams that already have the ticket, client, remote engineer, or project scope, but need a disciplined onsite field operator to complete the work and return clean documentation.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {partnerTypes.map(({ title, body }) => (
          <div key={title} className="card p-6">
            <h2 className="text-xl font-semibold text-navy">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-borderBrand bg-navy p-8 text-white">
          <h2 className="text-2xl font-semibold">High-fit partner work</h2>
          <p className="mt-4 text-sm leading-7 text-white/80">
            Network troubleshooting, smart hands, POS, AP/wireless, printer support, camera/cabling checks, AV/display issues, rack/stack, surveys, rollout recovery, IT asset recovery, and site closeout.
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-navy">Dispatch terms that prevent rework</h2>
          <div className="mt-6 grid gap-3">
            {partnerRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-borderBrand bg-soft p-4 text-sm leading-6 text-slate-700">{rule}</div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">Send a Dispatch</Link>
        <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">Request Project Quote</Link>
      </div>
    </section>
  );
}
