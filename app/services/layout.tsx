import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Managed IT Services & Technical Field Operations | Already Here LLC';
const description = 'Phoenix-based managed service provider (MSP) delivering managed IT support, help desk services, network and systems administration, security, cloud and endpoint support, plus onsite technical field operations, rollouts, break/fix, and remediation.';

export const metadata: Metadata = {
  openGraph: {
    title,
    description,
    url: '/services',
    siteName: 'Already Here LLC',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description
  }
};

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return children;
}
