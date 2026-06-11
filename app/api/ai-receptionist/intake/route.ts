import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

const dispatchFromEmail = 'Dispatch <dispatch@alreadyherellc.com>';
const dispatchAddress = 'dispatch@alreadyherellc.com';
const maxLength = 2200;
const rateLimitWindowMs = 60_000;
const rateLimitMax = 8;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function generateLeadId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `AHR-${stamp}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown';
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
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function parsePayload(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    return Object.fromEntries(Object.entries(body).map(([key, value]) => [key, clean(value)]));
  }
  const formData = await request.formData();
  return Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, clean(value)]));
}

function leadRows(payload: Record<string, string>, leadId: string): Array<[string, string]> {
  return [
    ['Lead ID', leadId],
    ['Source', payload.source || 'ai_receptionist_intake'],
    ['Name', payload.fullName || payload.name],
    ['Company', payload.company],
    ['Phone', payload.phone],
    ['Email', payload.email],
    ['Service requested', payload.serviceType || payload.service],
    ['Urgency', payload.urgency],
    ['Location', payload.location || [payload.city, payload.zip].filter(Boolean).join(' ')],
    ['Preferred time', payload.preferredTime || payload.schedule],
    ['Decision state', 'Proceed / Quote / Schedule / Discard required'],
    ['Notes', payload.message || payload.notes]
  ];
}

function renderRows(rows: Array<[string, string]>): string {
  return rows
    .map(([label, value]) => `<tr><td style="padding:7px 12px;font-weight:700;color:#071B34;vertical-align:top;width:38%">${escapeHtml(label)}</td><td style="padding:7px 12px;color:#334155;white-space:pre-wrap">${escapeHtml(value || '—')}</td></tr>`)
    .join('');
}

function buildHtml(payload: Record<string, string>, leadId: string): string {
  const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' });
  return `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;background:#fff;border:1px solid #DDE5EF;border-radius:14px;overflow:hidden">
      <div style="background:#071B34;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:20px;font-weight:800;line-height:1.25">AI Receptionist Lead — ${escapeHtml(leadId)}</p>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.72);font-size:13px">${escapeHtml(submittedAt)} MST · Already Here LLC intake</p>
      </div>
      <div style="padding:24px 32px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">${renderRows(leadRows(payload, leadId))}</table>
      </div>
      <div style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #DDE5EF">
        <p style="margin:0;font-size:12px;color:#64748B">Already Here LLC · ${dispatchAddress}</p>
      </div>
    </div>`;
}

async function sendResendEmail(payload: Record<string, unknown>): Promise<string> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Resend rejected AI receptionist lead delivery.');
  const data = await res.json().catch(() => ({} as { id?: string }));
  return data.id || '';
}

async function deliverLead(payload: Record<string, string>, leadId: string): Promise<{ delivery: string; messageId?: string }> {
  const to = process.env.AI_RECEPTIONIST_TO_EMAIL || process.env.DISPATCH_TO_EMAIL;
  if (process.env.RESEND_API_KEY && to) {
    const messageId = await sendResendEmail({
      from: dispatchFromEmail,
      to: [to],
      subject: `[${leadId}] AI Receptionist Lead: ${payload.serviceType || payload.service || 'New request'} — ${payload.phone || payload.email || 'no contact'}`,
      html: buildHtml(payload, leadId),
      reply_to: payload.email || dispatchAddress
    });
    return { delivery: 'resend', messageId };
  }

  if (process.env.FORMSPREE_ENDPOINT) {
    const form = new FormData();
    for (const [key, value] of Object.entries({ leadId, ...payload })) form.set(key, value);
    const res = await fetch(process.env.FORMSPREE_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: form, cache: 'no-store' });
    if (!res.ok) throw new Error('Formspree rejected AI receptionist lead delivery.');
    return { delivery: 'formspree' };
  }

  return { delivery: 'dry-run-no-delivery-configured' };
}

function validate(payload: Record<string, string>): string | null {
  if (payload.website) return 'Submission rejected.';
  const name = payload.fullName || payload.name;
  const contact = payload.phone || payload.email;
  const service = payload.serviceType || payload.service || payload.message || payload.notes;
  if (!name) return 'Name is required.';
  if (!contact) return 'Phone or email is required.';
  if (!service) return 'Service request is required.';
  return null;
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) return NextResponse.json({ ok: false, message: 'Too many requests. Try again later.' }, { status: 429 });

  const payload = await parsePayload(request);
  const validationError = validate(payload);
  if (validationError) return NextResponse.json({ ok: false, message: validationError }, { status: 400 });

  const leadId = generateLeadId();
  try {
    const delivery = await deliverLead(payload, leadId);
    return NextResponse.json({ ok: true, leadId, status: 'received', ...delivery, nextAction: 'Review lead, quote/schedule if valid, discard if not qualified.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI receptionist intake failed.';
    return NextResponse.json({ ok: false, leadId, message }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'ai-receptionist-intake',
    status: 'ready',
    delivery: process.env.RESEND_API_KEY && (process.env.AI_RECEPTIONIST_TO_EMAIL || process.env.DISPATCH_TO_EMAIL) ? 'resend' : process.env.FORMSPREE_ENDPOINT ? 'formspree' : 'dry-run-no-delivery-configured',
    env: {
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
      AI_RECEPTIONIST_TO_EMAIL: Boolean(process.env.AI_RECEPTIONIST_TO_EMAIL),
      DISPATCH_TO_EMAIL: Boolean(process.env.DISPATCH_TO_EMAIL),
      FORMSPREE_ENDPOINT: Boolean(process.env.FORMSPREE_ENDPOINT)
    },
    timestamp: new Date().toISOString()
  });
}
