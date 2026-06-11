import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

function clean(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim().slice(0, 1200) : '';
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const speech = clean(formData.get('SpeechResult'));
  const payload = {
    source: speech ? 'twilio_speech_qualified_voice' : 'twilio_voice_recording',
    name: clean(formData.get('From')) || 'Voice caller',
    phone: clean(formData.get('From')),
    serviceType: speech ? 'Speech-qualified service request' : 'Voice intake recording',
    urgency: /urgent|emergency|same day|down|asap/i.test(speech) ? 'urgent_voice_lead' : 'callback_required',
    leadState: speech ? 'qualified_voice_lead' : 'voice_recording_review',
    message: speech || [
      `Recording URL: ${clean(formData.get('RecordingUrl'))}`,
      `Recording duration: ${clean(formData.get('RecordingDuration')) || 'unknown'} seconds`,
      `Call SID: ${clean(formData.get('CallSid'))}`,
      `To: ${clean(formData.get('To'))}`
    ].filter(Boolean).join('\n')
  };

  const res = await fetch(new URL('/api/ai-receptionist/intake', request.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store'
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${res.ok ? 'Thank you. I captured your request and routed it to Already Here LLC for review.' : 'Thank you. Your message was captured, but automated delivery could not confirm.'}</Say></Response>`;
  return new NextResponse(xml, { status: 200, headers: { 'content-type': 'text/xml; charset=utf-8' } });
}
