import type { Metadata } from 'next';
import Link from 'next/link';
import { gincConfig, gincCategories } from '@/lib/ginc';

export const metadata: Metadata = {
  title: 'GINC — Growth & Interconnected Networks Collective',
  description: gincConfig.mission,
  alternates: { canonical: '/ginc' }
};

export default function GincHomePage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">{gincConfig.name}</span>
      <h1 className="section-title mt-5 max-w-4xl">
        {gincConfig.fullName}
      </h1>
      <p className="section-copy mt-4 max-w-3xl">
        {gincConfig.mission}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500">
        {gincConfig.tagline}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row flex-wrap">
        <Link href="/ginc/join" className="link-ring inline-flex rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-navy">
          Join the network
        </Link>
        <Link href="/ginc/list" className="link-ring inline-flex rounded-full border border-action px-6 py-3 text-sm font-semibold text-action hover:bg-action/5">
          List an asset
        </Link>
        <Link href="/ginc/work" className="link-ring inline-flex rounded-full border border-action px-6 py-3 text-sm font-semibold text-action hover:bg-action/5">
          Post work / need
        </Link>
        <Link href="/ginc/network" className="link-ring inline-flex rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-600 hover:border-action hover:text-action">
          Browse the network
        </Link>
      </div>

      <section className="mt-14 grid gap-6 md:grid-cols-3">
        {[
          ['List idle assets', 'Vehicles, trailers, tools, equipment, apartments, storage, and more.'],
          ['Find work or workers', 'Roofers, drivers, helpers, contractors, and businesses connect for repeat work.'],
          ['Build ongoing relationships', 'One rental can turn into a long-term crew, route, or partnership.']
        ].map(([title, body]) => (
          <div key={title} className="card p-6">
            <h2 className="text-lg font-semibold text-navy">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-14 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Categories across all 50 states</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {gincCategories.map((category) => (
            <span key={category} className="rounded-full border border-borderBrand bg-soft px-3 py-1 text-sm text-slate-700">
              {category}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-2xl border border-borderBrand bg-soft p-8">
        <h2 className="text-xl font-semibold text-navy">How the network works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ['Join', 'Create a free profile as an owner, worker, business, or renter.'],
            ['List or post', 'Add an available asset or a work need with location and terms.'],
            ['Match', 'The network suggests people, assets, and jobs that fit.'],
            ['Connect', 'Message, agree, and build a repeat working relationship.']
          ].map(([title, body]) => (
            <li key={title} className="rounded-2xl bg-white p-5">
              <h3 className="font-semibold text-navy">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
