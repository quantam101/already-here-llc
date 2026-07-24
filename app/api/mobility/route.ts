import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

const requiredFields = ['participantType', 'fullName', 'email', 'phone', 'city', 'state', 'notes'];
const allowedParticipantTypes = new Set(['vehicle_owner', 'business_needs_vehicles', 'business_needs_deliveries', 'driver_needs_vehicle', 'scooter_renter', 'fleet_partner', 'vehicle_seller']);
const allowedInterests = new Set(['sell_vehicle', 'rent_vehicle', 'lease_vehicle', 'revenue_share', 'managed_fleet', 'delivery_capacity', 'driver_with_vehicle', 'vehicle_without_driver', 'scooter_rental', 'doordash', 'uber_eats', 'local_courier', 'business_delivery_overflow']);
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
  if (!allowedParticipantTypes.has(clean(formData, 'participantType'))) return 'Invalid participant type.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(formData, 'email', 160))) return 'Invalid email address.';
  const interests = formData.getAll('interests').map(String).filter((value) => allowedInterests.has(value));
  if (interests.length === 0) return 'Select at least one collaboration interest.';
  if (clean(formData, 'consentContact') !== 'true' || clean(formData, 'consentData') !== 'true' || clean(formData, 'consentTruth') !== 'true') return 'Required consent is missing.';
  return null;
}

async function sendEmail(payload: Record<string, unknown>): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.MOBILITY_TO_EMAIL || process.env.DISPATCH_TO_EMAIL || process.env.APPLICANT_TO_EMAIL;
  if (!apiKey || !to) return;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Mobility <dispatch@alreadyherellc.com>', to: [to], ...payload })
  });
  if (!response.ok) throw new Error('Mobility email delivery failed.');
}

export async function POST(request: Request) {
  if (limited(clientKey(request))) return NextResponse.json({ message: 'Too many submissions. Try again shortly.' }, { status: 429 });

  const formData = await request.formData();
  const error = validate(formData);
  if (error) return NextResponse.json({ message: error }, { status: 400 });

  const mobilityId = `MOB-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const interests = formData.getAll('interests').map(String).filter((value) => allowedInterests.has(value));
  const record = {
    mobilityId,
    submittedAt: new Date().toISOString(),
    source: 'website_mobility_marketplace',
    participantType: clean(formData, 'participantType'),
    status: 'new',
    contact: {
      fullName: clean(formData, 'fullName', 120),
      company: clean(formData, 'company', 160),
      email: clean(formData, 'email', 160),
      phone: clean(formData, 'phone', 40),
      city: clean(formData, 'city', 120),
      state: clean(formData, 'state', 40),
      zipCode: clean(formData, 'zipCode', 20)
    },
    vehicle: {
      vehicleType: clean(formData, 'vehicleType', 80),
      year: clean(formData, 'vehicleYear', 10),
      make: clean(formData, 'vehicleMake', 80),
      model: clean(formData, 'vehicleModel', 80),
      mileage: clean(formData, 'mileage', 40),
      condition: clean(formData, 'vehicleCondition', 1500),
      askingPrice: clean(formData, 'askingPrice', 80)
    },
    demand: {
      vehiclesNeeded: Number(clean(formData, 'vehiclesNeeded', 10) || 0),
      vehicleTypesNeeded: clean(formData, 'vehicleTypesNeeded', 300),
      deliveryVolume: clean(formData, 'deliveryVolume', 300),
      serviceArea: clean(formData, 'serviceArea', 300),
      schedule: clean(formData, 'schedule', 300),
      cargoRequirements: clean(formData, 'cargoRequirements', 1500),
      budget: clean(formData, 'budget', 200)
    },
    interests,
    notes: clean(formData, 'notes', 3000),
    match: { fitScore: 0, matchedRecordIds: [], nextAction: 'screen_record', reviewerNotes: '' },
    consents: { contact: true, data: true, truth: true }
  };

  const webhook = process.env.MOBILITY_DATABASE_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }).catch(() => null);
  }

  const rows = [
    ['Reference', mobilityId],
    ['Type', record.participantType],
    ['Name', record.contact.fullName],
    ['Company', record.contact.company || '—'],
    ['Email', record.contact.email],
    ['Phone', record.contact.phone],
    ['Location', `${record.contact.city}, ${record.contact.state} ${record.contact.zipCode}`.trim()],
    ['Interests', interests.join(', ')],
    ['Vehicle', [record.vehicle.year, record.vehicle.make, record.vehicle.model, record.vehicle.vehicleType].filter(Boolean).join(' ') || '—'],
    ['Vehicles needed', String(record.demand.vehiclesNeeded || '—')],
    ['Service area', record.demand.serviceArea || '—'],
    ['Notes', record.notes]
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:720px;margin:auto"><h2>New mobility marketplace record — ${escapeHtml(mobilityId)}</h2><table style="width:100%;border-collapse:collapse">${rows.map(([label, value]) => `<tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:700">${escapeHtml(label)}</td><td style="padding:8px;border-bottom:1px solid #ddd;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`).join('')}</table><pre style="margin-top:20px;padding:16px;background:#f8fafc;overflow:auto">${escapeHtml(JSON.stringify(record, null, 2))}</pre></div>`;

  await sendEmail({ subject: `[${mobilityId}] Mobility marketplace intake`, html, reply_to: record.contact.email }).catch(() => null);

  return NextResponse.json({ message: 'Mobility request received.', mobilityId, status: 'new' });
}
