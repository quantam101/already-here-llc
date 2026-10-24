import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { buildRevenueIntakeProof } from '@/lib/revenue-command-intake';
import { getCanonicalStore, isCanonicalStoreDurable } from '@/lib/canonical-store';

export const runtime = 'nodejs';

const GUIDE_PATH = '/api/phoenix-cabling-guide';
const FROM = 'Already Here LLC <dispatch@alreadyherellc.com>';
const OWNER_FALLBACK = 'dispatch@alreadyherellc.com';
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 4;
const attempts = new Map<string, { count: number; expires: number }>();

type Lead = {
  fullName: string;
  company: string;
  email: string;
  siteZip: string;
  projectType: string;
  projectStage: string;
  marketingConsent: boolean;
  utmSource: string;
  utmCampaign: string;
};

function clean(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}
function html(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160;
}
function clientKey(request: Request): string {
  return request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.expires <= now) {
    attempts.set(key, { count: 1, expires: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}
function normalize(body: Record<string, unknown>): Lead {
  return {
    fullName: clean(body.fullName, 120),
    company: clean(body.company, 160),
    email: clean(body.email, 160).toLowerCase(),
    siteZip: clean(body.siteZip, 80),
    projectType: clean(body.projectType, 80),
    projectStage: clean(body.projectStage, 50),
    marketingConsent: body.marketingConsent === true,
    utmSource: clean(body.utmSource, 100),
    utmCampaign: clean(body.utmCampaign, 100)
  };
}
function validate(data: Lead): string | null {
  if (!data.fullName || !data.company || !data.email || !data.siteZip) return 'Complete all required fields.';
  if (!isEmail(data.email)) return 'Enter a valid business email address.';
  if (!/^[A-Za-z0-9][A-Za-z0-9\s,.-]{1,79}$/.test(data.siteZip)) return 'Enter a valid Phoenix-area ZIP code or location.';
  if (!['Office build-out', 'Warehouse expansion', 'Network upgrade', 'Other / not sure'].includes(data.projectType)) return 'Select a project type.';
  if (!['Active project', 'Planning', 'Researching'].includes(data.projectStage)) return 'Select a project stage.';
  return null;
}
async function sendResend(payload: Record<string, unknown>): Promise<string> {
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store'
  });
  if (!result.ok) throw new Error('Email provider rejected campaign delivery.');
  const body = await result.json() as { id?: string };
  return body.id || '';
}
// Marketing starts only after explicit opt-in and confirmed receipt delivery.
// Resend's event trigger is not a substitute for the site's consent record.
async function startOptInNurture(lead: Lead, leadId: string): Promise<boolean> {
  if (!lead.marketingConsent || !process.env.RESEND_API_KEY) return false;
  const result = await fetch('https://api.resend.com/events', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'phoenix-cabling-optin/' + leadId
    },
    body: JSON.stringify({
      event: 'phoenix.cabling.opted_in',
      email: lead.email,
      payload: {
        company: lead.company,
        project_stage: lead.projectStage,
        lead_id: leadId,
        source: lead.utmSource || 'website'
      }
    }),
    cache: 'no-store'
  });
  return result.ok;
}
async function sendFormspree(record: Record<string, string>): Promise<void> {
  const response = await fetch(process.env.FORMSPREE_ENDPOINT!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(record),
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Lead receiver rejected submission.');
}
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return NextResponse.json({ message: 'Expected JSON.' }, { status: 415, headers });
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: 'Invalid request origin.' }, { status: 403, headers });
  }
  if (rateLimited(clientKey(request))) {
    return NextResponse.json({ message: 'Too many requests. Try again later.' }, { status: 429, headers });
  }
  const rawText = await request.text();
  if (rawText.length > 8000) return NextResponse.json({ message: 'Request too large.' }, { status: 413, headers });
  let raw: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Bad data');
    raw = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400, headers });
  }
  if (clean(raw.website, 100)) return NextResponse.json({ message: 'Submission rejected.' }, { status: 400, headers });
  const data = normalize(raw);
  const error = validate(data);
  if (error) return NextResponse.json({ message: error }, { status: 400, headers });
  const resendReady = Boolean(process.env.RESEND_API_KEY && process.env.DISPATCH_TO_EMAIL);
  const formspreeReady = Boolean(process.env.FORMSPREE_ENDPOINT);
  if (!resendReady && !formspreeReady) {
    return NextResponse.json({ message: 'Campaign delivery is temporarily unavailable. Please contact dispatch@alreadyherellc.com.' }, { status: 503, headers });
  }

  const leadId = 'AH-CBL-' + randomUUID();
  const site = new URL(request.url).origin;
  const guideUrl = site + GUIDE_PATH;
  const createdAt = new Date().toISOString();
  const record = {
    ...data, leadId, source: 'phoenix_cabling_checklist', createdAt,
    guideUrl, permissionToMarket: data.marketingConsent ? 'yes' : 'no'
  };
  // Existing canonical graph is used only when the selected backend is durable.
  // Email/Formspree serves as the backup lead record; volatile serverless memory never counts as persistence.
  let graphPersisted = false;
  if (isCanonicalStoreDurable()) {
    try {
      const proof = buildRevenueIntakeProof({
        source: record.source, sourceId: leadId, channel: 'web',
        fullName: data.fullName, company: data.company, email: data.email,
        title: 'Phoenix Commercial IT Cabling Checklist request',
        body: 'Network cabling guide. Project: ' + data.projectType +
          '. Stage: ' + data.projectStage + '. Marketing opt-in: ' + record.permissionToMarket,
        location: data.siteZip, serviceType: 'Commercial cabling planning',
        submittedAt: createdAt
      });
      for (const write of proof.databaseReadyWrites) {
        if (write.table === 'contacts') write.record.consent_status = data.marketingConsent ? 'opted_in' : 'not_opted_in';
      }
      const result = await getCanonicalStore().executeWrites(proof.databaseReadyWrites);
      graphPersisted = result.ok;
    } catch {
      graphPersisted = false;
    }
  }
  let receiptSent = false;
  try {
    if (resendReady) {
      const fields = [
        ['Lead ID', leadId], ['Name', data.fullName], ['Company', data.company],
        ['Email', data.email], ['Project location', data.siteZip],
        ['Project type', data.projectType], ['Project stage', data.projectStage],
        ['Marketing permission', record.permissionToMarket],
        ['UTM source', data.utmSource || 'Direct'], ['UTM campaign', data.utmCampaign || 'None'],
        ['Canonical graph persisted', String(graphPersisted)]
      ];
      const ownerHtml = '<h2>New Phoenix cabling guide lead</h2><table>' +
        fields.map(([key, value]) => '<tr><th align="left" style="padding:6px">' + html(key) + '</th><td style="padding:6px">' + html(value) + '</td></tr>').join('') +
        '</table><p>A guide request is not a booked consultation. Follow up according to recorded consent.</p>';
      await sendResend({
        from: FROM, to: [process.env.DISPATCH_TO_EMAIL!],
        reply_to: data.email,
        subject: '[' + leadId + '] Phoenix Cabling Guide: ' + data.company,
        html: ownerHtml,
        attachments: [{ filename: leadId + '.json', content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64') }]
      });
      try {
        await sendResend({
          from: FROM, to: [data.email], reply_to: OWNER_FALLBACK,
          subject: 'Your Phoenix Commercial IT Cabling Checklist | Already Here LLC',
          html: '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h1>Your checklist is ready</h1>' +
            '<p>Hello ' + html(data.fullName) + ',</p><p>Thank you for requesting the Phoenix commercial IT cabling planning guide.</p>' +
            '<p><a href="' + guideUrl + '">Download the free PDF checklist</a></p>' +
            '<p>For an optional project scope review, <a href="' + site + '/rfq">request an assessment</a> or reply to this email.</p>' +
            '<p>Already Here LLC · Phoenix, AZ · dispatch@alreadyherellc.com</p></div>'
        });
        receiptSent = true;
      } catch {
        // Direct download is still available on successful submission.
      }
    } else {
      await sendFormspree(Object.fromEntries(Object.entries(record).map(([key, value]) => [key, String(value)])));
    }
  } catch {
    return NextResponse.json({ message: 'We could not confirm lead delivery. Please try again or contact dispatch@alreadyherellc.com.' }, { status: 502, headers });
  }
  // Sending a nurture event is strictly opt-in, and never blocks the requested PDF receipt.
  // Failed event delivery is observable to the owner but is not reported as enrollment.
  let marketingEnrolled = false;
  if (data.marketingConsent && receiptSent && graphPersisted) {
    try {
      marketingEnrolled = await startOptInNurture(data, leadId);
    } catch {
      marketingEnrolled = false;
    }
    if (!marketingEnrolled && resendReady) {
      try {
        await sendResend({
          from: FROM, to: [process.env.DISPATCH_TO_EMAIL!],
          subject: '[' + leadId + '] Nurture enrollment requires retry',
          text: 'An opted-in Phoenix cabling lead was delivered, but the nurture event was not accepted. Review the consent record and reconcile this lead before any manual retry. Lead ID: ' + leadId
        });
      } catch {
        // Never send unsolicited marketing due to an alerting failure.
      }
    }
  }
  return NextResponse.json({ ok: true, leadId, guideUrl: GUIDE_PATH, receiptSent, marketingEnrolled }, { status: 201, headers });
}
export async function GET() {
  return NextResponse.json({
    service: 'phoenix-cabling-lead', status: 'ok',
    emailDeliveryAvailable: Boolean(process.env.RESEND_API_KEY && process.env.DISPATCH_TO_EMAIL),
    fallbackAvailable: Boolean(process.env.FORMSPREE_ENDPOINT),
    durableGraphAvailable: isCanonicalStoreDurable(),
    automatedMarketingEnabled: Boolean(process.env.RESEND_API_KEY && process.env.DISPATCH_TO_EMAIL && isCanonicalStoreDurable()),
    smsEnabled: false
  }, { headers: { 'Cache-Control': 'no-store' } });
}
