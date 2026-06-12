'use client';

import { FormEvent, useMemo, useState } from 'react';
import { supportedLanguageOptions } from '@/lib/ai-agent-products';

const demoOptions = [
  'Automated presentation',
  'Try a sample agent for my business',
  'Use my website as the demo context',
  'Show lead capture and owner alert',
  'Show quote intake and qualification',
  'Show the lead record output',
  'Show multilingual intake and response'
];

const agentOptions = [
  'Website chatbox',
  'Quote intake agent',
  'Missed-lead recovery agent',
  'Booking or dispatch triage',
  'FAQ and service qualification',
  'White-label reseller agent',
  'Multi-location routing agent',
  'Multilingual outreach and intake agent'
];

const routingOptions = [
  'Email alert',
  'Callback alert',
  'Lead record export',
  'CRM-ready record',
  'Dispatcher review',
  'Owner approval before action',
  'Translate lead summary for owner'
];

const languageModes = [
  'Auto-detect visitor language and respond in that language',
  'Let visitor choose language before starting',
  'English owner view with translated customer conversation',
  'Draft multilingual replies for owner approval only',
  'One-language demo first'
];

const trialPaths = ['Free trial / automated demo first', 'Launch Agent', 'Growth Agent', 'Network Agent', 'Need recommendation'];
const timingOptions = ['Show me now', 'This week', 'This month', 'Researching'];
const budgetOptions = ['Not ready to buy yet', 'Under $1,000 after trial', '$1,000 - $2,500 after trial', '$2,500 - $5,000 after trial', '$5,000+ after trial'];
const installOptions = ['Existing website', 'Standalone AI intake page', 'Embedded website widget', 'New landing page needed', 'Not sure yet'];
const businessTypeOptions = [
  'Online store / e-commerce',
  'Local service business',
  'Small business - call for special-case terms',
  'Veteran-owned business - call for special-case terms',
  'Disabled business owner - call for special-case terms',
  'HVAC',
  'Plumbing',
  'Electrical contractor',
  'Locksmith / access control',
  'Garage door service',
  'Appliance repair',
  'Junk removal / hauling',
  'Property management',
  'Real estate / leasing',
  'Home cleaning / organizing',
  'Landscaping / lawn care',
  'Roofing',
  'Pest control',
  'Auto service / mobile mechanic',
  'IT services / MSP',
  'Low-voltage / CCTV / cabling',
  'Healthcare / clinic',
  'Restaurant / food service',
  'Retail store',
  'Beauty / barber / wellness',
  'Nonprofit / community organization',
  'Other - type custom business type'
];

type ResultState = { type: 'idle' | 'success' | 'error'; message: string };
type LeadResponse = { message?: string; leadId?: string; grade?: string; score?: number };

function value(formData: FormData, field: string): string {
  return String(formData.get(field) || '').trim();
}

function values(formData: FormData, field: string): string {
  return formData.getAll(field).map((item) => String(item).trim()).filter(Boolean).join(', ');
}

export function AiAgentLeadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ResultState>({ type: 'idle', message: '' });
  const [trialPath, setTrialPath] = useState('Free trial / automated demo first');

  const helperText = useMemo(() => {
    if (trialPath === 'Network Agent') return 'Best fit when the demo needs routing, escalation, multiple locations, reseller logic, or multilingual workflows across teams.';
    if (trialPath === 'Growth Agent') return 'Best fit when the demo needs missed-lead recovery, quote routing, multilingual follow-up drafts, and lead-quality review.';
    if (trialPath === 'Launch Agent') return 'Best fit when the demo only needs website chat, lead capture, receipt, owner alert, and one or two language paths.';
    if (trialPath === 'Need recommendation') return 'Use this when the business problem is clear but the right package or language coverage is not.';
    return 'Start with a free trial or automated presentation so the buyer can watch the agent capture, qualify, route, translate, and generate a lead record before buying.';
  }, [trialPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult({ type: 'idle', message: '' });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const requiredFields = ['fullName', 'company', 'email', 'phone', 'businessType', 'goals'];

    for (const field of requiredFields) {
      if (!value(formData, field)) {
        setResult({ type: 'error', message: 'Complete all required AI Web Agent trial fields before submitting.' });
        return;
      }
    }

    const email = value(formData, 'email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResult({ type: 'error', message: 'Use a valid business email address.' });
      return;
    }

    const packageInterest = value(formData, 'packageInterest') || 'Free trial / automated demo first';
    const urgency = value(formData, 'urgency') || 'This week';
    const budget = value(formData, 'budget') || 'Not ready to buy yet';
    const preferredLanguage = value(formData, 'preferredLanguage') || 'English';
    const additionalLanguages = values(formData, 'additionalLanguages');
    const languageMode = value(formData, 'languageMode') || 'Auto-detect visitor language and respond in that language';
    const demoPreference = values(formData, 'demoPreference');
    const agentTypes = values(formData, 'agentTypes');
    const routingNeeds = values(formData, 'routingNeeds');

    const goals = [
      `Trial / demo preference: ${demoPreference || 'Not specified'}`,
      `Agent type to demonstrate: ${agentTypes || 'Not specified'}`,
      `Preferred language: ${preferredLanguage}`,
      `Additional languages: ${additionalLanguages || 'None specified'}`,
      `Language response mode: ${languageMode}`,
      `Install preference: ${value(formData, 'installPreference') || 'Not specified'}`,
      `Primary conversion goal: ${value(formData, 'primaryConversion') || 'Not specified'}`,
      `Questions the demo should ask: ${value(formData, 'qualificationFields') || 'Not specified'}`,
      `Lead routing and record output: ${routingNeeds || 'Not specified'}`,
      `Operating rules: ${value(formData, 'operatingRules') || 'Not specified'}`,
      '',
      `What they want to watch the agent do: ${value(formData, 'goals')}`
    ].join('\n');

    const payload = {
      fullName: value(formData, 'fullName'),
      company: value(formData, 'company'),
      email,
      phone: value(formData, 'phone'),
      website: value(formData, 'website'),
      businessType: value(formData, 'businessType'),
      packageInterest,
      urgency,
      budget,
      preferredLanguage,
      additionalLanguages,
      languageMode,
      goals,
      currentLeadProblem: value(formData, 'currentLeadProblem'),
      sourcePath: typeof window === 'undefined' ? '/ai-agent' : window.location.pathname,
      websiteTrap: value(formData, 'websiteTrap')
    };

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ai-agent-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const responsePayload = (await response.json().catch(() => ({}))) as LeadResponse;
      if (!response.ok || !responsePayload.leadId) throw new Error(responsePayload.message || 'AI Web Agent trial request could not be submitted.');

      form.reset();
      setTrialPath('Free trial / automated demo first');
      setResult({ type: 'success', message: `AI Web Agent free trial/demo request received. Lead ${responsePayload.leadId} is queued for review.` });
    } catch (error) {
      setResult({ type: 'error', message: error instanceof Error ? error.message : 'AI Web Agent trial request could not be submitted.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form id="ai-agent-free-trial" className="card p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
      <input type="text" name="websiteTrap" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="mb-8 rounded-3xl border border-borderBrand bg-soft p-5">
        <p className="grid-label">Free trial / automated demo</p>
        <h2 className="mt-3 text-2xl font-semibold text-navy">Tell the agent what to demonstrate.</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">This intake lets a buyer watch the AI Web Agent work before buying: multilingual lead capture, qualification, routing, owner alert, and lead record generation.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">Full name <span className="text-action">*</span><input name="fullName" required autoComplete="name" maxLength={120} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Primary trial contact" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Company <span className="text-action">*</span><input name="company" required autoComplete="organization" maxLength={160} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Business, agency, MSP, or operator" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Business email <span className="text-action">*</span><input name="email" type="email" required autoComplete="email" maxLength={160} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="you@company.com" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Phone <span className="text-action">*</span><input name="phone" type="tel" required autoComplete="tel" inputMode="tel" maxLength={40} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Direct callback number" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Website or domain<input name="website" type="url" maxLength={240} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="https://example.com" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Business type <span className="text-action">*</span><input name="businessType" required list="business-type-options" maxLength={120} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Choose from the list or type your own" /></label>
        <datalist id="business-type-options">
          {businessTypeOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
      </div>

      <p className="mt-4 rounded-2xl border border-borderBrand bg-soft px-4 py-3 text-sm leading-6 text-slate-600">
        Small businesses, veteran-owned businesses, and disabled business owners are reviewed by phone on a special-case basis. Call 602-882-2920 before assuming standard setup or monthly pricing.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">Primary visitor language<select name="preferredLanguage" defaultValue="English" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">{supportedLanguageOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Language response mode<select name="languageMode" defaultValue="Auto-detect visitor language and respond in that language" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">{languageModes.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      </div>

      <fieldset className="mt-8 rounded-3xl border border-borderBrand p-5">
        <legend className="px-2 text-sm font-semibold text-navy">Additional languages to support</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {supportedLanguageOptions.filter((option) => option !== 'English').map((option) => <label key={option} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-700"><input type="checkbox" name="additionalLanguages" value={option} className="mt-1" /><span>{option}</span></label>)}
        </div>
      </fieldset>

      <fieldset className="mt-8 rounded-3xl border border-borderBrand p-5">
        <legend className="px-2 text-sm font-semibold text-navy">What do you want to watch first?</legend>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {demoOptions.map((option) => <label key={option} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-700"><input type="checkbox" name="demoPreference" value={option} className="mt-1" /><span>{option}</span></label>)}
        </div>
      </fieldset>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-navy">Trial path<select name="packageInterest" defaultValue="Free trial / automated demo first" onChange={(event) => setTrialPath(event.target.value)} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">{trialPaths.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Timing<select name="urgency" defaultValue="This week" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">{timingOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Budget after trial<select name="budget" defaultValue="Not ready to buy yet" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">{budgetOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      </div>

      <div className="mt-6 rounded-3xl border border-borderBrand bg-soft p-5 text-sm leading-7 text-slate-600">{helperText}</div>

      <fieldset className="mt-8 rounded-3xl border border-borderBrand p-5">
        <legend className="px-2 text-sm font-semibold text-navy">What type of AI Web Agent should the trial demonstrate?</legend>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {agentOptions.map((option) => <label key={option} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-700"><input type="checkbox" name="agentTypes" value={option} className="mt-1" /><span>{option}</span></label>)}
        </div>
      </fieldset>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">Where should a paid version live?<select name="installPreference" defaultValue="Existing website" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">{installOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Primary conversion goal<input name="primaryConversion" maxLength={180} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Quote request, booked call, dispatch intake, estimate request, etc." /></label>
      </div>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">What should the demo agent ask, capture, qualify, book, or route? <span className="text-action">*</span><textarea name="goals" required rows={6} maxLength={3000} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400" placeholder="Describe the exact experience you want to watch, including any language-specific questions or responses." /></label>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">Current lead problem<textarea name="currentLeadProblem" rows={4} maxLength={1200} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400" placeholder="Missed calls, language barriers, slow quote response, unqualified leads, after-hours requests, no follow-up, etc." /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Questions the trial should ask<textarea name="qualificationFields" rows={4} maxLength={1200} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400" placeholder="Service type, city, urgency, budget, equipment, site count, preferred language, access details, etc." /></label>
      </div>

      <fieldset className="mt-8 rounded-3xl border border-borderBrand p-5">
        <legend className="px-2 text-sm font-semibold text-navy">What should happen after the demo captures a lead?</legend>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {routingOptions.map((option) => <label key={option} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-700"><input type="checkbox" name="routingNeeds" value={option} className="mt-1" /><span>{option}</span></label>)}
        </div>
      </fieldset>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">Operating rules<textarea name="operatingRules" rows={4} maxLength={1200} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400" placeholder="Example: collect leads only, translate customer response, no outbound action without owner approval, quote approval required, etc." /></label>

      {result.message ? <div className={result.type === 'error' ? 'mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700' : 'mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'}>{result.message}</div> : null}

      <div className="mt-8 flex flex-col gap-4 border-t border-borderBrand pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">Free trial and demo requests route through the dedicated AI Web Agent lead endpoint and generate an AI lead ID for tracking.</p>
        <button type="submit" disabled={isSubmitting} className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? 'Submitting...' : 'Start Free Trial / Demo'}</button>
      </div>
    </form>
  );
}
