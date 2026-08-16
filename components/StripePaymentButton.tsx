'use client';

import { useState } from 'react';

export interface StripePaymentButtonProps {
  mode?: 'payment' | 'subscription';
  amount?: number;
  priceId?: string;
  quantity?: number;
  productName?: string;
  description?: string;
  customerEmail?: string;
  successPath?: string;
  cancelPath?: string;
  rentalId?: string;
  referralCode?: string;
  metadata?: Record<string, string>;
  children: React.ReactNode;
}

export function StripePaymentButton({
  mode = 'payment',
  amount = 30500,
  priceId,
  quantity = 1,
  productName = 'Already Here service',
  description = '',
  customerEmail,
  successPath = '/dashboard/payments?success=true',
  cancelPath = '/',
  rentalId,
  referralCode,
  metadata,
  children
}: StripePaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          amount,
          priceId,
          quantity,
          productName,
          description,
          customerEmail,
          successPath,
          cancelPath,
          referralCode,
          metadata: { rentalId: rentalId ?? '', ...metadata }
        })
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
