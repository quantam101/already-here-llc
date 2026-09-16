import type { Metadata } from 'next';
import Link from 'next/link';
import { engagementStatusNote, naicsCodes, representativeWork, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Capability Statement | Managed IT Services & Technical Field Operations',
  description:
    'Already Here LLC capability statement: Phoenix-based managed service provider with 30+ years of IT experience delivering managed IT, networks, systems, cloud, security, projects, and onsite technical field operations.',
  alternates: { canonical: '/capability-statement' }
};

const coreCompetencies = [
  'Managed IT services, help desk, remote user support, and technical administration',
  'Network, Wi-Fi, firewall, server, endpoint, and systems administration',
  'Microsoft 365, cloud, identity, access, permissions, and collaboration support',
  'Security hardening, firewall and endpoint support, troubleshooting, and remediation',
  'Monitoring, maintenance, lifecycle support, technical documentation, and escalation',
  'IT planning, vendor coordination, infrastructure projects, migrations, and refreshes',
  'Co-managed support for internal IT teams requiring engineering depth or local hands',
  'Onsite smart hands, network and infrastructure troubleshooting, break/fix, and remediation',
  'Server, storage, warranty, RMA, and component replacement',
  'POS, kiosk, payment-device, retail-technology, and multi-site field support',
  'RFID, barcode, asset tracking, IoT, survey, and site-verification work',
  'Rollout, modernization, decommissioning, asset recovery, and documentation-driven closeout'
];

const differentiators = [
  '30+ years of IT experience across enterprise, healthcare, government-adjacent, retail, QSR, data center, networking, systems, and field operations',
  'Operating as Already Here LLC since 2013',
  'Phoenix-based managed service provider with remote and onsite delivery capability',
  'Veteran-owned business; formal certification status is supplied separately when applicable',
  'SAM.gov registered and commercially insured - General Liability and Professional Liability',
  'One technical organization can coordinate managed support, projects, remote administration, and physical site execution',
  'Verified execution history across NCR Voyix, HPE / Source Support service channels, Volanté, PIVITAL, ASD programs, Barrister / Unisys programs, Retail Tech, ITI / Indusys, GE Healthcare, and other enterprise environments',
  'Direct, subcontracted, service-channel, and marketplace-routed history is kept clearly separated so procurement teams can evaluate relationship status accurately',
  'Structured closeout with technical notes, permitted photo evidence, serial/asset detail, parts disposition, vendor coordination, and escalation detail when required'
];

const serviceModels = [
  {
    title: 'Managed IT',
    body: 'Recurring support and administration across users, endpoints, networks, systems, cloud services, identity, security controls, vendors, documentation, and technology lifecycle.'
  },
  {
    title: 'Co-Managed IT',
    body: 'Engineering, escalation, project, documentation, infrastructure, and local-hands capacity that complements an internal IT team.'
  },
  {
    title: 'Projects & Field Operations',
    body: 'Defined deployments, migrations, remediation, site work, smart hands, multi-site execution, break/fix, surveys, refreshes, and technical closeout.'
  }
] as const;

export default function CapabilityStatementPage() {
  const year = new Date().getFullYear();

  return (
    <div className="container-shell py-16 lg:py-24">
      <div className="card mb-8 p-8 sm:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="eyebrow">Capability Statement - {year}</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-navy sm:text-5xl">Already Here LLC</h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
              Phoenix-based managed service provider (MSP) with 30+ years of IT experience delivering managed IT support, network and systems administration, Microsoft 365 and cloud support, security hardening, infrastructure services, technical projects, and onsite field operations.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-end lg:gap-3">
            <span className="rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-slate-600">30+ Years IT Experience</span>
            <span className="rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-slate-600">Operating Since 2013</span>
            <span className="rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-slate-600">Veteran-Owned</span>
            <span className="rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-slate-600">SAM.gov Registered</span>
            <span className="rounded-full border border-borderBrand px-4 py-2 text-sm font-medium text-slate-600">Commercially Insured</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 border-t border-borderBrand pt-8 sm:grid-cols-3">
          <div>
            <p className="grid-label mb-2">Entity</p>
            <p className="text-sm font-semibold text-navy">{siteConfig.name}</p>
            <p className="text-sm text-slate-600">Stephen Franklin, Owner</p>
          </div>
          <div>
            <p className="grid-label mb-2">Address</p>
            <p className="text-sm text-slate-600">{siteConfig.address.street}<br />{siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.zip}</p>
          </div>
          <div>
            <p className="grid-label mb-2">Contact</p>
            <a href={siteConfig.phoneHref} className="block text-sm text-slate-600 transition-colors hover:text-action">{siteConfig.phoneDisplay}</a>
            <a href={`mailto:${siteConfig.email}`} className="block text-sm text-slate-600 transition-colors hover:text-action">{siteConfig.email}</a>
            <a href={siteConfig.url} className="block text-sm text-slate-500 transition-colors hover:text-action">{siteConfig.url.replace('https://', '')}</a>
          </div>
        </div>
      </div>

      <section className="card mb-8 p-8 sm:p-10">
        <h2 className="grid-label mb-6">Service models</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {serviceModels.map((model) => (
            <article key={model.title} className="rounded-2xl border border-borderBrand bg-soft p-5">
              <h3 className="text-lg font-semibold text-navy">{model.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{model.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card mb-8 p-8 sm:p-10">
        <h2 className="grid-label mb-6">Core competencies</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {coreCompetencies.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-action" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="card mb-8 p-8 sm:p-10">
        <h2 className="grid-label mb-6">Differentiators</h2>
        <ul className="grid gap-3">
          {differentiators.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-action" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="card mb-8 p-8 sm:p-10">
        <h2 className="grid-label mb-6">Past performance (representative)</h2>
        <div className="grid gap-4">
          {representativeWork.map((item) => (
            <div key={item.scope} className="grid grid-cols-1 gap-2 rounded-2xl border border-borderBrand bg-soft p-5 sm:grid-cols-[190px_1fr]">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-action">{item.tag}</p>
                <p className="text-sm font-medium text-navy">{item.client}</p>
              </div>
              <p className="text-sm leading-6 text-slate-600">{item.scope}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 rounded-2xl border border-borderBrand bg-soft p-4 text-xs leading-5 text-slate-500">{engagementStatusNote}</p>
        <p className="mt-3 text-xs text-slate-400">
          Supporting work-order records, direct-company correspondence, Field Nation / WorkMarket records, training records, and qualified buyer references are available for procurement review when appropriate.
        </p>
      </section>

      <section className="card mb-8 p-8 sm:p-10">
        <h2 className="grid-label mb-6">NAICS codes</h2>
        <div className="overflow-hidden rounded-2xl border border-borderBrand">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borderBrand bg-soft">
                <th className="px-5 py-3 text-left font-normal grid-label">Code</th>
                <th className="px-5 py-3 text-left font-normal grid-label">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBrand">
              {naicsCodes.map((item) => (
                <tr key={item.code}>
                  <td className="px-5 py-3 font-mono font-semibold text-navy">{item.code}</td>
                  <td className="px-5 py-3 text-slate-600">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mb-8 p-8 sm:p-10">
        <h2 className="grid-label mb-4">Service area</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          Phoenix metropolitan area is the primary local managed-service and onsite market. Remote managed support and qualified broader project coverage are available by scope. Statewide Arizona and nationwide project travel are evaluated based on responsibilities, scheduling, access, travel economics, and commercial terms.
        </p>
      </section>

      <div className="card bg-navy p-8 text-white sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Need managed IT, co-managed support, a technical project, or Arizona field coverage?</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/80">
              Send the environment, users or sites, current responsibilities, objectives, timing, access needs, and supporting material through the IT support intake. Supplier, subcontractor, service-partner, managed-service, and recurring-program inquiries can be routed from the same entry point.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:bg-slate-100">Request IT Support</Link>
            <a href={`mailto:${siteConfig.email}`} className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Email Already Here LLC</a>
          </div>
        </div>
      </div>
    </div>
  );
}
