import { canonicalId } from './canonical-ids';
import { safeCanonicalUpsert } from './canonical-upsert';
import type { CanonicalStore } from './canonical-store';

/**
 * Email work-history intake. Parses mbox/Takeout exports into structured
 * messages, classifies them by marketplace + signal, and writes canonical
 * jobs / closeout evidence / contacts so past Field Nation & WorkMarket
 * work lands in the completed-work database.
 *
 * Nothing here fabricates records: an email only becomes a job when it
 * carries a completion/assignment signal from a known work platform, and
 * the source email (message id) is always preserved as evidence.
 */

export interface ParsedEmail {
  message_id: string;
  from: string;
  from_email: string;
  from_name: string;
  to: string;
  subject: string;
  date: string; // ISO
  body_excerpt: string;
  attachments: string[]; // filenames only — content stays in the export
}

export type EmailSource = 'field_nation' | 'work_market' | 'gmail';
export type EmailSignal = 'closeout_evidence' | 'assignment' | 'invoice' | 'generic';

export interface ClassifiedEmail extends ParsedEmail {
  source: EmailSource;
  signal: EmailSignal;
  work_order_ref: string | null;
}

export interface EmailIntakeResult {
  scanned: number;
  imported_jobs: number;
  contacts: number;
  evidence: number;
  skipped: number;
}

const HEADER_END = /\r?\n\r?\n/;

function decodeHeaderValue(v: string): string {
  // RFC 2047 encoded-word decode (=?UTF-8?B?...?= / =?UTF-8?Q?...?=)
  return v.replace(/=\?[^?]+\?([BQ])\?([^?]+)\?=/gi, (_m, enc: string, data: string) => {
    try {
      const buf = enc.toUpperCase() === 'B'
        ? Buffer.from(data, 'base64')
        : Buffer.from(data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, '%$1'), 'utf8' as never);
      return buf.toString('utf8');
    } catch {
      return data;
    }
  });
}

function parseHeaders(block: string): Record<string, string> {
  const headers: Record<string, string> = {};
  // Unfold continuation lines, then split.
  for (const line of block.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    headers[line.slice(0, idx).trim().toLowerCase()] = decodeHeaderValue(line.slice(idx + 1).trim());
  }
  return headers;
}

function addrParts(from: string): { email: string; name: string } {
  const m = /^(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/.exec(from.trim());
  if (m) return { name: (m[1] ?? '').trim(), email: m[2].trim().toLowerCase() };
  return { name: '', email: from.trim().toLowerCase() };
}

function decodeBody(raw: string, encoding: string): string {
  const enc = encoding.toLowerCase();
  try {
    if (enc === 'base64') return Buffer.from(raw.replace(/\s+/g, ''), 'base64').toString('utf8');
    if (enc === 'quoted-printable') {
      return Buffer.from(
        raw.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16))),
        'binary'
      ).toString('utf8');
    }
  } catch {
    return '';
  }
  return raw;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
}

/**
 * Parse one RFC822 message (single part or multipart) into a ParsedEmail.
 * For multipart we prefer text/plain; attachment content is NOT decoded —
 * only filenames are recorded.
 */
export function parseEmail(raw: string): ParsedEmail | null {
  const split = HEADER_END.exec(raw);
  if (!split) return null;
  const headers = parseHeaders(raw.slice(0, split.index));
  const body = raw.slice(split.index + split[0].length);

  const contentType = headers['content-type'] ?? 'text/plain';
  const attachments: string[] = [];
  let excerpt = '';

  const boundary = /boundary="?([^";]+)"?/i.exec(contentType)?.[1];
  if (/multipart\//i.test(contentType) && boundary) {
    const parts = body.split(`--${boundary}`);
    for (const part of parts) {
      if (part.startsWith('--') || !part.trim()) continue;
      const ps = HEADER_END.exec(part);
      if (!ps) continue;
      const ph = parseHeaders(part.slice(0, ps.index));
      const pbody = part.slice(ps.index + ps[0].length);
      const pct = ph['content-type'] ?? '';
      const cd = ph['content-disposition'] ?? '';
      const filename = /filename="?([^";]+)"?/i.exec(cd)?.[1] ?? /name="?([^";]+)"?/i.exec(pct)?.[1];
      if (/attachment/i.test(cd) || filename) {
        if (filename) attachments.push(filename.trim());
        continue;
      }
      if (!excerpt && /text\/(plain|html)/i.test(pct)) {
        let t = decodeBody(pbody, ph['content-transfer-encoding'] ?? '7bit');
        if (/html/i.test(pct)) t = stripHtml(t);
        excerpt = t.trim();
      }
    }
  } else {
    let t = decodeBody(body, headers['content-transfer-encoding'] ?? '7bit');
    if (/html/i.test(contentType)) t = stripHtml(t);
    excerpt = t.trim();
  }

  const { email, name } = addrParts(headers.from ?? '');
  if (!email) return null;
  const date = Date.parse(headers.date ?? '');
  return {
    message_id: (headers['message-id'] ?? headers['message-id'.toLowerCase()] ?? '').replace(/[<>]/g, '').trim()
      || canonicalId('email', email, headers.subject ?? '', headers.date ?? ''),
    from: headers.from ?? '',
    from_email: email,
    from_name: name,
    to: headers.to ?? '',
    subject: headers.subject ?? '',
    date: Number.isFinite(date) ? new Date(date).toISOString() : '',
    body_excerpt: excerpt.slice(0, 4000),
    attachments,
  };
}

/** Split a raw mbox file into individual RFC822 messages. */
export function splitMbox(mbox: string): string[] {
  return mbox
    .split(/\r?\nFrom [^\r\n]*\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const SOURCE_RULES: [RegExp, EmailSource][] = [
  [/fieldnation\.com|field nation/i, 'field_nation'],
  [/workmarket\.com|work market/i, 'work_market'],
];

const SIGNAL_RULES: [RegExp, EmailSignal][] = [
  [/work order.*(completed|closed|approved|signed off)|completion|completed work|sign[- ]?off|deliverable.*approved|resolved|closed.*work order/i, 'closeout_evidence'],
  [/assigned|routed to you|accept(ed)? the work order|new work order|work order.*published/i, 'assignment'],
  [/invoice|payment|remittance|paid in full|amount due/i, 'invoice'],
];

const WO_REF = /(?:work order|wo|order|job|task)[#:\s-]*([A-Z0-9-]{5,20})/i;

export function classifyEmail(msg: ParsedEmail): ClassifiedEmail {
  const hay = `${msg.from} ${msg.subject} ${msg.body_excerpt.slice(0, 800)}`;
  let source: EmailSource = 'gmail';
  for (const [re, s] of SOURCE_RULES) {
    if (re.test(hay)) { source = s; break; }
  }
  let signal: EmailSignal = 'generic';
  for (const [re, s] of SIGNAL_RULES) {
    if (re.test(hay)) { signal = s; break; }
  }
  const refMatch = WO_REF.exec(`${msg.subject} ${msg.body_excerpt.slice(0, 500)}`);
  return { ...msg, source, signal, work_order_ref: refMatch?.[1]?.toUpperCase() ?? null };
}

/**
 * Ingest a batch of classified emails into the canonical store.
 * - closeout_evidence / assignment / invoice from a work platform → job
 *   record with the email message id preserved as evidence.
 * - every platform email → a contact record for the sender mailbox.
 * - emails that carry no work signal are skipped (counted, not stored).
 */
export async function ingestEmails(emails: ClassifiedEmail[], store: CanonicalStore): Promise<EmailIntakeResult> {
  const result: EmailIntakeResult = { scanned: emails.length, imported_jobs: 0, contacts: 0, evidence: 0, skipped: 0 };
  const now = new Date().toISOString();
  const writes: { table: string; id: string; record: Record<string, unknown> }[] = [];

  for (const msg of emails) {
    if (msg.source === 'gmail' || msg.signal === 'generic') { result.skipped += 1; continue; }

    const contactId = canonicalId('contact', msg.from_email);
    writes.push({
      table: 'contacts',
      id: contactId,
      record: {
        id: contactId,
        full_name: msg.from_name || msg.from_email,
        email: msg.from_email,
        source: 'email_takeout',
        role: 'platform_mailbox',
        updated_at: now,
      },
    });
    result.contacts += 1;

    const jobId = msg.work_order_ref
      ? canonicalId('job', `${msg.source}:${msg.work_order_ref}`)
      : canonicalId('job', `email:${msg.message_id}`);
    writes.push({
      table: 'jobs',
      id: jobId,
      record: {
        id: jobId,
        service_type: msg.subject.slice(0, 200),
        status: msg.signal === 'closeout_evidence' ? 'completed' : msg.signal === 'invoice' ? 'invoiced' : 'assigned',
        source: `email_takeout:${msg.source}`,
        source_ref: msg.work_order_ref,
        platform: msg.source,
        contact_id: contactId,
        completed_at: msg.signal === 'closeout_evidence' ? msg.date : null,
        evidence_message_id: msg.message_id,
        photo_count: msg.attachments.length,
        evidence_attachments: msg.attachments.slice(0, 50),
        updated_at: now,
      },
    });
    result.imported_jobs += 1;

    writes.push({
      table: 'closeout_evidence',
      id: canonicalId('evidence', msg.message_id),
      record: {
        id: canonicalId('evidence', msg.message_id),
        job_id: jobId,
        message_id: msg.message_id,
        signal: msg.signal,
        platform: msg.source,
        subject: msg.subject.slice(0, 300),
        from_email: msg.from_email,
        date: msg.date,
        attachments: msg.attachments.slice(0, 50),
        body_excerpt: msg.body_excerpt.slice(0, 2000),
        updated_at: now,
      },
    });
    result.evidence += 1;
  }

  for (const w of writes) {
    await safeCanonicalUpsert(w.table, w.id, w.record, store);
  }
  return result;
}
