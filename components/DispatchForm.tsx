'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { dispatchTypes } from '@/lib/site';

type SubmitState = {
  error: string | null;
  success: boolean;
};

export function DispatchForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<SubmitState>({ error: null, success: false });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ error: null, success: false });

    const form = event.currentTarget;
    const formData = new FormData(form);

    const requiredFields = ['fullName', 'company', 'email', 'siteCity', 'serviceType', 'message'];

    for (const field of requiredFields) {
      const value = formData.get(field);
      if (typeof value !== 'string' || value.trim().length === 0) {
        setState({
          error: 'Complete all required dispatch fields before submitting.',
          success: false
        });
        return;
      }
    }

    const email = formData.get('email');
    if (typeof email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState({
        error: 'Use a valid business email address.',
        success: false
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/dispatch', {
        method: 'POST',
        body: formData
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || 'Dispatch request could not be submitted.');
      }

      form.reset();
      setState({ error: null, success: true });
      router.push('/thank-you');
    } catch (error) {
      setState({
        error: error instanceof Error ? error.message : 'Dispatch request could not be submitted.',
        success: false
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="card p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          Full name <span className="text-action">*</span>
          <input
            name="fullName"
            autoComplete="name"
            required
            className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
            placeholder="Primary onsite contact"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-navy">
          Company <span className="text-action">*</span>
          <input
            name="company"
            autoComplete="organization"
            required
            className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
            placeholder="Vendor, MSP, operator, or client company"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-navy">
          Business email <span className="text-action">*</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
            placeholder="you@company.com"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-navy">
          Phone
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
            placeholder="Direct callback number"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-navy">
          Site city <span className="text-action">*</span>
          <input
            name="siteCity"
            required
            className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
            placeholder="Phoenix, Chandler, Mesa, etc."
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-navy">
          Site ZIP
          <input
            name="siteZip"
            inputMode="numeric"
            pattern="[0-9]{5}"
            className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
            placeholder="Optional ZIP"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-navy">
          Service type <span className="text-action">*</span>
          <select
            name="serviceType"
            required
            defaultValue=""
            className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink"
          >
            <option value="" disabled>
              Select a service type
            </option>
            {dispatchTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-navy">
          Requested date / window
          <input
            name="requestedWindow"
            className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
            placeholder="Date, time window, or due-by requirement"
          />
        </label>
      </div>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Scope / ticket number
        <input
          name="ticketNumber"
          className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
          placeholder="WO / dispatch / ticket reference"
        />
      </label>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Scope, scheduling notes, and site details <span className="text-action">*</span>
        <textarea
          name="message"
          required
          rows={7}
          className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400"
          placeholder="Scope summary, arrival instructions, site conditions, hardware details, and anything that affects dispatch planning. For screenshots, manuals, or project files, paste a Google Drive, Dropbox, or OneDrive link here."
        />
      </label>

      <div className="mt-6 rounded-2xl border border-borderBrand bg-slate-50 px-4 py-4 text-sm text-slate-600">
        Attachments are currently accepted by shared link only. For screenshots, manuals, closeout files, or project documents, paste a Google Drive, Dropbox, or OneDrive link in the notes field above.
      </div>

      {state.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Dispatch request submitted successfully.
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-4 border-t border-borderBrand pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          Use this form to submit scope, scheduling requirements, and dispatch details. For screenshots, manuals, or project files, include a shared Google Drive, Dropbox, or OneDrive link in the notes field.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Submitting…' : 'Send Scope'}
        </button>
      </div>
    </form>
  );
}