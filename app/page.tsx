import type { Metadata } from 'next';
import Link from 'next/link';
import { AlreadyHereLogo } from '@/components/logo';
import {
  buyerReasons,
  documentedWorkTypes,
  environments,
  representativeWork,
  serviceGroups,
  siteConfig
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    'onsite IT field execution',
    'technical field operations',
    'onsite infrastructure execution',
    'MSP smart hands support',
    'network troubleshooting',
    'rollout recovery',
    'commercial IT field support',
    'retail infrastructure support',
    'RFID field support',
    'barcode scanner support',
    'asset tracking field support',
    'IT asset recovery',
    'store decommissioning support',
    'return logistics support',
    'government contractor IT services',
    'SAM.gov registered IT contractor',
    'Phoenix technical field operations'
  ],
  alternates: { canonical: 'https://www.alreadyherellc.com' },
  openGraph: {
    title: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
    description: siteConfig.description,
    url: 'https://www.alreadyherellc.com',
    siteName: siteConfig.name,
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
    description: siteConfig.description
  }
};

const intakePaths = [
  {
    href: '/rfq',
    title: 'Request a Project Quote',
    body: 'Submit scope, timeline, site count, location, closeout requirements, and attachments for project-based bidding.',
    cta: 'Open RFQ'
  },
  {
    href: '/project-gallery',
    title: 'View Project Gallery',
    body: 'Review redacted representative work and approved rotating project photos when available.',
    cta: 'View Gallery'
  },
  {
    href: '/coverage',
    title: 'Check Coverage',
    body: 'Use the Phoenix-centered Arizona coverage reference for dispatch planning and project fit.',
    cta: 'Check Coverage'
  }
] as const;

const operationsLayer = [
  'Onsite remediation for issues remote teams cannot close remotely',
  'Network, Wi-Fi, rack, endpoint, and commercial infrastructure support',
  'RFID, barcode, scanner, label-printer, inventory, and asset-tracking field support',
  'Store decommissioning, IT equipment recovery, inventory capture, packing, labeling, and return-logistics handoff',
  'Retail, commercial, MSP, vendor, and critical-systems field execution',
  'Structured closeout with field notes, photos when permitted, asset details, and escalation detail'
] as const;

export default function HomePage() {
  return (
    <>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-14 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="eyebrow">Field execution partner for MSPs, vendors, and infrastructure teams</span>
              <span className="inline-flex items-center rounded-full border border-borderBrand bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-steel">
                Phoenix-Based
              </span>
              <span className="inline-flex items-center rounded-full border border-borderBrand bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-steel">
                Operating Since 2013
              </span>
            </div>

            <h1 className="mt-2 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl lg:text-6xl">
              {siteConfig.heroTitle}
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              {siteConfig.heroDescription}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
                Request Dispatch
              </Link>
              <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                Request Project Quote
              </Link>
              <Link href="/capability-statement" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                Capability Statement
              </Link>
            </div>

            <div className="mt-10 rounded-3xl border border-borderBrand bg-soft px-5 py-5">
              <p className="grid-label">Trust bar</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['A+ BBB Rating', 'Operating Since 2013', 'Phoenix-Based', 'SAM.gov Registered', 'Commercial & Multi-Site Support', 'Rapid Onsite Dispatch'].map((badge) => (
                  <span key={badge} className="rounded-full border border-borderBrand bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="bg-navy p-8 sm:p-10">
              <div className="flex items-center gap-3 text-white">
                <AlreadyHereLogo className="h-16 w-16 shrink-0" />
                <div className="min-w-0 leading-none">
                  <div className="text-[15px] font-semibold uppercase tracking-[0.18em] text-white">ALREADY HERE LLC</div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-steel">ONSITE INFRASTRUCTURE EXECUTION</div>
                </div>
              </div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-white/60">Positioning</p>
              <p className="mt-3 text-base leading-7 text-white/90">{siteConfig.positioning}</p>
            </div>

            <div className="grid gap-4 p-8 sm:p-10">
              {serviceGroups.slice(0, 6).map((group) => (
                <div key={group.title} className="rounded-3xl border border-borderBrand p-5">
                  <h2 className="text-base font-semibold text-navy">{group.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <span className="eyebrow">Project intake paths</span>
        <h2 className="section-title mt-5">Choose the right path before dispatch.</h2>
        <p className="section-copy">Single-site work, project-based bidding, coverage planning, and buyer proof are separated so vendors and MSPs do not have to guess where to start.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {intakePaths.map(({ href, title, body, cta }) => (
            <Link key={href} href={href} className="card p-6 transition hover:border-action">
              <h3 className="text-xl font-semibold text-navy">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              <span className="mt-6 inline-flex rounded-full bg-action px-4 py-2 text-sm font-semibold text-white">{cta}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <span className="eyebrow">Why buyers choose us</span>
        <h2 className="section-title mt-5">Field execution that closes the gap between remote support and onsite reality.</h2>
        <p className="section-copy">MSPs, vendors, and multi-site operators get an onsite partner who can reach the location, verify conditions, complete defined technical work, and return clear closeout notes so tickets do not stall or cycle back.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {buyerReasons.map((text) => (
            <div key={text} className="card p-6">
              <p className="text-sm leading-7 text-slate-700">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="eyebrow">Operations layer</span>
              <h2 className="section-title mt-5">The work starts where remote support runs out of reach.</h2>
              <p className="section-copy">Already Here LLC is positioned for onsite remediation, smart hands support, network troubleshooting, RFID and asset-tracking support, IT asset recovery, store decommissioning support, rollout recovery, infrastructure assessment, and closeout-heavy execution.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {operationsLayer.map((text) => (
                <div key={text} className="rounded-3xl border border-borderBrand bg-soft px-6 py-6 text-sm leading-7 text-slate-700">
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <section className="proof-light">
          <div className="mb-10">
            <span className="eyebrow">Representative work</span>
            <h2 className="section-title mt-5">Field execution across environments that matter</h2>
            <p className="section-copy">Clients include national retail technology vendors, enterprise infrastructure teams, healthcare-adjacent operators, and MSPs across the Phoenix metro and Western US. Client names available for qualified buyers upon request.</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {representativeWork.map(({ tag, client, scope }) => (
                <div key={scope} className="rounded-3xl border border-borderBrand bg-white p-6" data-proof-surface="true" data-proof-border="true">
                  <span className="grid-label mb-2 block">{tag}</span>
                  <p className="mb-2 text-sm font-semibold leading-snug text-navy">{client}</p>
                  <p className="proof-muted text-sm leading-6">{scope}</p>
                </div>
              ))}
            </div>

            <p className="proof-muted mt-6 text-xs">Field Nation and WorkMarket dispatch history available for verification by qualified procurement buyers.</p>
          </div>

          <div className="card overflow-hidden bg-white" data-proof-surface="true" data-proof-border="true">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="border-b border-borderBrand bg-white p-6 lg:border-b-0 lg:border-r sm:p-8" data-proof-surface="true" data-proof-border="true">
                <div className="rounded-3xl border border-borderBrand bg-white p-6 shadow-sm" data-proof-surface="true" data-proof-border="true">
                  <div className="flex items-start justify-between gap-4 border-b border-borderBrand pb-5" data-proof-border="true">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#475569]">Closeout packet</p>
                      <h3 className="mt-2 text-xl font-bold leading-snug text-[#071B34]">Redacted field-work sample</h3>
                    </div>
                    <span className="rounded-full border border-[#CBD5E1] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#475569]" data-proof-surface="true">Completed</span>
                  </div>
                  <div className="mt-6 grid gap-4">
                    {[
                      { label: 'Site verification', body: 'Access, equipment state, and visible site conditions documented.' },
                      { label: 'Work performed', body: 'Defined onsite tasks completed or escalated with clear blocker notes.' },
                      { label: 'Photo evidence', body: 'Before, during, and after photos captured when permitted by site policy.' },
                      { label: 'Asset detail', body: 'Inventory, serial, MAC, asset-tag, packing, return, and carrier-handoff detail captured when in scope.' },
                      { label: 'Ticket closeout', body: 'Outcome, next action, and buyer-facing summary returned for dispatch closure.' }
                    ].map(({ label, body }) => (
                      <div key={label} className="rounded-2xl border border-borderBrand bg-white p-4" data-proof-surface="true" data-proof-border="true">
                        <p className="proof-label text-xs font-bold uppercase tracking-[0.14em]">{label}</p>
                        <p className="proof-muted mt-2 text-sm font-medium leading-6">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 sm:p-10" data-proof-surface="true">
                <span className="eyebrow">Documented closeout</span>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-navy">Documented field execution, not vague capability claims</h2>
                <p className="proof-muted mt-4 text-base leading-7">Positioning is grounded in documented field activity spanning hardware replacement, surveys, rollouts, remediation, store technology, networking, AV/media, RFID, asset tracking, IT asset recovery, return logistics, and infrastructure-related onsite work across Arizona and out-of-state project markets.</p>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                  {[
                    'Arrival / departure notes',
                    'Action summary and field observations',
                    'Photos when permitted',
                    'Part swap or equipment notes',
                    'Inventory, serial, MAC, and asset-tag notes when in scope',
                    'Packing, labeling, return, and carrier-handoff notes when in scope',
                    'Escalation notes for unresolved items',
                    'Usable closeout language for the client-side ticket'
                  ].map((item) => (
                    <li key={item} className="rounded-2xl border border-borderBrand bg-white px-4 py-4 text-sm text-slate-700" data-proof-surface="true" data-proof-border="true">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="container-shell grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="eyebrow">Who we support</span>
            <h2 className="section-title mt-5">Built for MSP, vendor, government-prime, and multi-site dispatch realities.</h2>
            <div className="mt-8 grid gap-4">
              {[
                { title: 'MSPs and network operators', body: 'Extend field coverage for smart hands, network troubleshooting, router work, site visits, documentation collection, and remediation without carrying local headcount for every project market.' },
                { title: 'Vendors and prime contractors', body: 'Use Already Here LLC as the onsite execution layer when the scope, parts, and ticket flow are defined and the missing piece is reliable field completion.' },
                { title: 'Retail and commercial operators', body: 'Support multi-site technology programs, POS work, endpoint refreshes, store modernization, rollout recovery, RFID, asset tracking, IT asset recovery, return logistics, and commercial infrastructure tasks.' },
                { title: 'Procurement teams', body: 'SAM.gov registered and commercially insured, with certification pursuit handled separately from public buyer claims.' }
              ].map(({ title, body }) => (
                <div key={title} className="card p-6">
                  <h3 className="text-xl font-semibold text-navy">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-8 sm:p-10">
            <h2 className="text-2xl font-semibold text-navy">Documented work types</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {documentedWorkTypes.map((item) => (
                <li key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-3 text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-navy">Operating environments</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {environments.map((env) => (
                  <span key={env} className="rounded-full border border-borderBrand px-3 py-2 text-sm text-slate-700">{env}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-borderBrand bg-soft py-16 lg:py-24">
        <div className="container-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="eyebrow">Service area</span>
            <h2 className="section-title mt-5">Phoenix-based with project coverage available nationwide depending on client scope.</h2>
            <p className="section-copy">Public positioning stays precise: Phoenix-based, with nationwide project coverage available for qualified client scope, scheduling, and travel requirements.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/coverage" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy">Check Coverage</Link>
              <Link href="/who-we-serve" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy transition hover:border-action hover:text-action">Who We Serve</Link>
            </div>
          </div>

          <div className="card p-8 sm:p-10">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {['Phoenix', 'Tempe', 'Chandler', 'Scottsdale', 'Glendale', 'Mesa', 'Peoria', 'Avondale', 'Buckeye', 'Goodyear', 'Surprise', 'Litchfield Park', 'Carefree', 'Page', 'Quartzsite', 'San Luis', 'Springerville', 'Nationwide project coverage by scope'].map((city) => (
                <div key={city} className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm font-medium text-slate-700">{city}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="card bg-navy p-8 text-white sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Ready to engage</span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Need onsite infrastructure execution for a project site?</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/80">Send the scope, target city, schedule window, and any files that matter. Already Here LLC will assess coverage fit and execute the site work cleanly when the dispatch is confirmed.</p>
              <p className="mt-3 text-sm text-white/60">SAM.gov registered · Actively pursuing SDVOSB certification</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:bg-slate-100">Request Project Quote</Link>
              <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Request Dispatch</Link>
              <a href={siteConfig.phoneHref} className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">{siteConfig.phoneDisplay}</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
