import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { defaultOgImage } from '@/lib/og';

const title = 'Privacy Policy | Already Here LLC';
const description = 'Privacy policy for Already Here LLC dispatch intake, contact information, and onsite infrastructure execution service inquiries.';

export const metadata: Metadata = {
  openGraph: {
    images: [defaultOgImage],
    title,
    description,
    url: '/privacy',
    siteName: 'Already Here LLC',
    type: 'website'
  },
  twitter: {
    images: [defaultOgImage],
    card: 'summary',
    title,
    description
  }
};

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
