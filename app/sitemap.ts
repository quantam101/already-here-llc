export default function sitemap() {
  const BASE = 'https://www.alreadyherellc.com'
  return [
    { url: BASE,                            lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/services`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/who-we-serve`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/coverage`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/capability-statement`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/project-gallery`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/rfq`,                  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/dispatch`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/blog`,                 lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/privacy`,              lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
