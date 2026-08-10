import type { Metadata } from 'next';
import { RevenueDashboardSummary } from '@/components/RevenueDashboardSummary';
import { RevenueCommandMobileSync } from '@/components/RevenueCommandMobileSync';

export const metadata: Metadata = {
  title: 'Revenue Command',
  robots: { index: false, follow: false, nocache: true }
};

export default function RevenueCommandLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <RevenueDashboardSummary />
      <RevenueCommandMobileSync />
      {children}
    </>
  );
}
