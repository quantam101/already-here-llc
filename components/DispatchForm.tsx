'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { dispatchTypes, markets } from '@/lib/site';

type SubmitState = {
  error: string | null;
  success: boolean;
};

const urgencyOptions = ['Standard', 'Urgent', 'After-hours', 'Scheduled project'] as const;

const windowOptions = [
  'Standard business hours',
  '8 AM - 12 PM',
  '12 PM - 4 PM',
  'After 5 PM',
  'Before open',
  'Flexible',
  'Due by specific time'
] as const;

const accessOptions = [
  'Lockbox / key pickup',
  'Badge or manager escort required',
  'After-hours access only',
  'Data closet / server room access',
  'Biomed / healthcare area',
  'Photos required',
  'Parts onsite',
  'Remote support team on bridge',
  'Call before arrival'
] as const;

function getFieldValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

export function DispatchForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<string>('Standard business hours');
  const [state, setState] = useState<SubmitState>({ error: null, success: false });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ error: null, success: false });

    const form = event.currentTarget;
    const formData = new FormData(form);

    const requiredFields = ['fullName', 'company', 'email', 'siteCity', 'serviceType', 'issueSummary'];

    for (const field of requiredFields) {
      const value = getFieldValue(formData, field);
      if (!value) {
        setState({
          error: 'Complete all required dispatch fields before submitting.',
          success: false
        });
        return;
      }
    }

    const email = getFieldValue(formData, 'email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState({
        error: 'Use a valid business email address.',
        success: false
      });
      return;
    }

    const siteZip = getFieldValue(formData, 'siteZip');
    if (siteZip && !/^\d{5}$/.test(siteZip)) {
      setState({
        error: 'Use a valid 5-digit ZIP code or leave it blank.',
        success: false
      });
      return;
    }

    const fileLink = getFieldValue(formData, 'fileLink');
    if (fileLink && !/^https?:\/\//i.test(fileLink)) {
      setState({
        error: 'Use a full shared file link starting with http:// or https://.',
        success: false
      });
      return;
    }

    const requestedWindow = getFieldValue(formData, 'requestedWindow');
    const requestedTime = getFieldValue(formData, 'requestedTime');

    if (requestedWindow === 'Due by specific time' && !requestedTime) {
      setState({
        error: 'Add the due-by time when "Due by specific time" is selected.',
        success: false
      });
      return;
    }

    const accessConstraints = formData
      .getAll('accessConstraints')
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    const fullName = getFieldValue(formData, 'fullName');
    const company = getFieldValue(formData, 'company');
    const phone = getFieldValue(formData, 'phone');
    const siteCity = getFieldValue(formData, 'siteCity');
    const requestedDate = getFieldValue(formData, 'requestedDate');
    const ticketNumber = getFieldValue(formData, 'ticketNumber');
    const issueSummary = getFieldValue(formData, 'issueSummary');
    const urgency = getFieldValue(formData, 'urgency');
    const remoteTeam = getFieldValue(formData, 'remoteTeam');
    const additionalNotes = getFieldValue(formData, 'additionalNotes');

    const requestedVisitLine =
      requestedDate || requestedWindow || requestedTime
        ? `Requested visit: ${[requestedDate, requestedWindow, requestedTime].filter(Boolean).join(' | ')}`
        : 'Requested visit: Not specified';

    const generatedMessage = [
      `Requester: ${fullName}`,
      `Company: ${company}`,
      `Business email: ${email}`,
      phone ? `Callback number: ${phone}` : '',
      `Service type: ${getFieldValue(formData, 'serviceType')}`,
      `Scope summary: ${issueSummary}`,
      ticketNumber ? `Ticket / WO: ${ticketNumber}` : '',
      `Site city: ${siteCity}${siteZip ? ` ${siteZip}` : ''}`,
      requestedVisitLine,
      urgency ? `Priority: ${urgency}` : '',
      remoteTeam ? `Remote team / bridge details: ${remoteTeam}` : '',
      accessConstraints.length
        ? `Access / site conditions: ${accessConstraints.join(', ')}`
        : 'Access / site conditions: None noted',
      fileLink ? `Shared file link: ${fileLink}` : '',
      additionalNotes ? `Additional notes: ${additionalNotes}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    formData.set('message', generatedMessage);

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
      setSelectedWindow('Standard business hours');
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
      <input type="hidden" name="message" value="" readOnly />

      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-900">
        No long paragraph required. Fill the structured fields below and the form will build the dispatch summary automatically.
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
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
            list="az-market-options"
            required
            className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
            placeholder="Pick or type a city"
          />
          <datalist id="az-market-options">
            {markets.map((market) => (
              <option key={market} value={market} />
            ))}
          </datalist>
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
          Priority
          <select
            name="urgency"
            defaultValue="Standard"
            className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink"
          >
            {urgencyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-navy">
          Requested date
          <input
            name="requestedDate"
            type="date"
            className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-navy">
          Arrival window
          <select
            name="requestedWindow"
            value={selectedWindow}
            onChange={(event) => setSelectedWindow(event.target.value)}
            className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink"
          >
            {windowOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {selectedWindow === 'Due by specific time' ? (
          <label className="grid gap-2 text-sm font-medium text-navy md:col-span-2">
            Due-by time
            <input
              name="requestedTime"
              type="time"
              className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink"
            />
          </label>
        ) : null}
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
        Remote team / bridge details
        <input
          name="remoteTeam"
          className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
          placeholder="Remote engineer, bridge line, Teams, Zoom, or onsite coordination note"
        />
      </label>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        One-line scope summary <span className="text-action">*</span>
        <input
          name="issueSummary"
          required
          className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
          placeholder="Example: Remote team needs onsite laptop triage and drive swap in server closet"
        />
      </label>

      <fieldset className="mt-6 rounded-[2rem] border border-borderBrand bg-slate-50 p-5">
        <legend className="px-1 text-sm font-semibold text-navy">Access and site conditions</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {accessOptions.map((option) => (
            <label key={option} className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                name="accessConstraints"
                value={option}
                className="mt-1 h-4 w-4 rounded border-borderBrand"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Shared file link
        <input
          name="fileLink"
          type="url"
          autoComplete="url"
          inputMode="url"
          className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
          placeholder="https://drive.google.com/... or Dropbox / OneDrive shared link"
        />
      </label>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Additional notes
        <textarea
          name="additionalNotes"
          rows={5}
          className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400"
          placeholder="Only add anything unusual that does not fit the structured fields above."
        />
      </label>

      <div className="mt-6 rounded-2xl border border-borderBrand bg-slate-50 px-4 py-4 text-sm text-slate-600">
        This version is optimized for speed: short summary, checkboxes, standard windows, and a native time picker when due-by timing is required.
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
          Structured fields reduce typing and generate the dispatch summary automatically before submission.
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