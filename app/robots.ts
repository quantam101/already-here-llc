import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';
import { PROTECTED_PREFIXES } from '@/lib/route-policy';

// Mirror route-policy's matchesPrefix exactly: block "/x" and "/x/…" only.
// A bare "/x" rule would also block unrelated public paths like "/x-y".
const protectedRules = PROTECTED_PREFIXES.flatMap((prefix) => [`${prefix}$`, `${prefix}/`]);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /_next/ must stay crawlable so Google can render CSS, JS and images.
      disallow: ['/api/', ...protectedRules]
    },
    sitemap: [`${siteConfig.url}/sitemap.xml`, `${siteConfig.url}/content/sitemap.xml`]
  };
}
