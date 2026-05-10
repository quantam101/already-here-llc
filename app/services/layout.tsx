import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Services | Already Here LLC';
const description = 'Onsite infrastructure execution, smart hands, network troubleshooting, rollout recovery, and technical field operations for Arizona MSPs, vendors, and commercial sites.';

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
