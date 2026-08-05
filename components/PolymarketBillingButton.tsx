'use client';

import { useState } from 'react';

export function PolymarketBillingButton({ sessionId, customerId, children }: { sessionId?: string; customerId?: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!sessionId && !customerId) {
      alert('Billing session not available. Subscribe first or contact support.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/polymarket-tracker/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, customerId })
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
      if (!response.ok || !payload?.url) throw new Error(payload?.message || 'Billing portal could not be opened.');
      window.location.href = payload.url;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Billing portal could not be opened.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="link-ring inline-flex w-full items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? 'Redirecting...' : children}
    </button>
  );
}
