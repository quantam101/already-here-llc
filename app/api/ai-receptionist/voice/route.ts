import { NextResponse } from 'next/server.js';

export const runtime = 'nodejs';

function xmlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    status: 200,
    headers: { 'content-type': 'text/xml; charset=utf-8' }
  });
}

function baseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function speechEnabled(): boolean {
  const tier = (process.env.AI_RECEPTIONIST_TIER || 'pro').trim();
  return tier === 'pro' || tier === 'officeManager';
}

export async function GET(request: Request) {
  const root = baseUrl(request);
  const action = `${root}/api/ai-receptionist/voice/recording`;

  if (!speechEnabled()) {
    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling Already Here LLC. Please leave your name, company, phone number, city, service needed, urgency, preferred callback window, and any site or equipment notes after the tone.</Say>
  <Record action="${action}" method="POST" maxLength="180" playBeep="true" trim="trim-silence" />
</Response>`);
  }

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${action}" method="POST" speechTimeout="auto" timeout="8">
    <Say voice="alice">Thank you for calling Already Here LLC. I am the AI receptionist. Please say your name, company, phone number, city, service needed, urgency, preferred callback window, and any site or equipment notes. I will route the request for review.</Say>
  </Gather>
  <Say voice="alice">I did not hear enough information. Please leave the same details after the tone.</Say>
  <Record action="${action}" method="POST" maxLength="180" playBeep="true" trim="trim-silence" />
</Response>`);
}

export async function POST(request: Request) {
  return GET(request);
}
