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
  goals: 3000,
  currentLeadProblem: 1200,
  sourcePath: 240,
  websiteTrap: 80
};

const requiredFields: Array<keyof AgentLeadPayload> = ['fullName', 'company', 'email', 'phone', 'businessType', 'goals'];
const rateLimitWindowMs = 60_000;
const rateLimitMax = 5;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

type LeadRecord = AgentLeadPayload & {
  leadId: string;
  status: 'received';
  source: 'ai_web_agent';
  submittedAt: string;
  score: number;
  grade: 'A' | 'B' | 'C';
  nextAction: string;
};

function generateLeadId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return 'Invalid email address.';
  return null;
}

function rowsHtml(rows: Array<[string, string]>): string {
  return rows
    .map(([label, value]) => `<tr><td style="padding:7px 12px;font-weight:700;color:#071B34;vertical-align:top;width:34%">${escapeHtml(label)}</td><td style="padding:7px 12px;color:#334155;white-space:pre-wrap">${escapeHtml(value || '—')}</td></tr>`)
    .join('');
}

function emailShell(title: string, subtitle: string, body: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;background:#fff;border:1px solid #DDE5EF;border-radius:14px;overflow:hidden">
      <div style="background:#071B34;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:20px;font-weight:800;line-height:1.25">${escapeHtml(title)}</p>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.72);font-size:13px">${escapeHtml(subtitle)}</p>
      </div>
      <div style="padding:24px 32px">${body}</div>
      <div style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #DDE5EF">
        <p style="margin:0;font-size:12px;color:#64748B">Already Here LLC · ${defaultLeadAddress}</p>
      </div>
    </div>`;
}

function buildLeadRecord(leadId: string, payload: AgentLeadPayload): LeadRecord {
  const scored = scoreAgentLead(payload);
  return {
    leadId,
    status: 'received',
    source: 'ai_web_agent',
    submittedAt: new Date().toISOString(),
    ...payload,
    score: scored.score,
    grade: scored.grade,
    nextAction: scored.nextAction
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
    ['Current lead problem', record.currentLeadProblem],
    ['Goals', record.goals],
    ['Source path', record.sourcePath]
  ];
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

async function sendViaResend(record: LeadRecord): Promise<string> {
  const to = process.env.AI_AGENT_TO_EMAIL || process.env.DISPATCH_TO_EMAIL!;
  const ownerHtml = emailShell(
    `New AI Web Agent Lead — ${record.leadId}`,
    `${record.grade} lead · ${record.company}`,
    `<table style="width:100%;border-collapse:collapse;font-size:14px">${rowsHtml(leadRows(record))}</table>`
  );

  const receiptHtml = emailShell(
    'AI Web Agent Request Received',
    `Already Here LLC confirmation — ${record.leadId}`,
    `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6">Thank you. Already Here LLC received your AI Web Agent request.</p><p style="margin:0;color:#334155;font-size:15px;line-height:1.6">Your request is queued for review. A proposal is not active until scope, website access, lead routing, and monthly management terms are confirmed.</p>`
  );

  const id = await sendResendEmail({
    from: dispatchFromEmail,
    to: [to],
    subject: `[${record.leadId}] AI Agent Lead: ${record.company} — ${record.grade}`,
    html: ownerHtml,
    attachments: [{ filename: `${record.leadId}-ai-agent-lead.json`, content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64') }],
    reply_to: record.email
  });

  await sendResendEmail({
    from: dispatchFromEmail,
    to: [record.email],
    subject: `AI Web Agent request received — ${record.leadId}`,
    html: receiptHtml,
    reply_to: defaultLeadAddress
  });

  return id;
}

async function sendViaFormspree(record: LeadRecord): Promise<void> {
  const endpoint = process.env.FORMSPREE_ENDPOINT!;
  const form = new FormData();
  for (const [key, value] of Object.entries(record)) form.set(key, String(value));
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
    if (hasResend) await sendViaResend(record);
    else await sendViaFormspree(record);

    return NextResponse.json({ ok: true, leadId, grade: record.grade, score: record.score, nextAction: record.nextAction, recordLocation: hasResend ? 'lead_email_json_attachment' : 'formspree_payload' });
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
