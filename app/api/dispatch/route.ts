import { NextResponse } from 'next/server';

const acceptedFileTypes = ['application/pdf', 'image/jpeg', 'image/png'];
const maxFileSize = 10 * 1024 * 1024;
const maxFieldLengths: Record<string, number> = {
  fullName: 120,
  company: 160,
  email: 160,
  phone: 40,
  siteCity: 120,
  siteZip: 20,
  serviceType: 120,
  requestedWindow: 160,
  ticketNumber: 120,
  message: 3000
};
const requiredFields = ['fullName', 'company', 'email', 'siteCity', 'serviceType', 'message'];
const rateLimitWindowMs = 60_000;
const rateLimitMax = 5;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function validateFormData(formData: FormData): string | null {
  const website = asCleanString(formData, 'website');
  if (website) return 'Submission rejected.';

  for (const field of requiredFields) {
    if (!asCleanString(formData, field)) return `Missing required field: ${field}`;
  }

  for (const [field, maxLength] of Object.entries(maxFieldLengths)) {
    if (asCleanString(formData, field).length > maxLength) return `${field} is too long.`;
  }

  const email = asCleanString(formData, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address.';

  const attachment = formData.get('attachment');
  if (attachment instanceof File && attachment.size > 0) {
    if (!acceptedFileTypes.includes(attachment.type)) return 'Attachment must be PDF, JPG, or PNG.';
    if (attachment.size > maxFileSize) return 'Attachment must be 10 MB or smaller.';
  }
  return null;
}

function renderRows(formData: FormData, fields: string[]): string {
  return fields
    .map((field) => {
      const label = escapeHtml(field);
      const value = escapeHtml(asCleanString(formData, field) || '—');
      return `<tr><td style="padding:6px 12px;font-weight:600;color:#071B34;vertical-align:top">${label}</td><td style="padding:6px 12px;color:#334155;white-space:pre-wrap">${value}</td></tr>`;
    })
    .join('');
}

async function sendViaResend(formData: FormData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!;
  const to = process.env.DISPATCH_TO_EMAIL!;
  const fields = renderRows(formData, requiredFields);
  const optionals = renderRows(formData, ['phone', 'siteZip', 'requestedWindow', 'ticketNumber']);
  const submittedAt = escapeHtml(new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
  const serviceType = escapeHtml(asCleanString(formData, 'serviceType'));
  const siteCity = escapeHtml(asCleanString(formData, 'siteCity'));
  const company = escapeHtml(asCleanString(formData, 'company'));

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #DDE5EF;border-radius:12px;overflow:hidden">
      <div style="background:#071B34;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:700">New Dispatch Request — Already Here LLC</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.72);font-size:13px">${submittedAt} MST</p>
      </div>
      <div style="padding:24px 32px"><table style="width:100%;border-collapse:collapse;font-size:14px">${fields}${optionals}</table></div>
      <div style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #DDE5EF">
        <p style="margin:0;font-size:12px;color:#64748B">Submitted via alreadyherellc.com/dispatch · Already Here LLC · dispatch@alreadyherellc.com</p>
      </div>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Dispatch <dispatch@alreadyherellc.com>',
      to: [to],
      subject: `Dispatch: ${serviceType} — ${siteCity} — ${company}`,
      html
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || 'Resend API rejected the request.');
  }
}

async function sendViaFormspree(formData: FormData): Promise<void> {
  const endpoint = process.env.FORMSPREE_ENDPOINT!;
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
  if (!hasResend && !hasFormspree) {
    return NextResponse.json({ message: 'Dispatch endpoint not configured.' }, { status: 500 });
  }

  try {
    if (hasResend) await sendViaResend(formData);
    else await sendViaFormspree(formData);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dispatch submission failed.';
    return NextResponse.json({ message }, { status: 502 });
  }
}

export async function GET() {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasFormspree = !!process.env.FORMSPREE_ENDPOINT;
  return NextResponse.json({ status: 'ok', delivery: hasResend ? 'resend' : hasFormspree ? 'formspree' : 'unconfigured' });
}
