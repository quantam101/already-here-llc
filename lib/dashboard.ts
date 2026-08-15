import { getCanonicalStore } from './canonical-store';

const TRACKED_TABLES = [
  'organizations',
  'contacts',
  'leads',
  'opportunities',
  'jobs',
  'dispatches',
  'technicians',
  'vendors',
  'vehicles',
  'repair_orders',
  'hauling_jobs',
  'routes',
  'products',
  'affiliate_links',
  'revenue_events',
  'reviews',
  'proof_of_work'
];

export interface DashboardMetrics {
  generatedAt: string;
  counts: Record<string, number>;
  dispatchReadyTechnicians: number;
  totalRevenueCents: number;
  totalRevenueUsd: number;
  recentRecords: Array<{
    table: string;
    id: string;
    source: string;
    created_at: string;
  }>;
}

export function getDashboardMetrics(): DashboardMetrics {
  const store = getCanonicalStore();
  const counts: Record<string, number> = {};

  for (const table of TRACKED_TABLES) {
    counts[table] = store.queryTable(table, 10000).length;
  }

  const technicians = store.queryTable('technicians', 10000);
  const dispatchReadyTechnicians = technicians.filter(
    (t) => typeof t.dispatch_readiness_score === 'number' && t.dispatch_readiness_score >= 70
  ).length;

  const revenueEvents = store.queryTable('revenue_events', 10000);
  const totalRevenueCents = revenueEvents.reduce((sum, event) => {
    const amount = typeof event.amount_cents === 'number' ? event.amount_cents : 0;
    return sum + (amount > 0 ? amount : 0);
  }, 0);

  const recent = store.queryAll(10).map((record) => ({
    table: String(record.table_name ?? ''),
    id: String(record.id ?? ''),
    source: String(record.source ?? ''),
    created_at: String(record.created_at ?? '')
  }));

  return {
    generatedAt: new Date().toISOString(),
    counts,
    dispatchReadyTechnicians,
    totalRevenueCents,
    totalRevenueUsd: totalRevenueCents / 100,
    recentRecords: recent
  };
}
