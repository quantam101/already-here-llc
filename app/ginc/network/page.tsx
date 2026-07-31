import type { Metadata } from 'next';
import { GincNetworkBrowser } from '@/components/GincNetworkBrowser';
import { gincConfig } from '@/lib/ginc';
import { findMatches, loadNetwork, sanitizeMember } from '@/lib/ginc-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'GINC Network',
  description: 'Browse members, listings, jobs, and matches on GINC.',
  alternates: { canonical: '/ginc/network' }
};

export default async function GincNetworkPage() {
  const network = await loadNetwork();
  const matches = await findMatches();
  const initialData = {
    members: network.members.map(sanitizeMember),
    listings: network.listings,
    jobs: network.jobs,
    matches
  };

  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">{gincConfig.name}</span>
      <h1 className="section-title mt-5">Browse the network</h1>
      <p className="section-copy">
        See listings, work needs, members, and recommended matches across the GINC network.
      </p>
      <GincNetworkBrowser initialData={initialData} />
    </div>
  );
}
