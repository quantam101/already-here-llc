'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { VerificationBadges } from '@/components/VerificationBadges';

import { VerificationBadge } from '@/lib/badges';

interface Listing {
  id: string;
  title: string;
  category: string;
  type: string;
  price: string;
  status: 'available' | 'waitlist' | 'coming_soon';
  location: string;
  description: string;
  href: string;
  badges?: VerificationBadge[];
}

export function FleetMarketplaceListings({ listings }: { listings: Listing[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const categories = useMemo(() => Array.from(new Set(listings.map((l) => l.category))).sort(), [listings]);
  const statuses = useMemo(() => Array.from(new Set(listings.map((l) => l.status))).sort(), [listings]);

  const filtered = useMemo(() => listings.filter((listing) => {
    const matchesQuery = [listing.title, listing.type, listing.location, listing.description].some((field) => field.toLowerCase().includes(query.toLowerCase()));
    const matchesCategory = !category || listing.category === category;
    const matchesStatus = !status || listing.status === status;
    return matchesQuery && matchesCategory && matchesStatus;
  }), [listings, query, category, status]);

  return (
    <section className="card p-6 sm:p-8">
      <h2 className="text-2xl font-semibold text-navy">Browse marketplace listings</h2>
      <p className="mt-2 text-sm text-slate-600">Filter by keyword, category, or availability. Listings are screened before going live.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings..."
          className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button type="button" onClick={() => { setQuery(''); setCategory(''); setStatus(''); }} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm font-semibold text-slate-600 hover:border-action hover:text-action">
          Clear filters
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-500">{filtered.length} listing{filtered.length === 1 ? '' : 's'}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((listing) => (
          <Link key={listing.id} href={listing.href} className="rounded-2xl border border-borderBrand bg-soft p-5 transition hover:border-action/40 hover:shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">{listing.category}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${listing.status === 'available' ? 'bg-emerald-100 text-emerald-800' : listing.status === 'waitlist' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                {listing.status.replace('_', ' ')}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-navy">{listing.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{listing.type}</p>
            <p className="mt-2 text-lg font-semibold text-action">{listing.price}</p>
            <p className="mt-1 text-xs text-slate-500">{listing.location}</p>
            {listing.badges ? <div className="mt-3"><VerificationBadges badges={listing.badges} /></div> : null}
            <p className="mt-3 text-sm text-slate-600 line-clamp-2">{listing.description}</p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-borderBrand bg-soft p-8 text-center">
          <p className="text-sm text-slate-600">No listings match your filters. <Link href="/connect" className="text-action underline">Find work or workers</Link> or <Link href="#request-capacity" className="text-action underline">request capacity</Link>.</p>
        </div>
      ) : null}
    </section>
  );
}
