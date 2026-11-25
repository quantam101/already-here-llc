export function contentSecurityPolicy(nodeEnv = process.env.NODE_ENV): string {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    'https://cloud.umami.is',
    'https://www.googletagmanager.com'
  ];

  // React development tooling uses eval for richer debugging. Neither React
  // nor Next.js needs eval in production, so production does not allow it.
  if (nodeEnv !== 'production') scriptSources.splice(2, 0, "'unsafe-eval'");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.google-analytics.com https://*.google-analytics.com",
    "font-src 'self'",
    "connect-src 'self' https://cloud.umami.is https://www.google-analytics.com https://*.google-analytics.com https://region1.google-analytics.com",
    "media-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'"
  ];

  if (nodeEnv === 'production') directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}
