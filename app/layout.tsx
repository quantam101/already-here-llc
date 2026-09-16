import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HomeAiAgentAwareness } from '@/components/HomeAiAgentAwareness';
import { TrafficTracker } from '@/components/TrafficTracker';
import { FloatingRevenueCtas } from '@/components/FloatingRevenueCtas';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { siteConfig } from '@/lib/site';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover'
};

const mspDescription = 'Already Here LLC is a Phoenix-based managed service provider (MSP) delivering managed IT support, help desk services, network and systems administration, security, cloud and endpoint support, plus onsite technical field operations, rollouts, break/fix, remediation, and multi-site project execution.';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Managed IT Services & Technical Field Operations | Already Here LLC',
    template: '%s | Already Here LLC'
  },
  description: mspDescription,
  applicationName: siteConfig.name,
  keywords: [
    'managed IT services Phoenix',
    'managed service provider Phoenix',
    'Phoenix MSP',
    'business IT support',
    'IT help desk services',
    'remote IT support',
    'network administration',
    'systems administration',
    'Microsoft 365 support',
    'cloud infrastructure support',
    'endpoint management',
    'IT security services',
    'firewall management',
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
    'RFID field support',
    'barcode scanner support',
    'asset tracking field support',
    'IT asset recovery',
    'store decommissioning support',
    'return logistics support',
    'AI website chatbox setup',
    'AI lead capture agent',
    'small business AI agent setup'
  ]
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': ['ProfessionalService', 'LocalBusiness'],
  name: 'Already Here LLC',
  description: mspDescription,
  url: siteConfig.url,
  telephone: siteConfig.phoneHref.replace('tel:', ''),
  email: siteConfig.email,
  slogan: 'Managed IT Services + Technical Field Operations',
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
    'United States project-based engagements'
  ],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '07:00',
    closes: '20:00'
  },
  knowsAbout: [
    'Managed IT Services',
    'IT Help Desk and Remote Support',
    'Network Administration',
    'Systems Administration',
    'Endpoint Management',
    'Microsoft 365 and Cloud Support',
    'IT Security and Firewall Support',
    'Onsite Infrastructure Execution',
    'Technical Field Operations',
    'Smart Hands',
    'Network Troubleshooting',
    'Rollout Recovery',
    'Retail Technology Support',
    'RFID Field Support',
    'Barcode Scanner Support',
    'Asset Tracking Field Support',
    'IT Asset Recovery',
    'Store Decommissioning Support',
    'Return Logistics Support',
    'Critical Systems Field Support',
    'AI Website Chatbox Setup',
    'AI Lead Capture Agent',
    'SAM.gov Registered Contractor'
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Managed IT Services, Technical Field Operations, Infrastructure, Security, and Business Technology Services',
    itemListElement: [
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Managed IT Services' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Help Desk and Remote IT Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Network and Systems Administration' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Cloud, Identity, and Endpoint Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'IT Security and Firewall Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Technical Field Operations' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Onsite Infrastructure Execution' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Smart Hands Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Network Troubleshooting' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Rollout Recovery and Remediation' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'RFID, Barcode, and Asset Tracking Field Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Store Decommissioning, IT Asset Recovery, and Return Logistics' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Infrastructure Assessment' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'AI Website Chatbox and Lead Capture Agent Setup' } }
    ]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            defer
            src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ?? 'https://cloud.umami.is/script.js'}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
      </head>
      <body>
        <GoogleAnalytics />
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
        <FloatingRevenueCtas />
      </body>
    </html>
  );
}
