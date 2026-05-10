import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Field Service Insights | Already Here LLC';
const description = 'Practical field operations guides for MSP smart hands, onsite infrastructure execution, POS support, rollout recovery, and Arizona dispatch work.';

export const metadata: Metadata = {
  openGraph: {
    title,
    description,
    url: '/blog',
    siteName: 'Already Here LLC',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description
  }
};

export default function BlogLayout({ children }: { children: ReactNode }) {
  return children;
}
