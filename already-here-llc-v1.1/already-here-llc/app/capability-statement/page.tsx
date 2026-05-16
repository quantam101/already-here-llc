import type { Metadata } from 'next';
import Link from 'next/link';
import { naicsCodes, representativeWork, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Capability Statement | Field Execution Partner',
  description:
    'Already Here LLC capability statement â SAM.gov registered field execution partner for MSPs, government primes, healthcare-adjacent operators, and rollout programs. SAM.gov registered.',
  alternates: { canonical: '/capability-statement' }
};

const coreCompetencies = [
  'MSP smart-hands and remote team onsite follow-through',
  'Infrastructure field work â rack/stack, patching, cabling, port verification',
  'POS, kiosk, and payment device installation and support',
  'Healthcare-adjacent and controlled environment field execution',
  'RFID reader surveys and multi-AP documentation runs',
  'Rollout, modernization, and multi-site program execution',
  'Documentation-driven closeout and photo verification per ticket',
  'Site surveys, store-level audits, and ground-truth verification',
  'Managed router installs â Cradlepoint, SD-WAN, Starlink',
  'Government-adjacent field engagements and federal program support'
];

const differentiators = [
  'SDVOSB-eligible for qualified subcontracting and procurement opportunities',
  'SAM.gov registered',
  'Commercially insured â General Liability and Professional Liability',
  'IT field experience across healthcare, enterprise, government-adjacent, retail, QSR, and data center environments',
  'Phoenix metro primary coverage with qualified Arizona statewide travel for project-based engagements',
  'Documented execution history across retail, infrastructure, healthcare-adjacent, and smart-hands work',
  'Structured closeout with photo documentation delivered per ticket',
  'Field Nation and WorkMarket dispatch history â qualified buyer verification available on request'
];

export default function CapabilityStatementPage() {
  const year = new Date().getFullYear();

  return (
    <div className="container-shell py-16 lg:py-24">
      <div className="card p-8 sm:p-10 mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="eyebrow">Capability Statement Â· {year}</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-navy sm:text-5xl">Already Here LLC</h1>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
              Phoenix-based onsite infrastructure execution partner for MSPs, government primes, vendors, healthcare-adjacent operators, and rollout programs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end lg:gap-3 shrink-0">
            <span className="rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-slate-600">SDVOSB Eligible</span>
            <span className="rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-slate-600">SAM.gov Registered</span>
            <span className="rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-slate-600">Commercially Insured</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 border-t border-borderBrand pt-8 sm:grid-cols-3">
          <div><p className="grid-label mb-2">Entity</p><p className="text-sm font-semibold text-navy">{siteConfig.name}</p><p className="text-sm text-slate-600">Stephen Franklin, Owner</p></div>
          <div><p className="grid-label mb-2">Address</p><p className="text-sm text-slate-600">{siteConfig.address.street}<br />{siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.zip}</p></div>
          <div><p className="grid-label mb-2">Contact</p><a href={siteConfig.phoneHref} className="block text-sm text-slate-600 hover:text-action transition-colors">{siteConfig.phoneDisplay}</a><a href={`mailto:${siteConfig.email}`} className="block text-sm text-slate-600 hover:text-action transition-colors">{siteConfig.email}</a><a href={siteConfig.url} className="block text-sm text-slate-500 hover:text-action transition-colors">{siteConfig.url.replace('https://', '')}</a></div>
        </div>
      </div>

      <section className="card p-8 sm:p-10 mb-8">
        <h2 className="grid-label mb-6">Core competencies</h2>
        <ul className="grid gap-3 sm:grid-cols-2">{coreCompetencies.map((item) => <li key={item} className="flex items-start gap-3 text-sm text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-action" />{item}</li>)}</ul>
      </section>

      <section className="card p-8 sm:p-10 mb-8">
        <h2 className="grid-label mb-6">Differentiators</h2>
        <ul className="grid gap-3">{differentiators.map((item) => <li key={item} className="flex items-start gap-3 text-sm text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />{item}</li>)}</ul>
      </section>

      <section className="card p-8 sm:p-10 mb-8">
        <h2 className="grid-label mb-6">Past performance (representative)</h2>
        <div className="grid gap-4">{representativeWork.map((item) => <div key={item.scope} className="grid grid-cols-1 gap-2 rounded-2xl border border-borderBrand bg-soft p-5 sm:grid-cols-[160px_1fr]"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-action mb-1">{item.tag}</p><p className="text-sm font-medium text-navy">{item.client}</p></div><p className="text-sm leading-6 text-slate-600">{item.scope}</p></div>)}</div>
        <p className="mt-4 text-xs text-slate-400">WO numbers, Field Nation / WorkMarket records, and buyer references available upon request for qualified procurement opportunities.</p>
      </section>

      <section className="card p-8 sm:p-10 mb-8">
        <h2 className="grid-label mb-6">NAICS codes</h2>
        <div className="overflow-hidden rounded-2xl border border-borderBrand"><table className="w-full text-sm"><thead><tr className="border-b border-borderBrand bg-soft"><th className="px-5 py-3 text-left grid-label font-normal">Code</th><th className="px-5 py-3 text-left grid-label font-normal">Description</th></tr></thead><tbody className="divide-y divide-borderBrand">{naicsCodes.map((n) => <tr key={n.code}><td className="px-5 py-3 font-mono font-semibold text-navy">{n.code}</td><td className="px-5 py-3 text-slate-600">{n.desc}</td></tr>)}</tbody></table></div>
      </section>

      <section className="card p-8 sm:p-10 mb-8">
        <h2 className="grid-label mb-4">Service area</h2>
        <p className="text-sm leading-7 text-slate-600 max-w-3xl">Primary coverage: Phoenix metropolitan area including Tempe, Mesa, Chandler, Scottsdale, Glendale, Peoria, Surprise, Goodyear, Avondale, and Gilbert. Qualified statewide Arizona travel available for the right scope.</p>
      </section>

      <div className="card bg-navy p-8 text-white sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><h2 className="text-2xl font-semibold">Ready to engage?</h2><p className="mt-3 max-w-2xl text-base leading-7 text-white/80">Send scope, site, and timeline through dispatch intake. Capability statement PDF available on request.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:bg-slate-100">Open Dispatch</Link><a href={siteConfig.phoneHref} className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">{siteConfig.phoneDisplay}</a></div>
        </div>
      </div>
    </div>
  );
}
