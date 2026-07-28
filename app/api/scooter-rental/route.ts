import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

const requiredFields = ['fullName', 'email', 'phone', 'city', 'state', 'licenseNumber', 'deliveryPlatforms', 'rentalPlan', 'startDate', 'notes'];
const allowedRentalPlans = new Set(['weekly', 'monthly']);
const allowedAddOns = new Set([
  'Wireless fast-charging phone mount',
  'LED flashing active safety vest',
  'Touchscreen all-weather riding gloves',
  'DOT-approved helmet (+ sanitary liner)'
]);
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function clean(formData: FormData, field: string, max = 3000): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function limited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 5;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function validate(formData: FormData): string | null {
  if (clean(formData, 'website')) return 'Submission rejected.';
  for (const field of requiredFields) if (!clean(formData, field)) return `Missing required field: ${field}`;
  if (!allowedRentalPlans.has(clean(formData, 'rentalPlan'))) return 'Invalid rental plan.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(formData, 'email', 160))) return 'Invalid email address.';
  const addOns = formData.getAll('addOns').map(String).filter((value) => allowedAddOns.has(value));
  if (addOns.length > 4) return 'Invalid add-on selection.';
  if (clean(formData, 'consentContact') !== 'true' || clean(formData, 'consentData') !== 'true' || clean(formData, 'consentTerms') !== 'true') return 'Required consent is missing.';
  return null;
}

async function sendEmail(payload: Record<string, unknown>): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SCOOTER_RENTAL_TO_EMAIL || process.env.MOBILITY_TO_EMAIL || process.env.DISPATCH_TO_EMAIL || process.env.APPLICANT_TO_EMAIL;
  if (!apiKey || !to) return;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Scooter Rentals <dispatch@alreadyherellc.com>', to: [to], ...payload })
  });
  if (!response.ok) throw new Error('Scooter rental email delivery failed.');
}

export async function POST(request: Request) {
  if (limited(clientKey(request))) return NextResponse.json({ message: 'Too many submissions. Try again shortly.' }, { status: 429 });

  const formData = await request.formData();
  const error = validate(formData);
  if (error) return NextResponse.json({ message: error }, { status: 400 });

  const rentalId = `SCOOTER-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const addOns = formData.getAll('addOns').map(String).filter((value) => allowedAddOns.has(value));
  const record = {
    rentalId,
    submittedAt: new Date().toISOString(),
    source: 'website_scooter_rentals',
    status: 'new',
    rentalPlan: clean(formData, 'rentalPlan'),
    startDate: clean(formData, 'startDate', 40),
    contact: {
      fullName: clean(formData, 'fullName', 120),
      email: clean(formData, 'email', 160),
      phone: clean(formData, 'phone', 40),
      city: clean(formData, 'city', 120),
      state: clean(formData, 'state', 40),
      zipCode: clean(formData, 'zipCode', 20)
    },
    driver: {
      licenseNumber: clean(formData, 'licenseNumber', 80),
      deliveryPlatforms: clean(formData, 'deliveryPlatforms', 200)
    },
    addOns,
    notes: clean(formData, 'notes', 2000),
    consents: { contact: true, data: true, terms: true }
  };

  const webhook = process.env.SCOOTER_RENTAL_WEBHOOK_URL || process.env.MOBILITY_DATABASE_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }).catch(() => null);
  }

  const rows = [
    ['Reference', rentalId],
    ['Plan', record.rentalPlan],
    ['Start date', record.startDate],
    ['Name', record.contact.fullName],
    ['Email', record.contact.email],
    ['Phone', record.contact.phone],
    ['Location', `${record.contact.city}, ${record.contact.state} ${record.contact.zipCode}`.trim()],
    ['License', record.driver.licenseNumber],
    ['Platforms', record.driver.deliveryPlatforms],
    ['Add-ons', addOns.join(', ') || '—'],
    ['Notes', record.notes]
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:720px;margin:auto"><h2>New scooter rental request — ${escapeHtml(rentalId)}</h2><table style="width:100%;border-collapse:collapse">${rows.map(([label, value]) => `<tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:700">${escapeHtml(label)}</td><td style="padding:8px;border-bottom:1px solid #ddd;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`).join('')}</table><pre style="margin-top:20px;padding:16px;background:#f8fafc;overflow:auto">${escapeHtml(JSON.stringify(record, null, 2))}</pre></div>`;

  await sendEmail({ subject: `[${rentalId}] Scooter rental intake`, html, reply_to: record.contact.email }).catch(() => null);

  return NextResponse.json({ message: 'Scooter rental request received.', rentalId, status: 'new' });
}
