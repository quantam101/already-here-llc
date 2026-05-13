import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { ProofBlock } from '@/components/ProofBlock';
import { getProfitEngineStatus } from '@/lib/profitengine';
import { documentedWorkTypes, serviceGroups, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
    description: siteConfig.description,
    url: '/',
    siteName: siteConfig.name,
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
    description: siteConfig.description
  }
};

const conversionCards = [
  {
    title: 'Request Dispatch',
    description: 'Submit site location, access notes, scope, schedule window, and closeout requirements for onsite field execution.',
    href: '/dispatch',
    cta: 'Open Dispatch Intake'
  },
  {
    title: 'Request a Project Quote',
    description: 'Send scope, timeline, site count, attachments, and compliance requirements for project-based bidding.',
    href: '/rfq',
    cta: 'Open RFQ'
  },
  {
    title: 'Check Coverage',
    description: 'Use the Phoenix-centered Arizona coverage reference for dispatch planning and project fit.',
    href: '/coverage',
    cta: 'Check Coverage'
  }
] as const;

const profitEngineChecks = [
  'Dashboard/API surface exposed through Vercel status rendering',
  'Oracle runtime checked without fabricating revenue or posting data',
  'Revenue remains unverified until live platform balances or transactions confirm it',
  'Public runtime still requires VM/OCI repair if Oracle endpoints remain offline'
] as const;

export default async function HomePage() {
  const profitEngine = await getProfitEngineStatus();
  const statusBadge =
    profitEngine.state === 'online'
      ? 'Online'
      : profitEngine.state === 'degraded'
        ? 'Degraded'
        : 'Oracle Runtime Offline';

  return (
    <>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-14 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
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
          </div>

          <div className="card overflow-hidden">
            <div className="bg-navy p-8 sm:p-10">
              <BrandMark className="text-white" tagline="ONSITE INFRASTRUCTURE EXECUTION" textColorClassName="text-white" />
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-white/60">Positioning</p>
              <p className="mt-3 text-base leading-7 text-white/90">{siteConfig.positioning}</p>
            </div>
            <div className="grid gap-4 p-8 sm:p-10">
              {serviceGroups.slice(0, 4).map((group) => (
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
        <span className="eyebrow">ProfitEngine control surface</span>
        <div className="mt-5 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h2 className="section-title">Vercel-hosted status for the ProfitEngine runtime.</h2>
            <p className="section-copy">
              This public surface verifies the Oracle runtime from the deployed website without claiming false revenue or posting activity. If Oracle remains unreachable, Vercel stays live and reports the outage clearly.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex rounded-full border border-borderBrand bg-soft px-4 py-2 text-sm font-semibold text-navy">
                Runtime: {statusBadge}
              </span>
              <span className="inline-flex rounded-full border border-borderBrand bg-soft px-4 py-2 text-sm font-semibold text-navy">
                Checked: {new Date(profitEngine.checkedAt).toLocaleString('en-US', { timeZone: 'America/Phoenix' })} MST
              </span>
            </div>
          </div>
          <div className="card p-6 sm:p-8">
            <div className="grid gap-3">
              {profitEngine.endpoints.map((endpoint) => (
                <div key={endpoint.path} className="rounded-2xl border border-borderBrand bg-soft px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-navy">{endpoint.name}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{endpoint.path}</p>
                    </div>
                    <span className="rounded-full border border-borderBrand bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                      {endpoint.ok ? 'OK' : 'Failed'} {endpoint.status ? `(${endpoint.status})` : ''}
                    </span>
                  </div>
                  {endpoint.error ? <p className="mt-2 text-xs leading-5 text-slate-500">{endpoint.error}</p> : null}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">{profitEngine.summary}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {profitEngineChecks.map((item) => (
            <div key={item} className="rounded-3xl border border-borderBrand bg-white p-5 text-sm leading-7 text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-soft py-16 lg:py-24">
        <div className="container-shell">
          <span className="eyebrow">Project intake paths</span>
          <h2 className="section-title mt-5">Choose the right path before dispatch.</h2>
          <p className="section-copy">Single-site work, project-based bidding, coverage planning, and buyer proof are separated so vendors and MSPs do not have to guess where to start.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {conversionCards.map((card) => (
              <Link key={card.href} href={card.href} className="card p-6 transition hover:border-action">
                <h3 className="text-xl font-semibold text-navy">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
                <span className="mt-6 inline-flex rounded-full bg-action px-4 py-2 text-sm font-semibold text-white">{card.cta}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <ProofBlock />
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="container-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="eyebrow">Operations layer</span>
            <h2 className="section-title mt-5">The work starts where remote support runs out of reach.</h2>
            <p className="section-copy">
              Already Here LLC is positioned for onsite remediation, smart hands support, network troubleshooting, rollout recovery, infrastructure assessment, and closeout-heavy execution.
            </p>
          </div>
          <div className="card p-8 sm:p-10">
            <h2 className="text-2xl font-semibold text-navy">Documented work types</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {documentedWorkTypes.slice(0, 14).map((item) => (
                <li key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-3 text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="card bg-navy p-8 text-white sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Ready to engage
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                Need onsite infrastructure execution for a project site?
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/80">
                Send the scope, target city, schedule window, and any files that matter. Already Here LLC will assess coverage fit and execute the site work cleanly when the dispatch is confirmed.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:bg-slate-100">
                Request Project Quote
              </Link>
              <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Request Dispatch
              </Link>
              <a href={siteConfig.phoneHref} className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                {siteConfig.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
