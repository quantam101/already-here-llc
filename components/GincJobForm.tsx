'use client';

import { FormEvent, useState } from 'react';
import { gincAssetTypes, gincCategories } from '@/lib/ginc';

export function GincJobForm() {
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
      const response = await fetch('/api/ginc/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await response.json().catch(() => null)) as { message?: string; job?: { id: string } } | null;
      if (!response.ok) throw new Error(data?.message || 'Job could not be posted.');
      setMessage(`Job posted. Reference: ${data?.job?.id ?? 'pending'}`);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Job could not be posted.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card mt-10 max-w-2xl p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
      <p className="text-sm text-slate-600">
        If you already have a member ID, enter it below. Otherwise fill out your profile information and we will create one for you.
      </p>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy md:col-span-2">
          Member ID (if you already joined)
          <input name="memberId" maxLength={40} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
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
        <label className="grid gap-2 text-sm font-medium text-navy">
          ZIP code
          <input name="zip" maxLength={20} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          I am a <span className="text-action">*</span>
          <select name="type" required defaultValue="business" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            <option value="business">Business needing people or assets</option>
            <option value="worker">Worker looking for jobs</option>
            <option value="owner">Owner with an asset</option>
            <option value="renter">Renter looking for something</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Category <span className="text-action">*</span>
          <select name="category" required defaultValue="" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            <option value="" disabled>Select a category</option>
            {gincCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Asset / need type <span className="text-action">*</span>
          <select name="assetType" required defaultValue="" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            <option value="" disabled>Select an asset type</option>
            {gincAssetTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy md:col-span-2">
          Job title <span className="text-action">*</span>
          <input name="title" required maxLength={200} placeholder="e.g. Roof tear-off helper + trailer needed" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Schedule <span className="text-action">*</span>
          <input name="schedule" required maxLength={300} placeholder="e.g. Weekends and some weekdays" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Budget
          <input name="budget" maxLength={80} placeholder="e.g. $200/day" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy md:col-span-2">
          Description
          <textarea name="description" rows={4} maxLength={3000} placeholder="Scope, duration, tools or vehicle needed, and whether this could become regular work." className="link-ring w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
      </div>

      <button type="submit" disabled={submitting} className="mt-6 inline-flex rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-navy disabled:opacity-50">
        {submitting ? 'Posting job...' : 'Post work need'}
      </button>

      {message ? <p className="mt-4 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
    </form>
  );
}
