/** @type {import('next').NextConfig} */
const nextConfig = {
  // Jekyll content canonical URLs use trailing slashes. Prevent Next.js from
  // normalizing those proxied paths with a 308 before Vercel rewrites them.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: '/blog/2026-10-19-how-to-package-your-expertise-into-a-productized-service-offer-for-a-2026-side-hustle',
        destination: '/blog/2026-09-25-how-to-turn-your-expertise-into-a-productized-service-offer-in-2026-a-complete-template',
        permanent: true,
      },
      {
        source: '/blog/2026-10-18-how-to-build-a-repeatable-ai-tool-evaluation-scorecard-for-small-business-automation',
        destination: '/blog/2026-10-18-a-step-by-step-scorecard-for-vetting-ai-tools-in-2026',
        permanent: true,
      },
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

