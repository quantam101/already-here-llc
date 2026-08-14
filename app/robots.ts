import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', '/profitengine/']
    },
    host: base,
    sitemap: [`${base}/sitemap.xml`, `${base}/content/sitemap.xml`]
  };
}
