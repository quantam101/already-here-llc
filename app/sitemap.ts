import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';
import { getAllPosts } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.endsWith('/') ? siteConfig.url.slice(0, -1) : siteConfig.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    // Core
    { url: `${base}/`,                                    lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/services`,                            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/who-we-serve`,                        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/enterprise`,                          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/government-contracting`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/industries`,                          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/for-agencies-service-providers`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },

    // Dispatch & intake
    { url: `${base}/emergency-dispatch`,                  lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.95 },
    { url: `${base}/dispatch`,                            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/rfq`,                                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/coverage`,                            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/service-area`,                        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/request-coverage`,                    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },

    // Services & products
    { url: `${base}/operations-products`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/mobility`,                            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/scooter-rentals`,                     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${base}/rollout-support`,                     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${base}/arizona-field-coverage`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${base}/autoworks`,                           lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },

    // Tools & resources
    { url: `${base}/field-operations-workflow-review`,    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/equipment-lifecycle-assessment`,      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/field-operations-template-library`,   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/capability-statement`,                lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${base}/project-gallery`,                     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },

    // Network & partnerships
    { url: `${base}/partner-with-us`,                     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/technician-network`,                  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/ginc`,                                lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${base}/connect`,                             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },

    { url: `${base}/self-hosted-solutions`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },


    // AI / lead capture
    { url: `${base}/ai-agent`,                            lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/ai-agent-demo`,                       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/ai-agent-ebook`,                      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/ai-agent-resources`,                  lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/ai-lead-capture`,                     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/ai-receptionist`,                     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/revenue-mesh`,                        lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },

    // Blog & contact
    { url: `${base}/blog`,                                lastModified: new Date(), changeFrequency: 'daily',   priority: 0.75 },
    { url: `${base}/contact`,                             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },

    // Legal
    { url: `${base}/privacy`,                             lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/terms`,                         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/gdpr`,                          lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ];

  const posts = getAllPosts();
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.65,
  }));

  return [...staticRoutes, ...blogRoutes];
}
