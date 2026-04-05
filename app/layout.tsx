import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Already Here LLC | Arizona Field Execution Partner',
    template: '%s | Already Here LLC'
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    'Phoenix field service',
    'Arizona dispatch support',
    'onsite execution partner',
    'rollout support Arizona',
    'POS field support',
    'network field support',
    'site surveys Arizona'
  ],
  openGraph: {
    title: 'Already Here LLC | Arizona Field Execution Partner',
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Already Here LLC | Arizona Field Execution Partner',
    description: siteConfig.description
  },
  alternates: {
    canonical: '/'
  }
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: siteConfig.name,
  areaServed: 'Arizona',
  description: siteConfig.description,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Phoenix',
    addressRegion: 'AZ',
    addressCountry: 'US'
  },
  url: siteConfig.url
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
