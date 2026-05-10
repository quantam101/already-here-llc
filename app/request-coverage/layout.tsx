import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Request Regional Coverage | Already Here LLC';
const description = 'Request Arizona regional coverage review for bundled visits, recurring field support, rollout projects, smart hands, and rework coverage.';

export const metadata: Metadata = {
  openGraph: {
    title,
    description,
    url: '/request-coverage',
    siteName: 'Already Here LLC',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description
  }
};

export default function RequestCoverageLayout({ children }: { children: ReactNode }) {
  return children;
}
