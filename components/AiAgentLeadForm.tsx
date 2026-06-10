'use client';

import { FormEvent, useMemo, useState } from 'react';

const budgetOptions = ['Under $1,000', '$1,000 - $2,500', '$2,500 - $5,000', '$5,000+'];
const urgencyOptions = ['Today', 'This week', 'This month', 'Researching'];
const packageOptions = ['Launch Agent', 'Growth Agent', 'Network Agent', 'Need recommendation'];
const agentTypeOptions = [
  'Website chatbox and lead capture',
  'Quote intake and qualification',
  'Missed-lead recovery',
  'Booking / dispatch triage',
  'FAQ and service qualification',
  'White-label / reseller agent',
  'Multi-location routing agent'
];
const installOptions = ['Existing website', 'Standalone AI intake page', 'Embedded website widget', 'New landing page needed', 'Not sure yet'];
const routingOptions = ['Email alert', 'SMS / phone alert', 'CRM-ready lead record', 'CSV / JSON export', 'Dispatcher review', 'Approval gate before outbound action'];

const initialResult = { type: 'idle' as const, message: '' };

type ResultState =
  | typeof initialResult
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

type LeadResponse = {
  message?: string;
  leadId?: string;
  grade?: string;
  score?: number;
  nextAction?: string;
};

function selectedValues(formData: FormData, field: string): string {
  return formData.getAll(field).map((value) => String(value).trim()).filter(Boolean).join(', ');
}

function requiredValue(formData: FormData, field: string): string {
  return String(formData.get(field) || '').trim();
}

export function AiAgentLeadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ResultState>(initialResult);
  const [recommendedPath, setRecommendedPath] = useState('Need recommendation');

  const recommendation = useMemo(() => {
    if (recommendedPath === 'Network Agent') return 'Network Agent is usually the fit when routing, escalation, approvals, multiple locations, or reseller workflows matter.';
    if (recommendedPath === 'Growth Agent') return 'Growth Agent is usually the fit when missed leads, quote routing, follow-up, and monthly optimization are the money problem.';
    if (recommendedPath === 'Launch Agent') return 'Launch Agent is usually the fastest revenue path when the first goal is a working website agent, lead capture, and owner alerts.';
    return 'Choose Need recommendation when the scope is unclear. The form will still route the request for review.';
  }, [recommendedPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(initialResult);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const requiredFields = ['fullName', 'company', 'email', 'phone', 'businessType', 'goals'];
    for (const field of requiredFields) {
      if (!requiredValue(formData, field)) {
        setResult({ type: 'error', message: 'Complete all required AI Web Agent fields before submitting.' });
        return;
      }
    }

    const email = requiredValue(formData, 'email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResult({ type: 'error', message: 'Use a valid business email address.' });
      return;
    }

    const agentTypes = selectedValues(formData, 'agentTypes');
    const routingNeeds = selectedValues(formData, 'routingNeeds');
    const installPreference = requiredValue(formData, 'installPreference');
    const primaryConversion = requiredValue(formData, 'primaryConversion');
    const qualificationFields = requiredValue(formData, 'qualificationFields');
    const currentLeadProblem = requiredValue(formData, 'currentLeadProblem');
    const complianceRules = requiredValue(formData, 'complianceRules');
    const packageInterest = requiredValue(formData, 'packageInterest') || 'Need recommendation';
    const urgency = requiredValue(formData, 'urgency') || 'This week';
    const budget = requiredValue(formData, 'budget') || '$1,000 - $2,500';

    const goals = [
      `Primary AI agent type: ${agentTypes || 'Not specified'}`,
      `Install preference: ${installPreference || 'Not specified'}`,
      `Primary conversion goal: ${primaryConversion || 'Not specified'}`,
      `Questions / qualification fields needed: ${qualificationFields || 'Not specified'}`,
      `Lead routing and records needed: ${routingNeeds || 'Not specified'}`,
      `Approval, compliance, or no-autosend rules: ${complianceRules || 'Not specified'}`,
      '',
      `Build objective: ${requiredValue(formData, 'goals')}`
    ].join('\n');

    const payload = {
      fullName: requiredValue(formData, 'fullName'),
      company: requiredValue(formData, 'company'),
      email,
      phone: requiredValue(formData, 'phone'),
      website: requiredValue(formData, 'website'),
      businessType: requiredValue(formData, 'businessType'),
      packageInterest,
      urgency,
      budget,
      goals,
      currentLeadProblem,
      sourcePath: typeof window === 'undefined' ? '/ai-agent' : window.location.pathname,
      websiteTrap: requiredValue(formData, 'websiteTrap')
    };

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ai-agent-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const responsePayload = (await response.json().catch(() => ({}))) as LeadResponse;
      if (!response.ok || !responsePayload.leadId) throw new Error(responsePayload.message || 'AI Web Agent request could not be submitted.');

      form.reset();
      setRecommendedPath('Need recommendation');
      setResult({
        type: 'success',
        message: `AI Web Agent request received. Lead ${responsePayload.leadId} is graded ${responsePayload.grade ?? 'queued'} with score ${responsePayload.score ?? 'pending'}.`
      });
    } catch (error) {
      setResult({ type: 'error', message: error instanceof Error ? error.message : 'AI Web Agent request could not be submitted.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form id="ai-agent-request-form" className="card p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
      <input type="text" name="websiteTrap" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          Full name <span className="text-action">*</span>
          <input name="fullName" required autoComplete="name" maxLength={120} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Primary buyer or project contact" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Company <span className="text-action">*</span>
          <input name="company" required autoComplete="organization" maxLength={160} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Business, agency, MSP, or operator" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Business email <span className="text-action">*</span>
          <input name="email" type="email" required autoComplete="email" maxLength={160} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="you@company.com" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Phone <span className="text-action">*</span>
          <input name="phone" type="tel" required autoComplete="tel" inputMode="tel" maxLength={40} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Direct callback number" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Website or domain
          <input name="website" type="url" maxLength={240} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="https://example.com" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Business type <span className="text-action">*</span>
          <input name="businessType" required maxLength={120} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="HVAC, MSP, access control, property management, etc." />
        </label>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-navy">
          Package interest
          <select name="packageInterest" defaultValue="Need recommendation" onChange={(event) => setRecommendedPath(event.target.value)} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            {packageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Urgency
          <select name="urgency" defaultValue="This week" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            {urgencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Budget range
          <select name="budget" defaultValue="$1,000 - $2,500" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            {budgetOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-6 rounded-3xl border border-borderBrand bg-soft p-5 text-sm leading-7 text-slate-600">
        {recommendation}
      </div>

      <fieldset className="mt-8 rounded-3xl border border-borderBrand p-5">
        <legend className="px-2 text-sm font-semibold text-navy">What type of AI Web Agent do you need?</legend>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {agentTypeOptions.map((option) => (
            <label key={option} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" name="agentTypes" value={option} className="mt-1" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          Where should it be installed?
          <select name="installPreference" defaultValue="Existing website" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            {installOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Primary conversion goal
          <input name="primaryConversion" maxLength={180} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Quote request, booked call, dispatch intake, estimate request, etc." />
        </label>
      </div>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        What should the agent ask, capture, qualify, book, or route? <span className="text-action">*</span>
        <textarea name="goals" required rows={6} maxLength={3000} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400" placeholder="Describe the exact result you want from the AI Web Agent." />
      </label>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          Current lead problem
          <textarea name="currentLeadProblem" rows={4} maxLength={1200} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400" placeholder="Missed calls, slow quote response, unqualified leads, after-hours requests, no follow-up, etc." />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Required qualification fields
          <textarea name="qualificationFields" rows={4} maxLength={1200} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400" placeholder="Service type, city, urgency, budget, photos, equipment, site count, access details, etc." />
        </label>
      </div>

      <fieldset className="mt-8 rounded-3xl border border-borderBrand p-5">
        <legend className="px-2 text-sm font-semibold text-navy">How should leads route after capture?</legend>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {routingOptions.map((option) => (
            <label key={option} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" name="routingNeeds" value={option} className="mt-1" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Approval, compliance, or no-autosend rules
        <textarea name="complianceRules" rows={4} maxLength={1200} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400" placeholder="Example: collect leads only, no outbound messages without owner approval, HIPAA-sensitive intake limits, quote approval required, etc." />
      </label>

      {result.message ? (
        <div className={result.type === 'error' ? 'mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700' : 'mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'}>
          {result.message}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-4 border-t border-borderBrand pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">AI Web Agent requests route through the dedicated AI lead endpoint and generate an AI lead ID for tracking.</p>
        <button type="submit" disabled={isSubmitting} className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-70">
          {isSubmitting ? 'Submitting...' : 'Submit AI Web Agent Request'}
        </button>
      </div>
    </form>
  );
}
