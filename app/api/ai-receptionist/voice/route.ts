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

export async function GET(request: Request) {
  const root = baseUrl(request);
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling Already Here LLC. This is the AI receptionist intake line. Please leave your name, company, phone number, city, service needed, urgency, and preferred callback window after the tone.</Say>
  <Record action="${root}/api/ai-receptionist/voice/recording" method="POST" maxLength="180" playBeep="true" trim="trim-silence" />
  <Say voice="alice">We did not receive a recording. Please call or text 602-882-2920, or submit the intake form at already here L L C dot com.</Say>
</Response>`);
}

export async function POST(request: Request) {
  return GET(request);
}
