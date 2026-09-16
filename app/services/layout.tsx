import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Managed IT Services, Security, Cloud & Field Support | Already Here LLC';
const description = 'Phoenix managed IT services backed by 30+ years of hands-on IT experience, including help desk, networks, systems, Microsoft 365, cloud, identity, security, projects, and onsite technical support.';

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
