/**
 * Conversation knowledge layer — lets the AI receptionist answer questions
 * mid-conversation from two live sources:
 *
 * 1. The canonical store (jobs/work orders, assignments, closeouts,
 *    organizations, contacts, opportunities, revenue events) via
 *    `getCanonicalStore().queryTable`.
 * 2. The daily-command-os brain via `POST /api/brain/answer`
 *    (Bearer BRAIN_QUERY_SECRET, DCOS_SYNC_SECRET, or CRON_SECRET —
 *    whichever is configured; the endpoint serves non-sensitive items at
 *    agent tier).
 *
 * Failover: each source degrades independently; a source that errors is
 * skipped, and when nothing answers the question the conversation flow
 * continues uninterrupted.
 */

import { getCanonicalStore } from '@/lib/canonical-store';

const QUESTION_RE = /^(who|what|when|where|why|which|how|tell me|show me|list|count|how many|how much|status of|is there|are there|is|are|was|were|did|any|do you|do i|may i|could you|can you (?:tell|show|check|find|give|look))\b/i;

export function looksLikeQuestion(text: string): boolean {
  return QUESTION_RE.test(text.trim());
}

type CanonicalHit = { table: string; id: string; summary: string };

const TABLE_LABELS: Record<string, string> = {
  jobs: 'work order',
  assignments: 'assignment',
  closeouts: 'closeout',
  organizations: 'organization',
  contacts: 'contact',
  opportunities: 'opportunity',
  revenue_events: 'revenue event',
  leads: 'lead'
};

function recordSummary(table: string, record: Record<string, unknown>): string {
  const parts = [
    record.title || record.serviceType || record.service_type || record.name || record.id,
    record.status ? `status ${String(record.status)}` : '',
    record.siteCity || record.site_city || record.location || '',
    record.priority ? `priority ${String(record.priority)}` : ''
  ].filter(Boolean);
  return `${TABLE_LABELS[table] || table}: ${parts.map(String).join(', ')}`;
}

function terms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'for', 'with', 'you', 'your', 'any', 'are', 'there', 'what', 'when', 'where', 'how', 'many', 'much', 'does', 'have', 'about'].includes(w));
}

function matches(record: Record<string, unknown>, needles: string[]): number {
  const haystack = JSON.stringify(record).toLowerCase();
  return needles.reduce((score, needle) => score + (haystack.includes(needle) ? 1 : 0), 0);
}

async function queryCanonical(question: string): Promise<{ hits: CanonicalHit[]; counts: Record<string, number> }> {
  const needles = terms(question);
  const tableHints: Record<string, string[]> = {
    jobs: ['job', 'work order', 'dispatch', 'ticket', 'site', 'schedule'],
    assignments: ['assign', 'technician', 'tech'],
    closeouts: ['closeout', 'close', 'completed', 'finished'],
    opportunities: ['opportunity', 'pipeline', 'deal'],
    revenue_events: ['revenue', 'payment', 'sale', 'invoice'],
    leads: ['lead', 'inquiry', 'quote'],
    organizations: ['organization', 'company', 'client', 'customer'],
    contacts: ['contact', 'customer', 'person']
  };

  const counts: Record<string, number> = {};
  const hits: CanonicalHit[] = [];
  const tables = Object.keys(TABLE_LABELS);
  const preferred = tables.filter((t) => tableHints[t]?.some((h) => needles.some((n) => h.includes(n)) || question.toLowerCase().includes(h)));
  const scanOrder = [...preferred, ...tables.filter((t) => !preferred.includes(t))];

  for (const table of scanOrder) {
    try {
      const rows = await getCanonicalStore().queryTable(table, 10_000);
      counts[table] = rows.length;
      const scored = rows
        .map((r) => ({ r, score: matches(r, needles) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      for (const { r } of scored) {
        hits.push({ table, id: String(r.id ?? ''), summary: recordSummary(table, r) });
      }
    } catch {
      counts[table] = 0;
    }
    if (hits.length >= 5) break;
  }
  return { hits, counts };
}

function brainSecret(): string | undefined {
  return (
    process.env.BRAIN_QUERY_SECRET?.trim() ||
    process.env.BRAIN_ADMIN_SECRET?.trim() ||
    process.env.DCOS_SYNC_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    undefined
  );
}

async function queryBrain(question: string): Promise<string[]> {
  const secret = brainSecret();
  if (!secret) return [];
  const base = (process.env.COMMAND_CENTER_URL?.trim() || 'https://daily-command-os.vercel.app').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/brain/answer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ question, scopes: ['business', 'repo', 'sop', 'template'], limit: 5 }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) return [];
    const body = await res.json().catch(() => ({}));
    const facts = Array.isArray(body.facts) ? body.facts : [];
    return facts
      .slice(0, 5)
      .map((f: Record<string, unknown>) => {
        const v = f.value ?? f.text ?? f.fact ?? f.key;
        const text = typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v);
        return f.key ? `${String(f.key)}: ${text}` : text;
      })
      .filter((s: string) => s.length > 0);
  } catch {
    return [];
  }
}

export type KnowledgeAnswer = {
  answered: boolean;
  text: string;
  sources: { canonical: boolean; brain: boolean };
};

/**
 * Answer a free-text question from live business data. `operator: true`
 * (callers that proved access with the operator key) unlocks record-level
 * summaries and command-brain facts; public callers get aggregate counts
 * only — never record contents or brain rows. Returns `answered: false`
 * when no source produces anything, so the caller can simply continue the
 * intake flow.
 */
export async function answerQuestion(question: string, opts: { operator?: boolean } = {}): Promise<KnowledgeAnswer> {
  const operator = Boolean(opts.operator);
  const countQuestion = /\bhow many\b|\bcount\b|\btotal\b/i.test(question);
  const [canonical, brain] = await Promise.all([queryCanonical(question), operator ? queryBrain(question) : Promise.resolve([])]);

  const lines: string[] = [];
  const nonzero = Object.entries(canonical.counts).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${TABLE_LABELS[t] || t}${n === 1 ? '' : 's'}`);
  if (countQuestion || !operator || !canonical.hits.length) {
    if (nonzero.length) lines.push(`Current records: ${nonzero.join(', ')}.`);
  }
  if (operator && !countQuestion && canonical.hits.length) {
    lines.push(...canonical.hits.map((h) => h.summary));
  }
  if (brain.length) lines.push(...brain);

  return {
    answered: lines.length > 0,
    text: lines.join(' '),
    sources: { canonical: canonical.hits.length > 0, brain: brain.length > 0 }
  };
}
