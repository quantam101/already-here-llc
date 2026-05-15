import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

const acceptedFileTypes = ['application/pdf', 'image/jpeg', 'image/png'];
const maxFileSize = 10 * 1024 * 1024;
const dispatchFromEmail = 'Dispatch <dispatch@alreadyherellc.com>';
const dispatchAddress = 'dispatch@alreadyherellc.com';

const maxFieldLengths: Record<string, number> = {
  fullName: 120,
  company: 160,
  email: 160,
  phone: 40,
  siteCity: 120,
  siteZip: 20,
  serviceType: 120,
  requestedDate: 40,
  requestedTime: 40,
  requestedWindow: 160,
  ticketNumber: 120,
  message: 3000
};

const requiredFields = ['fullName', 'company', 'email', 'siteCity', 'serviceType', 'message'];
const rateLimitWindowMs = 60_000;
const rateLimitMax = 5;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

type ResendAttachment = { filename: string; content: string };

function generateDispatchId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `AH-${stamp}-${randomUUID().slice(0, 8).toUpperCase()}`;
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

function asCleanString(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'dispatch-attachment';
}

function getAttachmentFile(formData: FormData): File | null {
  const attachment = formData.get('attachment');
  return attachment instanceof File && attachment.size > 0 ? attachment : null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getScheduleSummary(formData: FormData): string {
  const requestedDate = asCleanString(formData, 'requestedDate');
  const requestedTime = asCleanString(formData, 'requestedTime');
  const requestedWindow = asCleanString(formData, 'requestedWindow');
  return [requestedDate, requestedTime, requestedWindow].filter(Boolean).join(' · ') || 'Not specified';
}

function validateFormData(formData: FormData): string | null {
  if (asCleanString(formData, 'website')) return 'Submission rejected.';

  for (const field of requiredFields) {
    if (!asCleanString(formData, field)) return `Missing required field: ${field}`;
  }

  for (const [field, maxLength] of Object.entries(maxFieldLengths)) {
    if (asCleanString(formData, field).length > maxLength) return `${field} is too long.`;
  }

  const email = asCleanString(formData, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address.';

  const attachment = getAttachmentFile(formData);
  if (attachment) {
    if (!acceptedFileTypes.includes(attachment.type)) return 'Attachment must be PDF, JPG, or PNG.';
    if (attachment.size > maxFileSize) return 'Attachment must be 10 MB or smaller.';
  }

  return null;
}

function buildDispatchRecord(dispatchId: string, formData: FormData) {
  const attachment = getAttachmentFile(formData);
  return {
    dispatchId,
    status: 'received',
    source: 'website_dispatch_form',
    submittedAt: new Date().toISOString(),
    fullName: asCleanString(formData, 'fullName'),
    company: asCleanString(formData, 'company'),
    email: asCleanString(formData, 'email'),
    phone: asCleanString(formData, 'phone'),
    siteCity: asCleanString(formData, 'siteCity'),
    siteZip: asCleanString(formData, 'siteZip'),
    serviceType: asCleanString(formData, 'serviceType'),
    requestedDate: asCleanString(formData, 'requestedDate'),
    requestedTime: asCleanString(formData, 'requestedTime'),
    requestedWindow: asCleanString(formData, 'requestedWindow'),
    scheduleSummary: getScheduleSummary(formData),
    ticketNumber: asCleanString(formData, 'ticketNumber'),
    message: asCleanString(formData, 'message'),
    attachment: attachment ? {
      received: true,
      filename: sanitizeFilename(attachment.name),
      mimeType: attachment.type,
      sizeBytes: attachment.size,
      sizeDisplay: formatBytes(attachment.size),
      delivery: 'attached_to_dispatch_email'
    } : {
      received: false,
      delivery: 'none'
    }
  };
}

async function buildAttachments(formData: FormData, dispatchId: string): Promise<ResendAttachment[]> {
  const attachments: ResendAttachment[] = [];
  const attachment = getAttachmentFile(formData);

  if (attachment) {
    const buffer = Buffer.from(await attachment.arrayBuffer());
    attachments.push({ filename: sanitizeFilename(attachment.name), content: buffer.toString('base64') });
  }

  const record = buildDispatchRecord(dispatchId, formData);
  attachments.push({
    filename: `${dispatchId}-dispatch-record.json`,
    content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64')
  });

  return attachments;
}

function renderRows(rows: Array<[string, string]>): string {
  return rows
    .map(([label, value]) => `<tr><td style="padding:7px 12px;font-weight:700;color:#071B34;vertical-align:top;width:38%">${escapeHtml(label)}</td><td style="padding:7px 12px;color:#334155;white-space:pre-wrap">${escapeHtml(value || '—')}</td></tr>`)
    .join('');
}

function getDispatchRows(formData: FormData, dispatchId: string): Array<[string, string]> {
  const attachment = getAttachmentFile(formData);
  return [
    ['Dispatch ID', dispatchId],
    ['Record location', 'Dispatch mailbox email + attached JSON dispatch record'],
    ['Full name', asCleanString(formData, 'fullName')],
    ['Company', asCleanString(formData, 'company')],
    ['Email', asCleanString(formData, 'email')],
    ['Phone', asCleanString(formData, 'phone')],
    ['Site city', asCleanString(formData, 'siteCity')],
    ['Site ZIP', asCleanString(formData, 'siteZip')],
    ['Service type', asCleanString(formData, 'serviceType')],
    ['Requested schedule', getScheduleSummary(formData)],
    ['Ticket / work order', asCleanString(formData, 'ticketNumber')],
    ['Attachment', attachment ? `${sanitizeFilename(attachment.name)} (${formatBytes(attachment.size)})` : 'No attachment received'],
    ['Scope / notes', asCleanString(formData, 'message')]
  ];
}

function emailShell(title: string, subtitle: string, body: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#fff;border:1px solid #DDE5EF;border-radius:14px;overflow:hidden">
      <div style="background:#071B34;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:20px;font-weight:800;line-height:1.25">${escapeHtml(title)}</p>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.72);font-size:13px">${escapeHtml(subtitle)}</p>
      </div>
      <div style="padding:24px 32px">${body}</div>
      <div style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #DDE5EF">
        <p style="margin:0;font-size:12px;color:#64748B">Already Here LLC · ${dispatchAddress}</p>
      </div>
    </div>`;
}

function buildDispatchHtml(formData: FormData, dispatchId: string): string {
  const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' });
  return emailShell(
    `New Dispatch Request — ${dispatchId}`,
    `${submittedAt} MST`,
    `<table style="width:100%;border-collapse:collapse;font-size:14px">${renderRows(getDispatchRows(formData, dispatchId))}</table>`
  );
}

function buildRequesterReceiptHtml(formData: FormData, dispatchId: string): string {
  const attachment = getAttachmentFile(formData);
  const rows: Array<[string, string]> = [
    ['Dispatch ID', dispatchId],
    ['Company', asCleanString(formData, 'company')],
    ['Site city', asCleanString(formData, 'siteCity')],
    ['Service type', asCleanString(formData, 'serviceType')],
    ['Requested schedule', getScheduleSummary(formData)],
    ['Ticket / work order', asCleanString(formData, 'ticketNumber')],
    ['Attachment status', attachment ? `Received: ${sanitizeFilename(attachment.name)} (${formatBytes(attachment.size)})` : 'No attachment received']
  ];

  const body = `
    <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.6">Thank you. Already Here LLC received your dispatch request and queued it for review.</p>
    <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.6">This receipt confirms submission only. A dispatch is not scheduled until scope, location, timing, and coverage are reviewed and confirmed by Already Here LLC.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">${renderRows(rows)}</table>
    <p style="margin:20px 0 0;color:#334155;font-size:14px;line-height:1.6">For urgent updates, reply to this email and include Dispatch ID ${escapeHtml(dispatchId)}, or contact ${dispatchAddress}.</p>`;

  return emailShell('Dispatch Request Received', `Already Here LLC receipt confirmation — ${dispatchId}`, body);
}

async function sendResendEmail(payload: Record<string, unknown>): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || 'Resend API rejected the request.');
  }
}

async function sendViaResend(formData: FormData, dispatchId: string): Promise<void> {
  const to = process.env.DISPATCH_TO_EMAIL!;
  const requesterEmail = asCleanString(formData, 'email');
  const serviceType = asCleanString(formData, 'serviceType');
  const siteCity = asCleanString(formData, 'siteCity');
  const company = asCleanString(formData, 'company');
  const attachments = await buildAttachments(formData, dispatchId);

  await sendResendEmail({
    from: dispatchFromEmail,
    to: [to],
    subject: `[${dispatchId}] Dispatch: ${serviceType} — ${siteCity} — ${company}`,
    html: buildDispatchHtml(formData, dispatchId),
    attachments,
    reply_to: requesterEmail
  });

  await sendResendEmail({
    from: dispatchFromEmail,
    to: [requesterEmail],
    subject: `Dispatch request received — ${dispatchId}`,
    html: buildRequesterReceiptHtml(formData, dispatchId),
    reply_to: dispatchAddress
  });
}

async function sendViaFormspree(formData: FormData, dispatchId: string): Promise<void> {
  const endpoint = process.env.FORMSPREE_ENDPOINT!;
  formData.set('dispatchId', dispatchId);
  formData.set('recordLocation', 'Formspree submission payload');
  const res = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: formData, cache: 'no-store' });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { errors?: Array<{ message?: string }> } | null;
    throw new Error(payload?.errors?.[0]?.message || 'Formspree rejected the submission.');
  }
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) return NextResponse.json({ message: 'Too many submissions. Try again later.' }, { status: 429 });

  const formData = await request.formData();
  const validationError = validateFormData(formData);
  if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

  const hasResend = !!process.env.RESEND_API_KEY && !!process.env.DISPATCH_TO_EMAIL;
  const hasFormspree = !!process.env.FORMSPREE_ENDPOINT;
  if (!hasResend && !hasFormspree) return NextResponse.json({ message: 'Dispatch endpoint not configured.' }, { status: 500 });

  const dispatchId = generateDispatchId();

  try {
    if (hasResend) await sendViaResend(formData, dispatchId);
    else await sendViaFormspree(formData, dispatchId);
    return NextResponse.json({ ok: true, dispatchId, recordLocation: hasResend ? 'dispatch_email_json_attachment' : 'formspree_payload' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dispatch submission failed.';
    return NextResponse.json({ message, dispatchId }, { status: 502 });
  }
}

export async function GET() {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasFormspree = !!process.env.FORMSPREE_ENDPOINT;
  return NextResponse.json({
    status: 'ok',
    delivery: hasResend ? 'resend' : hasFormspree ? 'formspree' : 'unconfigured',
    records: hasResend ? 'dispatch_email_json_attachment' : hasFormspree ? 'formspree_payload' : 'unconfigured'
  });
}
