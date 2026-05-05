import { NextResponse } from 'next/server';

const acceptedFileTypes = ['application/pdf', 'image/jpeg', 'image/png'];
const maxFileSize = 10 * 1024 * 1024;

const requiredFields = ['fullName', 'company', 'email', 'siteCity', 'serviceType', 'message'];

function validateFormData(formData: FormData): string | null {
  for (const field of requiredFields) {
    const value = formData.get(field);
    if (typeof value !== 'string' || value.trim().length === 0) {
      return `Missing required field: ${field}`;
    }
  }
  const email = formData.get('email');
  if (typeof email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Invalid email address.';
  }
  const attachment = formData.get('attachment');
  if (attachment instanceof File && attachment.size > 0) {
    if (!acceptedFileTypes.includes(attachment.type)) return 'Attachment must be PDF, JPG, or PNG.';
    if (attachment.size > maxFileSize) return 'Attachment must be 10 MB or smaller.';
  }
  return null;
}

async function sendViaResend(formData: FormData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!;
  const to = process.env.DISPATCH_TO_EMAIL!;

  const fields = requiredFields.map((f) => `<tr><td style="padding:6px 12px;font-weight:600;color:#0F2747;vertical-align:top">${f}</td><td style="padding:6px 12px;color:#334155">${formData.get(f) ?? '—'}</td></tr>`).join('');
  const optionals = ['phone', 'siteZip', 'requestedWindow', 'ticketNumber'].map((f) => `<tr><td style="padding:6px 12px;font-weight:600;color:#0F2747;vertical-align:top">${f}</td><td style="padding:6px 12px;color:#334155">${formData.get(f) || '—'}</td></tr>`).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">
      <div style="background:#0F2747;padding:24px 32px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:700">New Dispatch Request — Already Here LLC</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:13px">${new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' })} MST</p>
      </div>
      <div style="padding:24px 32px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">${fields}${optionals}</table>
      </div>
      <div style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0">
        <p style="margin:0;font-size:12px;color:#64748B">Submitted via alreadyherellc.com/dispatch · Already Here LLC · dispatch@alreadyherellc.com</p>
      </div>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Dispatch <dispatch@alreadyherellc.com>',
      to: [to],
      subject: `Dispatch: ${formData.get('serviceType')} — ${formData.get('siteCity')} — ${formData.get('company')}`,
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
  const formData = await request.formData();

  const validationError = validateFormData(formData);
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const hasResend = !!process.env.RESEND_API_KEY && !!process.env.DISPATCH_TO_EMAIL;
  const hasFormspree = !!process.env.FORMSPREE_ENDPOINT;

  if (!hasResend && !hasFormspree) {
    return NextResponse.json(
      { message: 'Dispatch endpoint not configured. Add RESEND_API_KEY + DISPATCH_TO_EMAIL to Vercel environment variables.' },
      { status: 500 }
    );
  }

  try {
    if (hasResend) {
      await sendViaResend(formData);
    } else {
      await sendViaFormspree(formData);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dispatch submission failed.';
    return NextResponse.json({ message }, { status: 502 });
  }
}

export async function GET() {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasFormspree = !!process.env.FORMSPREE_ENDPOINT;
  return NextResponse.json({
    status: 'ok',
    delivery: hasResend ? 'resend' : hasFormspree ? 'formspree' : 'unconfigured'
  });
}
