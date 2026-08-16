import type { Metadata } from 'next';
import { getCanonicalStore } from '@/lib/canonical-store';
import FollowupsClient from './FollowupsClient';

export const metadata: Metadata = {
  title: 'Follow-ups',
  description: 'Open, in-progress, and overdue follow-ups from canonical intake and outreach.',
  alternates: { canonical: '/followups' }
};

export const dynamic = 'force-dynamic';

export default async function FollowupsPage() {
  const records = await getCanonicalStore().queryTable('followups', 1000);
  return <FollowupsClient initialRecords={records as unknown as Record<string, unknown>[]} />;
}
