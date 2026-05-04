// lib/site.ts
import type { Metadata } from "next";

export const site = {
  name: "Already Here LLC",
  businessName: "Already Here LLC",
  url: "https://www.alreadyherellc.com",
  email: "dispatch@alreadyherellc.com",
  location: "Phoenix, Arizona",
  city: "Phoenix, Arizona",
  description:
    "Phoenix-based field execution partner for remote teams, MSPs, vendors, healthcare-adjacent operators, agencies, and rollout programs.",
} as const;

export const siteConfig = {
  ...site,
  shortName: "Already Here",
  domain: "alreadyherellc.com",
  serviceArea: [
    "Phoenix",
    "Glendale",
    "Peoria",
    "Surprise",
    "Tempe",
    "Mesa",
    "Chandler",
    "Scottsdale",
    "Gilbert",
    "Goodyear",
    "Avondale",
    "Maricopa County",
    "Arizona",
  ],
} as const;

export const markets = [
  "Phoenix",
  "Glendale",
  "Peoria",
  "Surprise",
  "Tempe",
  "Mesa",
  "Chandler",
  "Scottsdale",
  "Gilbert",
  "Goodyear",
  "Avondale",
  "Maricopa County",
  "Arizona",
] as const;

export const closeoutItems = [
  "Site arrival and departure notes",
  "Before and after photos where allowed",
  "Device, port, serial, or asset details when available",
  "Remote-bridge communication notes",
  "Issue, action, and result summary",
  "Buyer-ready closeout language",
] as const;

export const publicRoutes = [
  {
    path: "/",
    title: "Phoenix Field Execution Partner | Already Here LLC",
    description:
      "Already Here LLC provides Phoenix-based field execution for retail, kiosk, POS, signage, device, networking, rollout, and multi-site support.",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/services",
    title: "Field Execution Services | Already Here LLC",
    description:
      "Review field execution services for retail work, kiosk support, POS support, signage, device support, networking support, rollouts, smart-hands work, and closeout documentation.",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/who-we-serve",
    title: "Who We Serve | Already Here LLC",
    description:
      "Already Here LLC supports remote teams, MSPs, vendors, rollout operators, healthcare-adjacent operators, agencies, and service providers.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/service-area",
    title: "Phoenix and Arizona Service Area | Already Here LLC",
    description:
      "Phoenix-based and Arizona-first onsite field execution coverage with qualified regional and project-based travel support.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/dispatch",
    title: "Dispatch Intake | Already Here LLC",
    description:
      "Submit site, timing, scope, onsite contact, billing contact, and execution details for qualified onsite field execution requests.",
    changeFrequency: "weekly",
    priority: 0.95,
  },
  {
    path: "/request-coverage",
    title: "Request Coverage | Already Here LLC",
    description:
      "Request Phoenix and Arizona field execution coverage for qualified retail, kiosk, POS, signage, networking, rollout, and multi-site support work.",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/for-agencies-service-providers",
    title: "For Agencies and Service Providers | Already Here LLC",
    description:
      "Onsite field execution support for agencies, vendors, service providers, and remote teams that need clean coordination and usable closeout.",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/rollout-support",
    title: "Rollout Support | Already Here LLC",
    description:
      "Structured onsite rollout support for multi-site programs, device swaps, merchandising, documentation, and closeout-sensitive execution.",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Already Here LLC",
    description:
      "Privacy policy for Already Here LLC, including how dispatch and contact information may be handled.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/thank-you",
    title: "Request Received | Already Here LLC",
    description:
      "Confirmation page for submitted Already Here LLC dispatch or coverage requests.",
    changeFrequency: "yearly",
    priority: 0.2,
  },
] as const;

export type PublicRoutePath = (typeof publicRoutes)[number]["path"];

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath === "/" ? site.url : `${site.url}${normalizedPath}`;
}

export function routeFor(path: string) {
  return publicRoutes.find((route) => route.path === path) ?? publicRoutes[0];
}

export function buildMetadata(path: string): Metadata {
  const route = routeFor(path);
  const canonical = absoluteUrl(route.path);

  return {
    metadataBase: new URL(site.url),
    title: route.title,
    description: route.description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: site.name,
      title: route.title,
      description: route.description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: route.title,
      description: route.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.businessName,
      url: site.url,
      email: site.email,
      description: site.description,
      areaServed: [
        {
          "@type": "City",
          name: "Phoenix",
        },
        {
          "@type": "State",
          name: "Arizona",
        },
      ],
    },
    {
      "@type": ["LocalBusiness", "ProfessionalService"],
      "@id": `${site.url}/#localbusiness`,
      name: site.businessName,
      url: site.url,
      email: site.email,
      description: site.description,
      areaServed: [
        {
          "@type": "City",
          name: "Phoenix",
        },
        {
          "@type": "State",
          name: "Arizona",
        },
      ],
      makesOffer: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Field execution support",
            description:
              "Onsite field execution for retail, kiosk, POS, signage, device, networking, rollout, and multi-site support work.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Dispatch intake and closeout support",
            description:
              "Structured dispatch intake, onsite coordination, and documentation-driven closeout support.",
          },
        },
      ],
    },
  ],
} as const;

export function safeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
