import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Already Here LLC | Arizona Onsite Infrastructure Execution',
    template: '%s | Already Here LLC'
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    'Arizona onsite IT field execution',
    'Phoenix technical field operations',
    'onsite infrastructure execution Arizona',
    'MSP smart hands Phoenix',
    'network troubleshooting Arizona',
    'rollout recovery Arizona',
    'commercial IT field support Phoenix',
    'retail infrastructure support Arizona',
    'government contractor IT services Arizona',
    'SDVOSB IT services Arizona',
    'SAM.gov registered IT contractor Phoenix',
    'field support for critical systems',
    'vendor field execution Arizona'
  ]
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Already Here LLC',
  description: siteConfig.description,
  url: siteConfig.url,
  telephone: siteConfig.phoneHref.replace('tel:', ''),
  email: siteConfig.email,
  slogan: siteConfig.tagline,
  address: {
    '@type': 'PostalAddress',
    streetAddress: '429 N 18th Dr',
    addressLocality: 'Phoenix',
    addressRegion: 'AZ',
    postalCode: '85007',
    addressCountry: 'US'
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 33.4484,
    longitude: -112.0740
  },
  areaServed: [
    'Phoenix, AZ', 'Tempe, AZ', 'Mesa, AZ', 'Chandler, AZ',
    'Scottsdale, AZ', 'Glendale, AZ', 'Peoria, AZ', 'Surprise, AZ',
    'Goodyear, AZ', 'Avondale, AZ', 'Gilbert, AZ', 'Arizona'
  ],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '07:00',
    closes: '20:00'
  },
  knowsAbout: [
    'Onsite Infrastructure Execution',
    'Technical Field Operations',
    'MSP Smart Hands',
    'Network Troubleshooting',
    'Rollout Recovery',
    'Retail Technology Support',
    'Critical Systems Field Support',
    'SDVOSB',
    'SAM.gov Registered Contractor'
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Technical Field Operations and Infrastructure Execution Services',
    itemListElement: [
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Technical Field Operations' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Onsite Infrastructure Execution' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'MSP Smart Hands Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Network Troubleshooting' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Rollout Recovery and Remediation' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Infrastructure Assessment' } }
    ]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
