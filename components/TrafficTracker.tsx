'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

function sourceFromReferrer(referrer: string): string {
  if (!referrer) return 'direct';
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (hostname.includes('google.')) return 'google';
    if (hostname.includes('bing.')) return 'bing';
    if (hostname.includes('linkedin.')) return 'linkedin';
    if (hostname.includes('facebook.') || hostname.includes('fb.')) return 'facebook';
    if (hostname.includes('reddit.')) return 'reddit';
    return hostname;
  } catch {
    return 'referral';
  }
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'already-here-session-id';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(key, created);
  return created;
}

export function TrafficTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;

    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    const timestamp = new Date().toISOString();
    const data = {
      page: pathname,
      referrer,
      timestamp,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    fetch('/api/traffic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {});

    fetch('/api/revenue-command-spine/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: sourceFromReferrer(referrer),
        module: 'website',
        action: 'page_view',
        pagePath: pathname,
        sessionId: getSessionId(),
        occurredAt: timestamp,
        metadata: { hasReferrer: Boolean(referrer) }
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
