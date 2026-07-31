'use client';

import { useState } from 'react';
import { GincListing, GincJob, GincMatch, GincMember } from '@/lib/ginc';

type Tab = 'listings' | 'jobs' | 'members' | 'matches';

interface GincNetworkData {
  members: GincMember[];
  listings: GincListing[];
  jobs: GincJob[];
  matches: GincMatch[];
}

export function GincNetworkBrowser({ initialData }: { initialData: GincNetworkData }) {
  const [activeTab, setActiveTab] = useState<Tab>('matches');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [assetType, setAssetType] = useState('');
  const [data, setData] = useState<GincNetworkData>(initialData);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (category) params.set('category', category);
    if (assetType) params.set('assetType', assetType);
    const response = await fetch(`/api/ginc/matches?${params.toString()}`);
    const payload = (await response.json().catch(() => ({}))) as GincNetworkData;
    setData(payload);
    setLoading(false);
  }

  function handleFilter(event: React.FormEvent) {
    event.preventDefault();
    load();
  }

  const matches = data?.matches || [];
  const listings = data?.listings || [];
  const jobs = data?.jobs || [];
  const members = data?.members || [];

  return (
    <div className="mt-10">
      <form onSubmit={handleFilter} className="card mb-8 flex flex-col gap-4 p-5 md:flex-row md:items-end">
        <label className="grid gap-2 text-sm font-medium text-navy md:flex-1">
          State
          <input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. AZ" maxLength={40} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy md:flex-1">
          Category / keyword
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. trailer" maxLength={120} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy md:flex-1">
          Asset / need type
          <input value={assetType} onChange={(e) => setAssetType(e.target.value)} placeholder="e.g. Trailer" maxLength={80} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <button type="submit" className="link-ring inline-flex rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-navy">
          Filter
        </button>
      </form>

      <div className="flex flex-wrap gap-2 border-b border-borderBrand pb-4">
        {(['matches', 'listings', 'jobs', 'members'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${activeTab === tab ? 'bg-action text-white' : 'border border-borderBrand text-slate-600 hover:border-action'}`}
          >
            {tab === 'jobs' ? 'Work' : tab}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-6 text-sm text-slate-600">Loading network...</p> : null}

      {activeTab === 'matches' && !loading ? (
        <div className="mt-6 grid gap-4">
          {matches.length === 0 ? <p className="text-sm text-slate-600">No matches yet. Try a broader filter.</p> : null}
          {matches.map((match, index) => (
            <div key={index} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-navy">
                    {match.listing?.title || match.job?.title || match.member?.fullName || 'Match'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {match.listing?.category || match.job?.category || match.member?.bio || ''}
                  </p>
                </div>
                <span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-slate-700">Score: {match.score}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Match reason: {match.reason}</p>
              <p className="mt-1 text-xs text-slate-500">
                {match.listing ? `${match.listing.city}, ${match.listing.state}` : match.job ? `${match.job.city}, ${match.job.state}` : `${match.member?.city}, ${match.member?.state}`}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'listings' && !loading ? (
        <div className="mt-6 grid gap-4">
          {listings.length === 0 ? <p className="text-sm text-slate-600">No listings yet.</p> : null}
          {listings.map((listing) => (
            <div key={listing.id} className="card p-5">
              <h3 className="font-semibold text-navy">{listing.title}</h3>
              <p className="text-sm text-slate-600">{listing.category} &middot; {listing.assetType}</p>
              <p className="mt-1 text-sm text-slate-600">{listing.price} <span className="text-slate-400">/ {listing.period}</span></p>
              <p className="mt-2 text-sm text-slate-600">{listing.description}</p>
              <p className="mt-2 text-xs text-slate-500">{listing.city}, {listing.state} &middot; {listing.status}</p>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'jobs' && !loading ? (
        <div className="mt-6 grid gap-4">
          {jobs.length === 0 ? <p className="text-sm text-slate-600">No work posts yet.</p> : null}
          {jobs.map((job) => (
            <div key={job.id} className="card p-5">
              <h3 className="font-semibold text-navy">{job.title}</h3>
              <p className="text-sm text-slate-600">{job.category} &middot; {job.assetType}</p>
              <p className="mt-1 text-sm text-slate-600">{job.schedule} {job.budget ? <span className="text-slate-400">&middot; {job.budget}</span> : null}</p>
              <p className="mt-2 text-sm text-slate-600">{job.description}</p>
              <p className="mt-2 text-xs text-slate-500">{job.city}, {job.state} &middot; {job.status}</p>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'members' && !loading ? (
        <div className="mt-6 grid gap-4">
          {members.length === 0 ? <p className="text-sm text-slate-600">No members yet.</p> : null}
          {members.map((member) => (
            <div key={member.id} className="card p-5">
              <h3 className="font-semibold text-navy">{member.fullName}</h3>
              <p className="text-sm text-slate-600 capitalize">{member.type}</p>
              <p className="mt-2 text-sm text-slate-600">{member.skills}</p>
              <p className="mt-1 text-xs text-slate-500">{member.city}, {member.state} &middot; {member.email}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
