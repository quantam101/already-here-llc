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

const mspDescription = 'Already Here LLC is a Phoenix-based managed service provider (MSP) with 30+ years of IT experience delivering managed IT support, help desk services, network and systems administration, Microsoft 365 and cloud support, identity and access support, security hardening, infrastructure services, projects, and onsite technical field operations.';

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
    'business IT support Phoenix',
    'IT help desk services',
    'remote IT support',
    'co-managed IT services',
    'network administration',
    'systems administration',
    'managed network services',
    'Microsoft 365 support',
    'cloud infrastructure support',
    'identity and access support',
    'endpoint management',
    'IT security services Phoenix',
    'cybersecurity support Phoenix',
    'firewall support',
    'IT strategy and planning',
    'IT vendor management',
    'onsite IT support Phoenix',
    'technical field operations',
    'smart hands support',
    'network troubleshooting',
    'rollout and remediation support',
    'commercial IT support',
    'retail technology support',
    'data center support',
    'government contractor IT services',
    'SAM.gov registered IT contractor',
    'RFID field support',
    'asset tracking field support',
    'IT asset recovery',
    'store decommissioning support'
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
    'Co-Managed IT Services',
    'IT Help Desk and Remote Support',
    'Network Administration',
    'Systems Administration',
    'Endpoint Management',
    'Microsoft 365 and Cloud Support',
    'Identity and Access Support',
    'IT Security and Firewall Support',
    'IT Strategy and Vendor Coordination',
    'Onsite Infrastructure Execution',
    'Technical Field Operations',
    'Smart Hands',
    'Network Troubleshooting',
    'Rollout Recovery',
    'Retail Technology Support',
    'RFID Field Support',
    'Asset Tracking Field Support',
    'IT Asset Recovery',
    'Store Decommissioning Support',
    'Critical Systems Field Support',
    'SAM.gov Registered Contractor'
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Managed IT Services, Security, Cloud, Infrastructure, Projects, and Technical Field Operations',
    itemListElement: [
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Managed IT Services' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Co-Managed IT Services' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Help Desk and Remote IT Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Network and Systems Administration' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Microsoft 365, Cloud, Identity, and Endpoint Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'IT Security, Firewall, and Security Hardening Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'IT Strategy, Projects, and Vendor Coordination' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Onsite IT and Technical Field Operations' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Smart Hands and Infrastructure Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Network Troubleshooting and Remediation' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Rollout, Refresh, and Multi-Site Project Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'RFID, Barcode, and Asset Tracking Field Support' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Store Decommissioning, IT Asset Recovery, and Return Logistics' } }
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
