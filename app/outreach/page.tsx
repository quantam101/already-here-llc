import type { Metadata } from 'next';
import { getCanonicalStore } from '@/lib/canonical-store';
import OutreachClient from './OutreachClient';

export const metadata: Metadata = {
  title: 'Outreach Pipeline',
  description: 'Warm customers, prospects, partners, and technician recruiting for Already Here LLC.',
  alternates: { canonical: '/outreach' }
};

export const dynamic = 'force-dynamic';

export default async function OutreachPage() {
  const records = await getCanonicalStore().queryTable('outreach', 50);
  return <OutreachClient initialRecords={records as unknown as Record<string, unknown>[]} />;
}
