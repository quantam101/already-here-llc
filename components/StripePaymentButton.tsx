'use client';

import { useState } from 'react';

export function StripePaymentButton({
  mode = 'payment',
  amount = 30500,
  rentalId,
  referralCode,
  children
}: {
  mode?: 'payment' | 'subscription';
  amount?: number;
  rentalId?: string;
  referralCode?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, amount, rentalId, referralCode })
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
      if (!response.ok || !payload?.url) throw new Error(payload?.message || 'Checkout could not be started.');
      window.location.href = payload.url;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Checkout could not be started.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-70">
      {loading ? 'Redirecting...' : children}
    </button>
  );
}
