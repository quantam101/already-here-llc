import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server.js';
import { scoreAgentLead, type AgentLeadPayload } from '../../../lib/ai-agent-products';

export const runtime = 'nodejs';

const dispatchFromEmail = 'Already Here AI Agents <dispatch@alreadyherellc.com>';
const defaultLeadAddress = 'dispatch@alreadyherellc.com';

const maxFieldLengths: Record<keyof AgentLeadPayload | 'websiteTrap', number> = {
  fullName: 120,
  company: 160,
  email: 160,
  phone: 40,
  website: 240,
  businessType: 120,
  packageInterest: 80,
  urgency: 120,
  budget: 80,
  preferredLanguage: 80,
  additionalLanguages: 240,
  languageMode: 180,
  goals: 3000,
  currentLeadProblem: 1200,
  sourcePath: 240,
  websiteTrap: 80
};

const requiredFields: Array<keyof AgentLeadPayload> = ['fullName', 'company', 'email', 'phone', 'businessType', 'goals'];
const rateLimitWindowMs = 60_000;
const rateLimitMax = 5;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

type LeadGrade = 'A' | 'B' | 'C';

type SalesBrief = {
  summary: string;
  recommendedOffer: string;
  languagePlan: string;
  demoAngle: string;
  valuePitch: string;
  likelyNeeds: string[];
  upsellOpportunities: string[];
  suggestedReply: string;
  discoveryQuestions: string[];
  closePlan: string;
  riskNotes: string[];
};

type LeadRecord = AgentLeadPayload & {
  leadId: string;
  status: 'received';
  source: 'ai_web_agent';
  submittedAt: string;
  score: number;
  grade: LeadGrade;
  nextAction: string;
  salesBrief: SalesBrief;
};

type ResendDeliveryResult = {
  ownerEmailId: string;
  receiptEmailId: string | null;
  receiptDelivery: 'sent' | 'failed';
  receiptError?: string;
};

function generateLeadId(): string {
  const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replaceAll('.', '');
  return `AIA-${stamp}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }
  current.count += 1;
  return current.count > rateLimitMax;
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(email: string): boolean {
  const at = email.indexOf('@');
  const dot = email.lastIndexOf('.');
  return at > 0 && dot > at + 1 && dot < email.length - 1;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizePayload(input: Record<string, unknown>): AgentLeadPayload {
  return {
    fullName: clean(input.fullName),
    company: clean(input.company),
    email: clean(input.email),
    phone: clean(input.phone),
    website: clean(input.website),
    businessType: clean(input.businessType),
    packageInterest: clean(input.packageInterest),
    urgency: clean(input.urgency),
    budget: clean(input.budget),
    preferredLanguage: clean(input.preferredLanguage) || 'English',
    additionalLanguages: clean(input.additionalLanguages),
    languageMode: clean(input.languageMode) || 'Auto-detect visitor language and respond in that language',
    goals: clean(input.goals),
    currentLeadProblem: clean(input.currentLeadProblem),
    sourcePath: clean(input.sourcePath) || '/ai-agent'
  };
}

function validatePayload(payload: AgentLeadPayload, trap: string): string | null {
  if (trap) return 'Submission rejected.';

  for (const field of requiredFields) {
    if (!payload[field]) return `Missing required field: ${field}`;
  }

  for (const [field, maxLength] of Object.entries(maxFieldLengths)) {
    const value = field === 'websiteTrap' ? trap : payload[field as keyof AgentLeadPayload];
    if (value.length > maxLength) return `${field} is too long.`;
  }

  if (!isValidEmail(payload.email)) return 'Invalid email address.';
  return null;
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function compactList(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function hasMultilingualNeed(payload: AgentLeadPayload): boolean {
  const text = `${payload.preferredLanguage} ${payload.additionalLanguages} ${payload.languageMode} ${payload.goals} ${payload.currentLeadProblem}`.toLowerCase();
  return payload.preferredLanguage !== 'English' || Boolean(payload.additionalLanguages.trim()) || includesAny(text, ['language', 'multilingual', 'translate', 'spanish', 'french', 'arabic', 'chinese', 'vietnamese', 'tagalog', 'korean', 'hindi', 'creole']);
}

function chooseRecommendedOffer(payload: AgentLeadPayload, grade: LeadGrade, score: number): string {
  const text = `${payload.businessType} ${payload.packageInterest} ${payload.goals} ${payload.currentLeadProblem} ${payload.languageMode}`.toLowerCase();

  if (includesAny(text, ['multi-location', 'multi location', 'reseller', 'white-label', 'white label', 'dispatch', 'routing', 'approval gate'])) {
    return 'Network Agent';
  }

  if (hasMultilingualNeed(payload) || grade === 'A' || score >= 76 || includesAny(text, ['marketing', 'blast', 'follow-up', 'follow up', 'email', 'message', 'missed', 'quote', 'crm'])) {
    return 'Growth Agent';
  }

  if (payload.packageInterest.toLowerCase().includes('launch')) return 'Launch Agent';
  return 'Launch Agent demo first';
}

function buildLanguagePlan(payload: AgentLeadPayload): string {
  const primary = payload.preferredLanguage || 'English';
  const additional = payload.additionalLanguages || 'None specified';
  const mode = payload.languageMode || 'Auto-detect visitor language and respond in that language';
  return `Primary language: ${primary}. Additional languages: ${additional}. Mode: ${mode}. Owner-facing lead records should remain readable in English while preserving the customer language and translated summary.`;
}

function buildSalesBrief(payload: AgentLeadPayload, scored: { score: number; grade: LeadGrade; nextAction: string }): SalesBrief {
  const text = `${payload.businessType} ${payload.packageInterest} ${payload.goals} ${payload.currentLeadProblem} ${payload.budget} ${payload.preferredLanguage} ${payload.additionalLanguages} ${payload.languageMode}`.toLowerCase();
  const multilingual = hasMultilingualNeed(payload);
  const recommendedOffer = chooseRecommendedOffer(payload, scored.grade, scored.score);
  const languagePlan = buildLanguagePlan(payload);

  const likelyNeeds = compactList([
    'A free trial or automated demo that shows the agent capturing a real lead and producing an owner-ready lead record.',
    multilingual ? 'Multilingual intake that can either auto-detect the visitor language or let the visitor choose a language before starting.' : '',
    multilingual ? 'English owner view with original-language customer text, translated summary, and clear next action.' : '',
    includesAny(text, ['send', 'receive', 'message', 'email', 'respond']) ? 'Message and email intake with reply-ready drafts, not uncontrolled outbound sending.' : '',
    includesAny(text, ['marketing', 'blast', 'campaign']) ? 'Approval-gated marketing or follow-up workflow after opt-in, offer, list source, and operating rules are confirmed.' : '',
    includesAny(text, ['dont know where', 'get them', 'leads', 'traffic']) ? 'Lead-generation support beyond the agent itself: landing page offer, traffic source, follow-up path, and conversion tracking.' : '',
    includesAny(text, ['it', 'msp', 'dispatch', 'field', 'support']) ? 'IT/service intake flow that qualifies service type, urgency, location, contact details, language, and handoff path.' : '',
    includesAny(text, ['quote', 'estimate', 'price']) ? 'Quote-intake questions that collect scope, budget, urgency, location, language preference, and decision timeline before owner response.' : ''
  ]);

  const upsellOpportunities = compactList([
    recommendedOffer === 'Launch Agent' ? 'Upsell to Growth Agent after demo if they need multilingual routing, follow-up, reporting, or multiple service categories.' : '',
    recommendedOffer === 'Growth Agent' ? 'Position Growth Agent as the paid next step: multilingual intake, lead routing, follow-up scripts, lead-quality review, and monthly optimization.' : '',
    recommendedOffer === 'Network Agent' ? 'Position Network Agent if they need multi-location language routing, reseller use, dispatch workflows, or approval gates.' : '',
    multilingual ? 'Add multilingual response library and translated owner summaries as a premium feature because it expands reachable markets immediately.' : '',
    includesAny(text, ['marketing', 'blast', 'campaign']) ? 'Offer a separate campaign setup add-on: lead magnet, list segmentation, message templates, opt-in language, multilingual variants, and reporting.' : '',
    includesAny(text, ['website', 'landing page', 'traffic', 'dont know where', 'get them']) ? 'Offer a multilingual landing page and traffic-readiness add-on because the agent cannot convert visitors that never arrive.' : '',
    'Offer monthly management after trial: conversion review, language tuning, question tuning, missed-lead analysis, and lead-quality recommendations.'
  ]);

  const demoAngle = multilingual
    ? 'Show a visitor choosing or being detected in another language, completing the intake, receiving a clear response, and sending the owner an English lead summary with the original customer language preserved.'
    : includesAny(text, ['marketing', 'blast', 'send', 'receive', 'message', 'email'])
      ? 'Show a visitor entering a request, the agent qualifying the need, creating a lead record, and preparing an owner-approved reply or follow-up path.'
      : 'Show a visitor entering a service request, the agent qualifying urgency and fit, then sending the owner a structured lead record.';

  const valuePitch = multilingual
    ? `Position this as a multilingual revenue-intake system for ${payload.businessType || 'the business'}, not a generic chatbot. The demo should prove the agent can remove language friction, capture more leads, and keep the owner in control.`
    : `Based on the submission, sell this as a working revenue-intake system for ${payload.businessType || 'the business'}, not as a generic chatbot. The demo should prove lead capture, qualification, routing, and owner visibility before discussing paid setup.`;

  const summary = `${payload.fullName} from ${payload.company} is a ${scored.grade} lead scored ${scored.score}. Recommended path: ${recommendedOffer}. Language plan: ${languagePlan}`;

  const suggestedReply = [
    `Hi ${payload.fullName},`,
    '',
    `I reviewed what you entered for ${payload.company}. The best first step is to show you a free AI Web Agent demo using your business context, so you can watch it capture a lead, ask the right questions, route the information, and generate an owner-ready lead record before you commit to a paid setup.`,
    '',
    multilingual ? `I also noted the language requirement. I would demonstrate the agent with this language setup: ${languagePlan}` : 'For the first demo, I would keep the language path simple unless you want multilingual support included from the start.',
    '',
    `For your use case, I would start by demonstrating: ${demoAngle}`,
    '',
    `Based on your goals, the likely paid path after the demo is ${recommendedOffer}. If the demo proves the workflow, the next step would be confirming website access, lead-routing rules, language rules, approval rules, and what follow-up should stay human-approved.`,
    '',
    'Before I set up the demo, please confirm the best website/domain to use, the main lead type you want captured, and whether multilingual responses should be automatic or drafted for approval first.',
    '',
    'Stephen Franklin',
    'Already Here LLC'
  ].join('\n');

  const discoveryQuestions = compactList([
    'What exact lead type should the demo capture first?',
    'What questions must the agent ask before the owner responds?',
    'Which language should the visitor see first?',
    'Should the visitor choose a language manually, or should the agent auto-detect language?',
    'Should the owner receive English-only summaries, original-language messages, or both?',
    'Where should the lead record go: email, CRM, spreadsheet, dispatcher, or all of the above?',
    'Should replies be drafted for approval only, or can any response be sent automatically after rules are approved?',
    payload.website.toLowerCase().includes('@') ? 'The website field appears to contain an email address. What is the actual domain or website URL?' : '',
    includesAny(text, ['marketing', 'blast', 'campaign']) ? 'Do they already have opted-in contacts for marketing messages, and do those contacts need language-specific message variants?' : '',
    includesAny(text, ['dont know where', 'get them']) ? 'What traffic source will feed the agent: ads, organic search, referrals, email list, directory listings, or social content?' : ''
  ]);

  const closePlan = scored.grade === 'A'
    ? 'Call within 15 minutes. Lead with the free multilingual demo, then position Growth Agent or Network Agent if they need routing, follow-up, campaigns, multiple languages, or multi-step automation.'
    : scored.grade === 'B'
      ? 'Reply same day with the suggested message, collect missing details, and steer them into a Launch Agent or Growth Agent demo depending on language scope.'
      : 'Ask the discovery questions first. Do not quote until the use case, website/domain, lead source, language scope, and routing expectations are clear.';

  const riskNotes = compactList([
    'Do not promise automatic outbound messages until approval rules, opt-in status, and client authorization are confirmed.',
    'Do not treat the free demo as an active paid setup. Paid setup starts only after scope, access, routing, language rules, and monthly terms are approved.',
    multilingual ? 'Language responses should be tested with real business phrases before launch. Keep owner approval available for high-risk or high-value replies.' : '',
    payload.website.toLowerCase().includes('@') ? 'Website/domain needs correction before any website-specific demo can be configured.' : '',
    includesAny(text, ['marketing', 'blast', 'campaign']) ? 'Marketing-blast language requires list-source, consent, and language-variant review before implementation.' : ''
  ]);

  return {
    summary,
    recommendedOffer,
    languagePlan,
    demoAngle,
    valuePitch,
    likelyNeeds,
    upsellOpportunities,
    suggestedReply,
    discoveryQuestions,
    closePlan,
    riskNotes
  };
}

function rowsHtml(rows: Array<[string, string]>): string {
  return rows
    .map(([label, value]) => `<tr><td style='padding:7px 12px;font-weight:700;color:#071B34;vertical-align:top;width:34%'>${escapeHtml(label)}</td><td style='padding:7px 12px;color:#334155;white-space:pre-wrap'>${escapeHtml(value || '—')}</td></tr>`)
    .join('');
}

function listHtml(items: string[]): string {
  if (!items.length) return `<p style='margin:0;color:#64748B;font-size:14px'>—</p>`;
  return `<ul style='margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:1.6'>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function sectionHtml(title: string, body: string): string {
  return `<div style='margin:0 0 18px;border:1px solid #DDE5EF;border-radius:12px;overflow:hidden'><div style='background:#F8FAFC;padding:10px 14px;font-weight:800;color:#071B34;font-size:13px;text-transform:uppercase;letter-spacing:.08em'>${escapeHtml(title)}</div><div style='padding:14px'>${body}</div></div>`;
}

function emailShell(title: string, subtitle: string, body: string): string {
  return `
    <div style='font-family:Arial,sans-serif;max-width:760px;margin:0 auto;background:#fff;border:1px solid #DDE5EF;border-radius:14px;overflow:hidden'>
      <div style='background:#071B34;padding:24px 32px'>
        <p style='margin:0;color:#fff;font-size:20px;font-weight:800;line-height:1.25'>${escapeHtml(title)}</p>
        <p style='margin:8px 0 0;color:rgba(255,255,255,0.72);font-size:13px'>${escapeHtml(subtitle)}</p>
      </div>
      <div style='padding:24px 32px'>${body}</div>
      <div style='padding:16px 32px;background:#F8FAFC;border-top:1px solid #DDE5EF'>
        <p style='margin:0;font-size:12px;color:#64748B'>Already Here LLC · ${defaultLeadAddress}</p>
      </div>
    </div>`;
}

function buildLeadRecord(leadId: string, payload: AgentLeadPayload): LeadRecord {
  const scored = scoreAgentLead(payload) as { score: number; grade: LeadGrade; nextAction: string };
  return {
    leadId,
    status: 'received',
    source: 'ai_web_agent',
    submittedAt: new Date().toISOString(),
    ...payload,
    score: scored.score,
    grade: scored.grade,
    nextAction: scored.nextAction,
    salesBrief: buildSalesBrief(payload, scored)
  };
}

function leadRows(record: LeadRecord): Array<[string, string]> {
  return [
    ['Lead ID', record.leadId],
    ['Grade / score', `${record.grade} / ${record.score}`],
    ['Next action', record.nextAction],
    ['Name', record.fullName],
    ['Company', record.company],
    ['Email', record.email],
    ['Phone', record.phone],
    ['Website', record.website],
    ['Business type', record.businessType],
    ['Package interest', record.packageInterest],
    ['Urgency', record.urgency],
    ['Budget', record.budget],
    ['Preferred language', record.preferredLanguage],
    ['Additional languages', record.additionalLanguages],
    ['Language mode', record.languageMode],
    ['Current lead problem', record.currentLeadProblem],
    ['Goals', record.goals],
    ['Source path', record.sourcePath]
  ];
}

function buildOwnerHtml(record: LeadRecord): string {
  const brief = record.salesBrief;
  const briefRows: Array<[string, string]> = [
    ['Recommended offer', brief.recommendedOffer],
    ['Language plan', brief.languagePlan],
    ['Close plan', brief.closePlan],
    ['Demo angle', brief.demoAngle],
    ['Value pitch', brief.valuePitch]
  ];

  return emailShell(
    `New AI Web Agent Lead — ${record.leadId}`,
    `${record.grade} lead · ${record.company} · ${brief.recommendedOffer}`,
    [
      sectionHtml('Operator sales brief', `<p style='margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6'>${escapeHtml(brief.summary)}</p><table style='width:100%;border-collapse:collapse;font-size:14px'>${rowsHtml(briefRows)}</table>`),
      sectionHtml('Suggested client reply / spiel', `<pre style='margin:0;white-space:pre-wrap;font-family:Arial,sans-serif;color:#334155;font-size:14px;line-height:1.6'>${escapeHtml(brief.suggestedReply)}</pre>`),
      sectionHtml('Likely needs', listHtml(brief.likelyNeeds)),
      sectionHtml('Upsell opportunities', listHtml(brief.upsellOpportunities)),
      sectionHtml('Discovery questions', listHtml(brief.discoveryQuestions)),
      sectionHtml('Risk / approval notes', listHtml(brief.riskNotes)),
      sectionHtml('Original lead fields', `<table style='width:100%;border-collapse:collapse;font-size:14px'>${rowsHtml(leadRows(record))}</table>`)
    ].join('')
  );
}

async function sendResendEmail(payload: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY!;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Resend API rejected the request.');
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return data.id ?? '';
}

async function sendViaResend(record: LeadRecord): Promise<ResendDeliveryResult> {
  const to = process.env.AI_AGENT_TO_EMAIL || process.env.DISPATCH_TO_EMAIL!;
  const ownerHtml = buildOwnerHtml(record);

  const receiptHtml = emailShell(
    'AI Web Agent Free Trial / Demo Request Received',
    `Already Here LLC confirmation — ${record.leadId}`,
    `<p style='margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6'>Thank you. Already Here LLC received your AI Web Agent free trial/demo request.</p><p style='margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6'>Preferred language noted: ${escapeHtml(record.preferredLanguage || 'English')}.</p><p style='margin:0;color:#334155;font-size:15px;line-height:1.6'>Your request is queued for review. A paid setup is not active until scope, website access, lead routing, language rules, approval rules, and monthly management terms are confirmed.</p>`
  );

  const ownerEmailId = await sendResendEmail({
    from: dispatchFromEmail,
    to: [to],
    subject: `[${record.leadId}] AI Agent Lead: ${record.company} — ${record.grade} — ${record.salesBrief.recommendedOffer}`,
    html: ownerHtml,
    attachments: [{ filename: `${record.leadId}-ai-agent-lead.json`, content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64') }],
    reply_to: record.email
  });

  try {
    const receiptEmailId = await sendResendEmail({
      from: dispatchFromEmail,
      to: [record.email],
      subject: `AI Web Agent free trial/demo request received — ${record.leadId}`,
      html: receiptHtml,
      reply_to: defaultLeadAddress
    });

    return { ownerEmailId, receiptEmailId, receiptDelivery: 'sent' };
  } catch (error) {
    const receiptError = error instanceof Error ? error.message : 'Receipt email failed.';
    return { ownerEmailId, receiptEmailId: null, receiptDelivery: 'failed', receiptError };
  }
}

function stringifyFormspreeValue(value: unknown): string {
  return typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value ?? '');
}

async function sendViaFormspree(record: LeadRecord): Promise<void> {
  const endpoint = process.env.FORMSPREE_ENDPOINT!;
  const form = new FormData();
  for (const [key, item] of Object.entries(record)) form.set(key, stringifyFormspreeValue(item));
  const res = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: form, cache: 'no-store' });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { errors?: Array<{ message?: string }> } | null;
    throw new Error(payload?.errors?.[0]?.message || 'Formspree rejected the submission.');
  }
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) return NextResponse.json({ message: 'Too many submissions. Try again later.' }, { status: 429 });

  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });

  const payload = normalizePayload(raw);
  const validationError = validatePayload(payload, clean(raw.websiteTrap));
  if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

  const hasResend = !!process.env.RESEND_API_KEY && !!(process.env.AI_AGENT_TO_EMAIL || process.env.DISPATCH_TO_EMAIL);
  const hasFormspree = !!process.env.FORMSPREE_ENDPOINT;
  if (!hasResend && !hasFormspree) return NextResponse.json({ message: 'AI agent lead endpoint not configured.' }, { status: 500 });

  const leadId = generateLeadId();
  const record = buildLeadRecord(leadId, payload);

  try {
    const resendDelivery = hasResend ? await sendViaResend(record) : null;
    if (!hasResend) await sendViaFormspree(record);

    return NextResponse.json({
      ok: true,
      leadId,
      grade: record.grade,
      score: record.score,
      nextAction: record.nextAction,
      recommendedOffer: record.salesBrief.recommendedOffer,
      languagePlan: record.salesBrief.languagePlan,
      recordLocation: hasResend ? 'lead_email_json_attachment' : 'formspree_payload',
      receiptDelivery: resendDelivery?.receiptDelivery ?? 'not_applicable'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI agent lead submission failed.';
    return NextResponse.json({ message, leadId }, { status: 502 });
  }
}

export async function GET() {
  const hasResend = !!process.env.RESEND_API_KEY && !!(process.env.AI_AGENT_TO_EMAIL || process.env.DISPATCH_TO_EMAIL);
  const hasFormspree = !!process.env.FORMSPREE_ENDPOINT;
  return NextResponse.json({
    ok: true,
    status: 'ok',
    service: 'ai-agent-lead',
    delivery: hasResend ? 'resend' : hasFormspree ? 'formspree' : 'unconfigured',
    records: hasResend ? 'lead_email_json_attachment' : hasFormspree ? 'formspree_payload' : 'none',
    timestamp: new Date().toISOString()
  });
}
