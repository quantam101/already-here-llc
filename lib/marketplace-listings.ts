import type { VerificationBadge } from './badges';
import { fleetMarketplaceListings } from './fleet-marketplace';
import { loadNetwork } from './ginc-store';
import { getCanonicalStore } from './canonical-store';

/**
 * Marketplace listing feed — real records first.
 *
 * Live records come from the GINC network (member-published vehicle /
 * equipment / space listings) and the canonical `assets` table (tracked
 * business equipment). The static `fleetMarketplaceListings` entries are
 * category previews marked coming_soon; once a live listing covers a
 * category, the matching preview is dropped so the page shows records,
 * not placeholders.
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

async function liveListings(): Promise<MarketplaceListing[]> {
  const [network, assetRows] = await Promise.all([
    loadNetwork().catch(() => ({ members: [], listings: [], jobs: [] })),
    getCanonicalStore().queryTable('assets', 500).catch(() => [] as Record<string, unknown>[]),
  ]);

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
      badges: ['identity'],
      live: true,
    });
  }

  for (const record of assetRows) {
    const name = text(record.name) || text(record.asset_name) || text(record.equipment_name);
    if (!name) continue;
    const available = text(record.status) === 'available';
    listings.push({
      id: `asset-${text(record.id)}`,
      title: name,
      category: text(record.asset_type) || text(record.equipment_type) || 'Equipment',
      type: text(record.asset_type) || text(record.equipment_type) || 'Equipment',
      price: 'Submit for quote',
      status: available ? 'available' : 'waitlist',
      location: [text(record.city), text(record.state)].filter(Boolean).join(', ') || 'Phoenix metro',
      description: text(record.description) || `${name} — tracked fleet asset.`,
      href: '/marketplace',
      badges: ['inspection'],
      live: true,
    });
  }

  return listings;
}

export async function loadMarketplaceListings(): Promise<MarketplaceListing[]> {
  const live = await liveListings();
  const liveCategories = new Set(live.map((l) => l.category.toLowerCase()));
  const previews: MarketplaceListing[] = fleetMarketplaceListings
    .filter((l) => !liveCategories.has(l.category.toLowerCase()))
    .map((l) => ({ ...l, live: false }));
  return [...live, ...previews];
}
