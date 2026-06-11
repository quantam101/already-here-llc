import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

function clean(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim().slice(0, 1000) : '';
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const payload = {
    source: 'twilio_voice_recording',
    name: clean(formData.get('From')) || 'Unknown caller',
    phone: clean(formData.get('From')),
    serviceType: 'Voice intake recording',
    urgency: 'Callback required',
    message: [
      `Recording URL: ${clean(formData.get('RecordingUrl'))}`,
      `Recording duration: ${clean(formData.get('RecordingDuration')) || 'unknown'} seconds`,
      `Call SID: ${clean(formData.get('CallSid'))}`,
      `To: ${clean(formData.get('To'))}`
    ].filter(Boolean).join('\n')
  };

  const url = new URL('/api/ai-receptionist/intake', request.url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store'
  });

  const ok = res.ok;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${ok ? 'Thank you. Your request has been captured and queued for review. Already Here LLC will follow up when available.' : 'Thank you. Your message was recorded, but the intake queue could not confirm delivery. Please also text 602-882-2920.'}</Say>
</Response>`;

  return new NextResponse(xml, { status: 200, headers: { 'content-type': 'text/xml; charset=utf-8' } });
}
