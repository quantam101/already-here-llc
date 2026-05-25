'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const PROFITENGINE_URL = process.env.NEXT_PUBLIC_PROFITENGINE_URL ?? '';

export function TrafficTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (!PROFITENGINE_URL || !pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;

    const data = {
      page: pathname,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      source: 'alreadyherellc.com',
    };

    fetch(`${PROFITENGINE_URL}/api/webhooks/traffic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
