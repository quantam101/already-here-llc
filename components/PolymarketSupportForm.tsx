'use client';

import { useState } from 'react';

export function PolymarketSupportForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get('email')),
      subject: String(formData.get('subject')),
      message: String(formData.get('message')),
      plan: String(formData.get('plan'))
    };

    try {
      const response = await fetch('/api/polymarket-tracker/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(data.message || 'Ticket submission failed.');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ticket submission failed.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="card mt-10 max-w-xl p-8" data-proof-surface>
        <h2 className="text-xl font-semibold text-navy">Ticket received</h2>
        <p className="mt-3 text-sm text-slate-600">
          We have logged your request and will reply to the email you provided. Enterprise customers can also reach their
          assigned channel.
        </p>
        <a href="/polymarket-tracker" className="link-ring mt-6 inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy">
          Back to Polymarket Tracker
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-10 max-w-xl p-8" data-proof-surface>
      <div className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email address</label>
          <input id="email" name="email" type="email" required className="mt-1 block w-full rounded-md border border-borderBrand px-3 py-2 text-sm focus:border-action focus:outline-none" />
        </div>
        <div>
          <label htmlFor="plan" className="block text-sm font-medium text-slate-700">Plan</label>
          <select id="plan" name="plan" className="mt-1 block w-full rounded-md border border-borderBrand px-3 py-2 text-sm focus:border-action focus:outline-none">
            <option value="free">Free alert feed</option>
            <option value="pro">Pro Tracker</option>
            <option value="enterprise">Enterprise Node</option>
          </select>
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-slate-700">Subject</label>
          <input id="subject" name="subject" type="text" required className="mt-1 block w-full rounded-md border border-borderBrand px-3 py-2 text-sm focus:border-action focus:outline-none" />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700">Message</label>
          <textarea id="message" name="message" rows={5} required className="mt-1 block w-full rounded-md border border-borderBrand px-3 py-2 text-sm focus:border-action focus:outline-none" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="link-ring inline-flex w-full items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Sending...' : 'Submit ticket'}
        </button>
      </div>
    </form>
  );
}
