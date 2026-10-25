import type { VerificationBadge } from './badges';
import { loadNetwork } from './ginc-store';

/**
 * Marketplace listing feed — real records only.
 *
 * Listings come from the GINC network (member-published vehicle /
 * equipment / space listings). There are no static "coming soon"
 * previews: an empty network renders the page's honest empty state
 * instead of fabricated listings.
 */

export interface MarketplaceListing {
  id: string;
  title: string;
  category: string;
  type: string;
  price: string;
  status: 'available' | 'waitlist' | 'coming_soon';
  location: string;
  description: string;
  href: string;
  badges: VerificationBadge[];
  live: boolean;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function gincStatus(status: string): MarketplaceListing['status'] | null {
  if (status === 'available') return 'available';
  if (status === 'rented') return 'waitlist';
  return null; // 'sold' / 'unavailable' listings are not shown
}

function gincPrice(listing: { price: string; period: string }): string {
  const price = text(listing.price);
  const period = text(listing.period);
  if (!price) return 'Submit for quote';
  return period ? `${price}/${period}` : price;
}

// Only GINC member-published listings are marketplace records. The
// canonical `assets` table holds private customer maintenance assets —
// never publish those as listings, and never claim a verification badge
// a record has not earned (GINC members are self-reported).
async function liveListings(): Promise<MarketplaceListing[]> {
  const network = await loadNetwork().catch(() => ({ members: [], listings: [], jobs: [] }));

  const listings: MarketplaceListing[] = [];

  for (const l of network.listings) {
    const status = gincStatus(l.status);
    if (!status) continue;
    listings.push({
      id: `ginc-${l.id}`,
      title: l.title,
      category: l.category,
      type: l.assetType,
      price: gincPrice(l),
      status,
      location: [l.city, l.state].filter(Boolean).join(', ') || 'Arizona',
      description: l.description,
      href: '/ginc/network',
      badges: [],
      live: true,
    });
  }

  return listings;
}

export async function loadMarketplaceListings(): Promise<MarketplaceListing[]> {
  return liveListings();
}
