import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decideRoute, isAuthorizedBasic } from './lib/route-policy';

function applySecurityHeaders(response: NextResponse) {
  // Keep the default policy restrictive while explicitly allowing the two
  // analytics providers used by the production site. GA4 remains inert unless
  // NEXT_PUBLIC_GA4_MEASUREMENT_ID contains an authorized G-... stream ID.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cloud.umami.is https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.google-analytics.com https://*.google-analytics.com",
    "font-src 'self'",
    "connect-src 'self' https://cloud.umami.is https://www.google-analytics.com https://*.google-analytics.com https://region1.google-analytics.com",
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Request-Id', crypto.randomUUID());
  return response;
}

function markPrivate(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export function proxy(request: NextRequest) {
  const decision = decideRoute(request.nextUrl.pathname);

  if (decision.kind === 'retired') {
    const target = request.nextUrl.clone();
    target.pathname = decision.to;
    target.search = '';
    return applySecurityHeaders(NextResponse.redirect(target, 308));
  }

  if (decision.kind === 'protected') {
    const password = process.env.OPS_PORTAL_PASSWORD ?? '';
    const user = process.env.OPS_PORTAL_USER || 'ops';

    // Fail closed: with no password configured, internal views do not exist.
    if (!password) {
      return applySecurityHeaders(markPrivate(new NextResponse('Not found', { status: 404 })));
    }

    if (!isAuthorizedBasic(request.headers.get('authorization'), user, password)) {
      const challenge = new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Already Here Operations", charset="UTF-8"' }
      });
      return applySecurityHeaders(markPrivate(challenge));
    }

    return applySecurityHeaders(markPrivate(NextResponse.next()));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)']
};
