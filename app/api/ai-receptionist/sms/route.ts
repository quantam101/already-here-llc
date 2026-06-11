import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

function xmlResponse(message: string): NextResponse {
  const safe = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`, {
    status: 200,
    headers: { 'content-type': 'text/xml; charset=utf-8' }
  });
}

function clean(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim().slice(0, 1200) : '';
}

function classify(body: string): string {
  if (/emergency|down|urgent|same day|asap/i.test(body)) return 'urgent_escalation';
  if (/quote|price|estimate|bid/i.test(body)) return 'quote_request';
  if (/schedule|book|appointment|tomorrow|today/i.test(body)) return 'schedule_request';
  return 'needs_review';
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = clean(formData.get('From'));
  const body = clean(formData.get('Body'));
  const state = classify(body);

  const intakeUrl = new URL('/api/ai-receptionist/intake', request.url);
  const delivered = await fetch(intakeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'twilio_sms_ai_receptionist',
      name: from || 'SMS lead',
      phone: from,
      serviceType: 'SMS service request',
      urgency: state,
      message: body,
      leadState: state
    }),
    cache: 'no-store'
  }).then((r) => r.ok).catch(() => false);

  const reply = delivered
    ? `Already Here LLC received your request. Reply with: service needed, city, urgency, preferred time, and any equipment/site notes. Current status: ${state}.`
    : 'Already Here LLC received your text, but automated delivery could not be confirmed. Please call 602-882-2920 if urgent.';

  return xmlResponse(reply);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'ai-receptionist-sms',
    status: 'ready',
    autonomous: true,
    mode: 'sms_lead_capture_and_qualification',
    timestamp: new Date().toISOString()
  });
}
