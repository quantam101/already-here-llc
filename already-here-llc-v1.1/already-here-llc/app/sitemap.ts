import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';
import { getAllPosts } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/who-we-serve`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/dispatch`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/capability-statement`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 }
  ];

  const posts = getAllPosts();
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : now,
    changeFrequency: 'monthly',
    priority: 0.7
  }));

  return [...staticRoutes, ...blogRoutes];
}
