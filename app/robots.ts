import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';
import { PROTECTED_PREFIXES } from '@/lib/route-policy';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', ...PROTECTED_PREFIXES]
    },
    sitemap: [`${siteConfig.url}/sitemap.xml`, `${siteConfig.url}/content/sitemap.xml`],
    host: siteConfig.url
  };
}
