import { siteConfig } from '@/lib/site';

// Default share preview rendered by app/opengraph-image.tsx.
// Next.js drops the inherited file-based image whenever a page defines its own
// `openGraph` or `twitter` object, so every such object spreads this in.
export const defaultOgImage = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: `${siteConfig.name} — Phoenix Managed IT & Onsite Field Operations`
};
