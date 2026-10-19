/**
 * Route policy for the public site.
 *
 * - PROTECTED routes are internal operator views. They require HTTP Basic
 *   auth against OPS_PORTAL_PASSWORD. If that variable is unset the routes
 *   return 404 (fail closed), so nothing internal is ever served by accident.
 * - RETIRED routes are off-brand offers removed from the public site. They
 *   permanently redirect to the closest on-brand page. Their code is kept so
 *   the change is reversible by deleting an entry here.
 *
 * API routes (/api/*) are not covered here; they keep their own secrets.
 */

export const PROTECTED_PREFIXES = [
  '/command-center',
  '/admin',
  '/dashboard',
  '/revenue-command',
  '/daily-command',
  '/revenue-mesh',
  '/followups',
  '/outreach',
  '/profitengine',
  '/network'
] as const;

export const RETIRED_ROUTES: ReadonlyArray<{ prefix: string; to: string }> = [
  { prefix: '/scooter-rentals', to: '/' },
  { prefix: '/ginc', to: '/' },
  { prefix: '/marketplace', to: '/' },
  { prefix: '/mobility', to: '/' },
  { prefix: '/fleet-marketplace', to: '/' },
  { prefix: '/connect', to: '/technician-network' },
  { prefix: '/autoworks', to: '/services' },
  { prefix: '/asi-revenue-intelligence', to: '/services' },
  { prefix: '/ai-agent-ebook', to: '/ai-agent' }
];

export type RouteDecision =
  | { kind: 'protected' }
  | { kind: 'retired'; to: string }
  | { kind: 'public' };

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function decideRoute(pathname: string): RouteDecision {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const lower = path.toLowerCase();

  for (const prefix of PROTECTED_PREFIXES) {
    if (matchesPrefix(lower, prefix)) return { kind: 'protected' };
  }
  for (const route of RETIRED_ROUTES) {
    if (matchesPrefix(lower, route.prefix)) return { kind: 'retired', to: route.to };
  }
  return { kind: 'public' };
}

function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Returns true when the Authorization header carries valid Basic credentials.
 * The username must match `expectedUser`; the password must match `expectedPassword`.
 */
export function isAuthorizedBasic(
  authorization: string | null | undefined,
  expectedUser: string,
  expectedPassword: string
): boolean {
  if (!authorization || !expectedPassword) return false;
  const [scheme, encoded] = authorization.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) return false;

  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return false;
  const user = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);

  const userOk = timingSafeEqual(user, expectedUser);
  const passwordOk = timingSafeEqual(password, expectedPassword);
  return userOk && passwordOk;
}
