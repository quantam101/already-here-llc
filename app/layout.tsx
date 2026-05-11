import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Already Here LLC | Onsite Infrastructure Execution',
    template: '%s | Already Here LLC'
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    'onsite infrastructure execution',
    'technical field operations',
    'MSP smart hands support',
    'vendor field execution',
    'multi-site rollout support',
    'POS field support',
    'network field support',
    'site surveys',
    'IT field technician',
    'SDVOSB IT services',
    'veteran owned IT services',
    'Phoenix field service',
    'nationwide project field support'
  ],
  openGraph: {
    title: 'Already Here LLC | Onsite Infrastructure Execution',
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Already Here LLC | Onsite Infrastructure Execution',
    description: siteConfig.description
  }
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Already Here LLC',
  description: siteConfig.description,
  url: siteConfig.url,
  telephone: siteConfig.phoneHref.replace('tel:', ''),
  email: siteConfig.email,
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
    'Phoenix, AZ',
    'Tempe, AZ',
    'Mesa, AZ',
    'Chandler, AZ',
    'Scottsdale, AZ',
    'Glendale, AZ',
    'Peoria, AZ',
    'Surprise, AZ',
    'Goodyear, AZ',
    'Avondale, AZ',
    'Gilbert, AZ',
    'Arizona',
    'United States project coverage by scope'
  ],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '07:00',
    closes: '20:00'
  },
  knowsAbout: [
    'SDVOSB',
    'Veteran-Owned Small Business',
    'Field Service Management',
    'MSP Smart Hands',
    'IT Field Services',
    'POS Support',
    'Infrastructure Deployment'
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Field Execution Services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'MSP Smart-Hands Support' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Infrastructure Field Work' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'POS and Kiosk Support' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Healthcare-Adjacent Field Execution' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Rollout and Modernization Support' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Site Surveys and Verification' } }
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
