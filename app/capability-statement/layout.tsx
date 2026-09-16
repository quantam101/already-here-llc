import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Capability Statement | Managed IT Services & Technical Field Operations - Already Here LLC';
const description = 'Capability statement for Already Here LLC: Phoenix-based managed service provider with 30+ years of IT experience delivering managed IT, networks, systems, cloud, security, projects, and onsite technical field operations.';

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
