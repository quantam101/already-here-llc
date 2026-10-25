import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';
import { getIndexablePosts } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.endsWith('/') ? siteConfig.url.slice(0, -1) : siteConfig.url;

  const staticRoutes: MetadataRoute.Sitemap = [
    // Core
    { url: `${base}/`,                                    changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/services-catalog`,                   changeFrequency: 'monthly', priority: 0.75 },
    { url: `${base}/services`,                            changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/who-we-serve`,                        changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/enterprise`,                          changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/government-contracting`,              changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/industries`,                          changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/for-agencies-service-providers`,      changeFrequency: 'monthly', priority: 0.8 },

    // Dispatch & intake
    { url: `${base}/emergency-dispatch`,                  changeFrequency: 'weekly',  priority: 0.95 },
    { url: `${base}/dispatch`,                            changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/rfq`,                                 changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/coverage`,                            changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/service-area`,                        changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/request-coverage`,                    changeFrequency: 'monthly', priority: 0.7 },

    // Services & products
    { url: `${base}/operations-products`,                 changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/rollout-support`,                     changeFrequency: 'monthly', priority: 0.75 },
    { url: `${base}/arizona-field-coverage`,              changeFrequency: 'monthly', priority: 0.75 },

    // Tools & resources
    { url: `${base}/field-operations-workflow-review`,    changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/equipment-lifecycle-assessment`,      changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/field-operations-template-library`,   changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/capability-statement`,                changeFrequency: 'monthly', priority: 0.75 },
    { url: `${base}/project-gallery`,                     changeFrequency: 'weekly',  priority: 0.7 },

    // Network & partnerships
    { url: `${base}/partner-with-us`,                     changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/technician-network`,                  changeFrequency: 'monthly', priority: 0.8 },

    { url: `${base}/self-hosted-solutions`,              changeFrequency: 'monthly', priority: 0.85 },


    // Phoenix commercial cabling campaign
    { url: `${base}/phoenix-cabling-checklist`, changeFrequency: 'monthly', priority: 0.8 },

    // AI / lead capture
    { url: `${base}/ai-agent`,                            changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/ai-agent-demo`,                       changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/ai-agent-resources`,                  changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/ai-lead-capture`,                     changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/ai-receptionist`,                     changeFrequency: 'monthly', priority: 0.8 },

    // Blog & contact
    { url: `${base}/blog`,                                changeFrequency: 'daily',   priority: 0.75 },
    { url: `${base}/contact`,                             changeFrequency: 'monthly', priority: 0.7 },

    // Legal
    { url: `${base}/privacy`,                             changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/terms`,                         changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/gdpr`,                          changeFrequency: 'yearly',  priority: 0.3 },
  ];

  const posts = getIndexablePosts();
  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.65,
  }));

  return [...staticRoutes, ...blogRoutes];
}
