import type { Metadata } from 'next';
import Link from 'next/link';
import { RFQForm } from '@/components/RFQForm';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Request for Quote | Already Here LLC',
  description: 'Submit a project-based RFQ for onsite infrastructure execution, multi-site field work, rollout support, and technical dispatch coverage.',
  alternates: { canonical: '/rfq' },
  openGraph: {
    title: 'Request for Quote | Already Here LLC',
    description: 'Submit a project-based RFQ for onsite infrastructure execution, multi-site field work, rollout support, and technical dispatch coverage.',
    url: '/rfq',
    siteName: siteConfig.name,
    type: 'website'
  }
};

export default function RFQPage() {
  return (
    <>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow">Project-based bidding</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
            Request a quote for multi-site, rollout, remediation, or infrastructure field work.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Use this RFQ path when the request is larger than a single dispatch and requires project scope, timeline, location coverage, closeout requirements, and pricing assumptions.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy transition hover:border-action hover:text-action">
              Single-Site Dispatch
            </Link>
            <a href={siteConfig.phoneHref} className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy">
              {siteConfig.phoneDisplay}
            </a>
          </div>
        </div>
      </section>
      <section className="container-shell py-16 lg:py-24">
        <RFQForm />
      </section>
    </>
  );
}
