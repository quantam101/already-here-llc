import type { Metadata } from 'next';
import Link from 'next/link';
import { CoverageMap } from '@/components/CoverageMap';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Coverage Area | Already Here LLC',
  description: 'Phoenix-centered onsite infrastructure execution coverage across Arizona markets with qualified project coverage by scope.',
  alternates: { canonical: '/coverage' },
  openGraph: {
    title: 'Coverage Area | Already Here LLC',
    description: 'Phoenix-centered onsite infrastructure execution coverage across Arizona markets with qualified project coverage by scope.',
    url: '/coverage',
    siteName: siteConfig.name,
    type: 'website'
  }
};

export default function CoveragePage() {
  return (
    <>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow">Coverage area</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
            Arizona field coverage anchored from Phoenix.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            A clear coverage reference for remote dispatchers, MSP coordinators, vendors, and project teams planning Arizona field work.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy">
              Request Dispatch
            </Link>
            <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy transition hover:border-action hover:text-action">
              Request Project Quote
            </Link>
          </div>
        </div>
      </section>
      <section className="container-shell py-16 lg:py-24">
        <CoverageMap />
      </section>
    </>
  );
}
