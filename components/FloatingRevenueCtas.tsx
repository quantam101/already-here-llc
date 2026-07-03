'use client';

import Link from 'next/link';

export function FloatingRevenueCtas() {
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-3xl border border-white/15 bg-[#071B34]/95 p-3 shadow-2xl backdrop-blur md:bottom-5 md:p-4">
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
