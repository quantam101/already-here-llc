import type { Metadata } from 'next';
import Link from 'next/link';
import { NetworkSearch } from './NetworkSearch';

export const metadata: Metadata = {
  title: 'Network — People, Vehicles, Equipment, Jobs',
  description: 'Search the Already Here LLC / GINC connection graph: which people connect to which vehicles, equipment, sites, and jobs.',
  alternates: { canonical: '/network' }
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NetworkPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Connection graph</span>
      <h1 className="section-title mt-5">People ↔ vehicles ↔ equipment ↔ jobs.</h1>
      <p className="section-copy">
        One lookup across the GINC network: members, listings, work needs, and the connections between them.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row flex-wrap">
        <Link href="/ginc/join" className="link-ring inline-flex rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-navy">
          Join the network
        </Link>
        <Link href="/marketplace" className="link-ring inline-flex rounded-full border border-action px-6 py-3 text-sm font-semibold text-action hover:bg-action/5">
          Marketplace
        </Link>
        <Link href="/ginc/network" className="link-ring inline-flex rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-600 hover:border-action hover:text-action">
          Browse GINC
        </Link>
      </div>

      <section className="mt-12">
        <NetworkSearch />
      </section>
    </div>
  );
}
