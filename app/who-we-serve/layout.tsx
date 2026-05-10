import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Who We Serve | Already Here LLC';
const description = 'Field execution support for MSPs, vendors, government primes, retail operators, and commercial teams that need documented Arizona onsite work.';

export const metadata: Metadata = {
  openGraph: {
    title,
    description,
    url: '/who-we-serve',
    siteName: 'Already Here LLC',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description
  }
};

export default function WhoWeServeLayout({ children }: { children: ReactNode }) {
  return children;
}
