'use client';

import { FormEvent, useState } from 'react';

export function GincJoinForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/ginc/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await response.json().catch(() => null)) as { message?: string; member?: { id: string } } | null;
      if (!response.ok) throw new Error(data?.message || 'Profile could not be created.');
      setMessage(`Profile created. Reference: ${data?.member?.id ?? 'pending'}`);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile could not be created.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card mt-10 max-w-2xl p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          I am a <span className="text-action">*</span>
          <select name="type" required defaultValue="" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            <option value="" disabled>Select one</option>
            <option value="owner">Owner with an asset or vehicle</option>
            <option value="renter">Renter looking for something</option>
            <option value="worker">Worker looking for jobs</option>
            <option value="business">Business needing people or assets</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Full name <span className="text-action">*</span>
          <input name="fullName" required maxLength={120} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Email <span className="text-action">*</span>
          <input name="email" type="email" required maxLength={160} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Phone <span className="text-action">*</span>
          <input name="phone" type="tel" required maxLength={40} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          City <span className="text-action">*</span>
          <input name="city" required maxLength={120} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          State <span className="text-action">*</span>
          <input name="state" required defaultValue="Arizona" maxLength={40} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy md:col-span-2">
          ZIP code
          <input name="zip" maxLength={20} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy md:col-span-2">
          Skills, assets, or what you are looking for
          <textarea name="skills" rows={3} maxLength={1500} className="link-ring w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy md:col-span-2">
          Bio / business description
          <textarea name="bio" rows={3} maxLength={3000} className="link-ring w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
      </div>

      <button type="submit" disabled={submitting} className="mt-6 inline-flex rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-navy disabled:opacity-50">
        {submitting ? 'Creating profile...' : 'Create profile'}
      </button>

      {message ? <p className="mt-4 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
    </form>
  );
}
