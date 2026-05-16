import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Capability Statement | SDVOSB-Eligible Field Execution — Already Here LLC';
const description = 'Capability statement for Already Here LLC: SDVOSB-eligible Arizona onsite infrastructure execution for MSPs, government primes, vendors, and rollout programs.';

export const metadata: Metadata = {
  openGraph: {
    title,
    description,
    url: '/capability-statement',
    siteName: 'Already Here LLC',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description
  }
};

export default function CapabilityStatementLayout({ children }: { children: ReactNode }) {
  return children;
}
