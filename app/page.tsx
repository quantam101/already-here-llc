import Link from 'next/link';
import { ProofBlock } from '@/components/ProofBlock';
import { audience, buyerReasons, documentedWorkTypes, environments, markets, serviceGroups } from '@/lib/site';

export default function HomePage() {
  return (
    <>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-14 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <span className="eyebrow">Phoenix-based · Commercially insured</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl lg:text-6xl">
              Field execution for vendors, MSPs, and multi-site operators that need onsite work handled cleanly.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              You send the scope. Already Here LLC executes onsite, communicates clearly, and closes the work with usable documentation.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy"
              >
                Request Dispatch
              </Link>
              <Link
                href="/contact"
                className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-navy transition hover:border-action hover:text-action"
              >
                Send Scope
              </Link>
              <Link
                href="/services"
                className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action"
              >
                View Services
              </Link>
            </div>
            <dl className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-borderBrand bg-soft px-5 py-5">
                <dt className="grid-label">Coverage model</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-700">Arizona project support based on scope, scheduling, and travel requirements.</dd>
              </div>
              <div className="rounded-3xl border border-borderBrand bg-soft px-5 py-5">
                <dt className="grid-label">Core work</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-700">Dispatches, recurring visits, rollouts, remediation, surveys, and infrastructure-related onsite work.</dd>
              </div>
              <div className="rounded-3xl border border-borderBrand bg-soft px-5 py-5">
                <dt className="grid-label">Closeout</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-700">Usable documentation for the client-side ticket, not vague “work completed” notes.</dd>
              </div>
            </dl>
          </div>

          <div className="card p-8 sm:p-10">
            <span className="grid-label">Core capabilities</span>
            <div className="mt-6 grid gap-4">
              {serviceGroups.map((group) => (
                <div key={group.title} className="rounded-3xl border border-borderBrand p-5">
                  <h2 className="text-lg font-semibold text-navy">{group.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-3xl bg-navy px-6 py-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70">Why buyers use us</p>
              <p className="mt-3 text-base leading-7 text-white/90">
                When the scope is defined and the missing piece is dependable onsite execution, clear communication, and structured closeout.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <span className="eyebrow">Why buyers choose us</span>
        <h2 className="section-title mt-5">Operationally useful field support, not inflated marketing language.</h2>
        <p className="section-copy">
          The positioning stays disciplined. No unsupported SLA claims. No fake statewide guarantees. No certification language that cannot be verified publicly.
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
              <span className="eyebrow">Fixer / remediation block</span>
              <h2 className="section-title mt-5">When a rollout leaves loose ends, the field work still has to get finished properly.</h2>
              <p className="section-copy">
                Already Here LLC is positioned for revisit work, remediation, post-install troubleshooting, store modernization cleanup, and field issues that need a clean onsite owner.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {['Revisit work after missed items or failed closeout', 'Troubleshooting after rollout or modernization activity', 'Payment device, printer, endpoint, and store-technology correction work', 'Onsite verification and documentation collection when remote teams need ground truth'].map((item) => (
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
            <h2 className="section-title mt-5">Built around vendor, MSP, and multi-site dispatch realities.</h2>
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
              {documentedWorkTypes.slice(0, 12).map((item) => (
                <li key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-3 text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-navy">Documented environments</h3>
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
            <span className="eyebrow">Service area block</span>
            <h2 className="section-title mt-5">Arizona project markets with Phoenix at the center of the operating model.</h2>
            <p className="section-copy">
              Public positioning stays precise: Phoenix-based, with broader Arizona project support based on scope, scheduling, and travel requirements.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy">
                Check Coverage
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
                Final CTA block
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                Need onsite execution in Arizona without inflated claims or messy closeout?
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/80">
                Send the scope, target city, schedule window, and any files that matter. If the coverage fit is right, the next step is simple: confirm the dispatch and execute the site work cleanly.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/contact" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:bg-slate-100">
                Request Dispatch
              </Link>
              <Link href="/contact" className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Send Scope
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
