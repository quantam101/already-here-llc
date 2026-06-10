import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HomeAiAgentAwareness } from '@/components/HomeAiAgentAwareness';
import { TrafficTracker } from '@/components/TrafficTracker';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
    template: '%s | Already Here LLC'
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    'onsite IT field execution',
    'technical field operations',
    'onsite infrastructure execution',
    'MSP smart hands support',
    'network troubleshooting',
    'rollout recovery',
    'commercial IT field support',
    'retail infrastructure support',
    'government contractor IT services',
    'SAM.gov registered IT contractor',
    'field support for critical systems',
    'vendor field execution',
    'Arizona onsite IT field execution',
    'Phoenix technical field operations',
    'AI website chatbox setup',
    'AI lead capture agent',
    'small business AI agent setup'
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
    'Goodyear, AZ', 'Avondale, AZ', 'Gilbert, AZ', 'Arizona',
    'United States project-based field engagements'
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
    'AI Website Chatbox Setup',
    'AI Lead Capture Agent',
    'SAM.gov Registered Contractor'
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Technical Field Operations, Infrastructure Execution, and AI Lead Capture Services',
    itemListElement: [
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Technical Field Operations' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Onsite Infrastructure Execution' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'MSP Smart Hands Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Network Troubleshooting' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Rollout Recovery and Remediation' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Infrastructure Assessment' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'AI Website Chatbox and Lead Capture Agent Setup' } }
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
        <TrafficTracker />
        <Header />
        <main>{children}</main>
        <HomeAiAgentAwareness />
        <Footer />
      </body>
    </html>
  );
}
