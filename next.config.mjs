// Posts that were indexed on /blog before it merged into /content.
const MOVED_BLOG_SLUGS = [
  'ai-lead-capture-implementation-checklist',
  'ai-website-agent-missed-leads-service-businesses',
  'arizona-field-coverage-retainer-pricing-2026',
  'it-field-technician-phoenix-rollout-support',
  'msp-arizona-bench-without-hiring',
  'msp-smart-hands-phoenix-az',
  'pos-kiosk-support-phoenix',
  'productized-field-services-fixed-price-catalog',
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Jekyll content canonical URLs use trailing slashes. Prevent Next.js from
  // normalizing those proxied paths with a 308 before Vercel rewrites them.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'already-here-llc.vercel.app' }],
        destination: 'https://www.alreadyherellc.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'alreadyherellc.com' }],
        destination: 'https://www.alreadyherellc.com/:path*',
        permanent: true,
      },
      // /blog merged into /content (the Jekyll site). Indexed posts keep their slug.
      ...MOVED_BLOG_SLUGS.flatMap((slug) => [
        { source: `/blog/${slug}`, destination: `/content/posts/${slug}/`, permanent: true },
        { source: `/blog/${slug}/`, destination: `/content/posts/${slug}/`, permanent: true },
      ]),
      { source: '/blog', destination: '/content/', permanent: true },
      { source: '/blog/', destination: '/content/', permanent: true },
      { source: '/blog/:path*', destination: '/content/', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  poweredByHeader: false,
}

export default nextConfig
