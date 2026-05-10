import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Request Dispatch | Already Here LLC';
const description = 'Submit onsite infrastructure execution, smart hands, rollout recovery, and technical field operations requests for Arizona commercial and MSP sites.';

export const metadata: Metadata = {
  openGraph: {
    title,
    description,
    url: '/dispatch',
    siteName: 'Already Here LLC',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description
  }
};

export default function DispatchLayout({ children }: { children: ReactNode }) {
  return children;
}
