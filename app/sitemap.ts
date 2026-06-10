import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';
import { getAllPosts } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.endsWith('/') ? siteConfig.url.slice(0, -1) : siteConfig.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`,                        lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/ai-agent`,                lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.95 },
    { url: `${base}/revenue-mesh`,            lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.92 },
    { url: `${base}/ai-agent-demo`,           lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/ai-agent-ebook`,          lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/ai-agent-resources`,      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/services`,                lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/who-we-serve`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/dispatch`,                lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/rfq`,                     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/coverage`,                lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/project-gallery`,         lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/capability-statement`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog`,                    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.7 },
    { url: `${base}/service-area`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/for-agencies-service-providers`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`,                 lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ];

  const posts = getAllPosts();
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes];
}
