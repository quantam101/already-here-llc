import type { Metadata } from 'next';

import { requirePageAuth } from '@/lib/ahfos/auth';
import { DispatcherBoard } from '@/components/ahfos/DispatcherBoard';

export const metadata: Metadata = {
  title: 'Dispatcher Board | AHFOS',
  alternates: { canonical: '/dispatch-board' },
};

export default async function DispatchBoardPage() {
  await requirePageAuth(['admin', 'dispatcher', 'project_manager', 'office_manager']);

  return <DispatcherBoard />;
}
