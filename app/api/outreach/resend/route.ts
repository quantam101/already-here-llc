import { NextResponse } from 'next/server';
import { isInternalApiKeyValid } from '@/lib/internal-auth';
import { getCanonicalStore } from '@/lib/canonical-store';
import { normalizeEmail } from '@/lib/canonical-ids';
import { buildFollowUpRecord } from '@/lib/followups';
import { verifyRecipient } from '@/lib/email-verification';

export const runtime = 'nodejs';

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }
  if (!isInternalApiKeyValid(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const bounceId = asString(body.bounceId);
  const approved = body.approved === true;

  if (!bounceId) {
    return NextResponse.json({ ok: false, error: 'bounceId is required.' }, { status: 400 });
  }

  const store = getCanonicalStore();
  const bounce = await store.getRecord('bounces', bounceId);
  if (!bounce) {
    return NextResponse.json({ ok: false, error: 'Bounce record not found.' }, { status: 404 });
  }

  if (bounce.approved_for_resend && !approved) {
    return NextResponse.json({ ok: false, error: 'Bounce already approved; use approved=true to resend.' }, { status: 400 });
  }

  const replacementId = asString(body.replacementContactId) || asString(bounce.replacement_contact_id);
  if (!replacementId) {
    return NextResponse.json({ ok: false, error: 'No replacement contact available for resend.' }, { status: 400 });
  }

  const replacement = await store.getRecord('contacts', replacementId);
  if (!replacement || !replacement.email) {
    return NextResponse.json({ ok: false, error: 'Replacement contact not found.' }, { status: 404 });
  }

  if (!approved) {
    // Return candidate for human approval without sending
    return NextResponse.json({
      ok: true,
      status: 'awaiting_approval',
      bounceId,
      candidate: {
        contactId: replacementId,
        fullName: replacement.full_name,
        email: replacement.email,
      },
      message: 'Approve with approved=true to verify and enqueue resend.',
    });
  }

  // Human approval received: verify the replacement email and record the resend intent
  const verification = await verifyRecipient(String(replacement.email));

  const now = new Date().toISOString();
  const resendId = `resend_${Date.now()}_${normalizeEmail(String(replacement.email))}`;

  const followUp = buildFollowUpRecord({
    source: 'resend_api',
    sourceId: bounceId,
    organizationId: String(replacement.organization_id),
    contactId: replacementId,
    relatedRecordType: 'resend',
    relatedRecordId: resendId,
    lane: 'outreach',
    purpose: `Approved resend to ${replacement.full_name} <${replacement.email}> after bounce ${bounce.email}`,
    channel: 'email',
    offer: 'bounce_replacement',
    dueAt: now,
    status: 'open',
    createdAt: now,
  });

  const writes = [
    {
      table: 'bounces',
      id: bounceId,
      action: 'upsert' as const,
      record: {
        id: bounceId,
        approved_for_resend: true,
        resend_contact_id: replacementId,
        resend_verified: verification.reachable,
        updated_at: now,
      },
    },
    {
      table: 'resends',
      id: resendId,
      action: 'insert' as const,
      record: {
        id: resendId,
        bounce_id: bounceId,
        contact_id: replacementId,
        organization_id: replacement.organization_id,
        email: replacement.email,
        verified: verification.reachable,
        verification_reason: verification.reason,
        sent_at: verification.reachable ? now : null,
        status: verification.reachable ? 'pending_send' : 'blocked_unverified',
        created_at: now,
        updated_at: now,
      },
    },
    followUp,
  ];

  const result = await store.executeWrites(writes);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: result.failed }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    resendId,
    bounceId,
    replacementContactId: replacementId,
    verified: verification.reachable,
    reason: verification.reason,
    status: verification.reachable ? 'pending_send' : 'blocked_unverified',
    note: 'The resend is queued in the canonical graph; wire this to your mailer to actually deliver.',
  });
}
