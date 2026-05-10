import type { Metadata } from 'next';
import Link from 'next/link';
import { audience, environments } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Who We Serve',
  description:
    'Already Here LLC supports vendors, MSPs, and multi-site operators that need onsite execution, structured closeout, and Arizona project-market support.'
};

export default function WhoWeServePage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Who We Serve</span>
      <h1 className="section-title mt-5">A field execution partner for organizations that already know what the site work needs to accomplish.</h1>
      <p className="section-copy">
        Already Here LLC is designed for B2B dispatch flow. The best fit is a buyer that already has scope, parts, or program direction in place and needs onsite execution with clean communication.
      </p>

      <div className="mt-12 grid gap-6">
        {audience.map((item) => (
          <section key={item.title} className="card p-8 sm:p-10">
            <h2 className="text-2xl font-semibold text-navy">{item.title}</h2>
            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">{item.description}</p>
          </section>
        ))}
      </div>

      <section className="mt-12 card p-8 sm:p-10">
        <span className="grid-label">Documented environments</span>
        <h2 className="mt-4 text-2xl font-semibold text-navy">Work has been documented across multiple operating environments.</h2>
        <div className="mt-8 flex flex-wrap gap-3">
          {environments.map((environment) => (
            <div key={environment} className="rounded-full border border-borderBrand bg-soft px-4 py-3 text-sm font-medium text-slate-700">
              {environment}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 card bg-navy p-8 text-white sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-2xl font-semibold">Need a clean dispatch handoff?</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
              Send the city, service type, schedule window, and scope details. Coverage should be checked against the actual work, not assumed from generic website copy.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy">
              Check Coverage
            </Link>
            <Link href="/services" className="link-ring inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white">
              View Services
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
