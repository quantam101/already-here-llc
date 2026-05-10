import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { ProofBlock } from '@/components/ProofBlock';
import { audience, buyerReasons, documentedWorkTypes, environments, markets, serviceGroups, siteConfig } from '@/lib/site';

export default function HomePage() {
  return (
    <>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-14 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="eyebrow">Modern Tech Ops · Government/vendor capable</span>
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
              <Link
                href="/dispatch"
                className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy"
              >
                Request Dispatch
              </Link>
              <Link
                href="/dispatch"
                className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-navy transition hover:border-action hover:text-action"
              >
                Book Infrastructure Assessment
              </Link>
              <Link
                href="/capability-statement"
                className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action"
              >
                Capability Statement
              </Link>
            </div>
            <div className="mt-10 rounded-3xl border border-borderBrand bg-soft px-5 py-5">
              <p className="grid-label">Trust bar</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {siteConfig.trustBar.map((item) => (
                  <span key={item} className="rounded-full border border-borderBrand bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {item}
                  </span>
                ))}
              </div>
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
        <span className="eyebrow">Why buyers choose us</span>
        <h2 className="section-title mt-5">Enterprise field execution without consumer repair-shop positioning.</h2>
        <p className="section-copy">
          The brand now presents as operational, technical, trustworthy, field-ready, and vendor capable. It avoids generic MSP language and keeps claims tied to what can be delivered onsite.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {buyerReasons.map((reason) => (
            <div key={reason} className="card p-6">
              <p className="text-sm leading-7 text-slate-700">{reason}</p>
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
              <p className="section-copy">
                Already Here LLC is positioned for onsite remediation, smart hands support, network troubleshooting, rollout recovery, infrastructure assessment, and closeout-heavy execution.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Onsite remediation for issues remote teams cannot close remotely',
                'Network, Wi-Fi, rack, endpoint, and commercial infrastructure support',
                'Retail, commercial, MSP, vendor, and critical-systems field execution',
                'Structured closeout with field notes, photos when permitted, and escalation detail'
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-borderBrand bg-soft px-6 py-6 text-sm leading-7 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <ProofBlock />
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="container-shell grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="eyebrow">Who we support</span>
            <h2 className="section-title mt-5">Built for MSP, vendor, government-prime, and multi-site dispatch realities.</h2>
            <div className="mt-8 grid gap-4">
              {audience.map((item) => (
                <div key={item.title} className="card p-6">
                  <h3 className="text-xl font-semibold text-navy">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
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
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-navy">Operating environments</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {environments.map((environment) => (
                  <span key={environment} className="rounded-full border border-borderBrand px-3 py-2 text-sm text-slate-700">
                    {environment}
                  </span>
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
            <h2 className="section-title mt-5">Arizona field operations with Phoenix at the center of the operating model.</h2>
            <p className="section-copy">
              Public positioning stays precise: Phoenix-based, with broader Arizona project support based on scope, scheduling, and travel requirements.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy">
                Request Dispatch
              </Link>
              <Link href="/who-we-serve" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy transition hover:border-action hover:text-action">
                Who We Serve
              </Link>
            </div>
          </div>
          <div className="card p-8 sm:p-10">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map((market) => (
                <div key={market} className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm font-medium text-slate-700">
                  {market}
                </div>
              ))}
            </div>
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
                Need onsite infrastructure execution in Arizona?
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/80">
                Send the scope, target city, schedule window, and any files that matter. Already Here LLC will assess coverage fit and execute the site work cleanly when the dispatch is confirmed.
              </p>
              <p className="mt-3 text-sm text-white/60">
                SDVOSB-certified · SAM.gov registered
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:bg-slate-100">
                Request Dispatch
              </Link>
              <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Book Infrastructure Assessment
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
