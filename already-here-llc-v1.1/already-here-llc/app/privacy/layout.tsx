import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Privacy Policy | Already Here LLC';
const description = 'Privacy policy for Already Here LLC dispatch intake, contact information, and onsite infrastructure execution service inquiries.';

export const metadata: Metadata = {
  openGraph: {
    title,
    description,
    url: '/privacy',
    siteName: 'Already Here LLC',
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title,
    description
  }
};

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
