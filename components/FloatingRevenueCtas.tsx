'use client';

import Link from 'next/link';
import { useState } from 'react';

export function FloatingRevenueCtas() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-3xl border border-white/15 bg-[#071B34]/95 p-3 shadow-2xl backdrop-blur md:bottom-5 md:p-4">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden="true">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div className="grid gap-2 md:grid-cols-[1.15fr_0.85fr_0.85fr] md:items-center">
        <div className="hidden text-sm leading-6 text-white/85 md:block">
          <span className="font-semibold text-white">Need a Phoenix technician today?</span>{' '}
          Same-day smart hands, POS, network, camera/cabling, AV, printer, access-control, and closeout-heavy dispatch support.
        </div>
        <Link href="/emergency-dispatch" className="link-ring inline-flex items-center justify-center rounded-2xl bg-[#1B66FF] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white hover:text-[#071B34]">
          Request Same-Day Dispatch
        </Link>
        <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-2xl border border-white/35 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10">
          Standard Dispatch Intake
        </Link>
      </div>
    </div>
  );
}
