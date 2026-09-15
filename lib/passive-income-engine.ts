/**
 * Passive Income Engine — three zero-upfront AI income systems run by a
 * supervisor and one specialised agent per process.
 *
 *   technical-ebook      outline → chapters → compile → listing
 *   stock-asset-factory  prompt-batch → metadata → upload-manifest
 *   industry-newsletter  ingest → synthesis → publish-packet
 *
 * The supervisor owns scheduling, retries, A+ quality gates, and the approval
 * gate. Every stage returns graded artifacts; nothing is published, uploaded,
 * or listed without an approval packet. Zero-spend policy: no paid adapters,
 * every run records `spendUsd: 0`. LLM access goes through the injectable
 * `complete` function (defaults to the LiteLLM gateway chain) and every
 * agent has a deterministic template fallback so the pipeline still produces
 * reviewable output offline.
 */

import { randomUUID } from 'node:crypto';
import { llmComplete, type LLMMessage } from './llm-gateway';

export type IncomeSystemId = 'technical-ebook' | 'stock-asset-factory' | 'industry-newsletter';

export const INCOME_SYSTEM_IDS: IncomeSystemId[] = ['technical-ebook', 'stock-asset-factory', 'industry-newsletter'];

export type ProcessAgentId =
  | 'pie-ebook-outline'
  | 'pie-ebook-chapters'
  | 'pie-ebook-compiler'
  | 'pie-ebook-listing'
  | 'pie-stock-prompts'
  | 'pie-stock-metadata'
  | 'pie-stock-upload'
  | 'pie-news-ingest'
  | 'pie-news-synthesis'
  | 'pie-news-publish';

export type ArtifactKind =
  | 'outline.json'
  | 'chapter.typ'
  | 'book.typ'
  | 'book.md'
  | 'listing.json'
  | 'prompt-batch.json'
  | 'stock-metadata.json'
  | 'stock-upload.csv'
  | 'ingest.json'
  | 'newsletter.md'
  | 'publish-packet.json';

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'F';

export type StageStatus = 'passed' | 'passed_pending_approval' | 'failed' | 'skipped';

export type Provenance = 'llm' | 'deterministic-template';

export interface QualityCheck {
  id: string;
  ok: boolean;
  weight: number;
  detail: string;
}

export interface Artifact {
  key: string;
  kind: ArtifactKind;
  content: string;
  provenance: Provenance;
  bytes: number;
}

export interface StageResult {
  agentId: ProcessAgentId;
  status: StageStatus;
  attempts: number;
  score: number;
  grade: Grade;
  checks: QualityCheck[];
  artifacts: Artifact[];
  notes: string[];
  approvalRequired: boolean;
}

export interface EngineRun {
  runId: string;
  systemId: IncomeSystemId;
  input: SystemInput;
  startedAt: string;
  finishedAt: string;
  stages: StageResult[];
  ok: boolean;
  overallScore: number;
  overallGrade: Grade;
  spendUsd: 0;
  approvalQueue: string[];
  nextAction: string;
}

export interface ProcessAgent {
  id: ProcessAgentId;
  systemId: IncomeSystemId;
  order: number;
  name: string;
  mission: string;
  prompt: string;
  produces: ArtifactKind[];
  consumes: ArtifactKind[];
  approvalRequired: boolean;
  maxAttempts: number;
  passThreshold: number;
}

export interface IncomeSystem {
  id: IncomeSystemId;
  name: string;
  phase: 1 | 2 | 3;
  flow: string;
  storefronts: string[];
  freeTierStack: string[];
  unitEconomics: {
    priceLowUsd: number;
    priceHighUsd: number;
    platformFeePct: number;
    costToProduceUsd: 0;
    note: string;
  };
  kpis: string[];
  agents: ProcessAgent[];
}

export interface EbookInput {
  systemId: 'technical-ebook';
  topic: string;
  audience?: string;
  chapterCount?: number;
  priceUsd?: number;
}

export interface StockInput {
  systemId: 'stock-asset-factory';
  niche: 'seamless-tech-backgrounds' | 'ui-icon-collections' | 'corporate-slide-textures';
  batchSize?: number;
}

export interface NewsletterFeedItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
}

export interface NewsletterInput {
  systemId: 'industry-newsletter';
  niche: string;
  items: NewsletterFeedItem[];
  affiliateTools?: Array<{ name: string; url: string; pitch: string }>;
  issueDate?: string;
}

export type SystemInput = EbookInput | StockInput | NewsletterInput;

export interface EngineContext {
  complete: (messages: LLMMessage[], maxTokens: number) => Promise<string | null>;
  now: () => Date;
  random: () => number;
  /** Run-wide wall-clock budget; once exhausted every remaining stage completes deterministically. */
  budgetMs?: number;
}

const FALLBACK_MARKER = 'Level-4 deterministic fallback is active';

export function createEngineContext(overrides: Partial<EngineContext> = {}): EngineContext {
  const complete = overrides.complete ?? ((messages, maxTokens) => llmComplete(messages, maxTokens));
  const budgetMs = overrides.budgetMs;
  if (budgetMs === undefined) {
    return { complete, now: overrides.now ?? (() => new Date()), random: overrides.random ?? Math.random };
  }
  const deadline = Date.now() + budgetMs;
  const budgeted: EngineContext['complete'] = (messages, maxTokens) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return Promise.resolve(null);
    return Promise.race([
      complete(messages, maxTokens),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), remaining).unref?.())
    ]);
  };
  return { complete: budgeted, now: overrides.now ?? (() => new Date()), random: overrides.random ?? Math.random, budgetMs };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Robust JSON extraction: strips ``` fences and finds the outermost array/object. */
export function extractJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  const stripped = raw.replace(/```(?:json)?/gi, '').trim();
  const candidates = [stripped];
  const firstArray = stripped.indexOf('[');
  const firstObject = stripped.indexOf('{');
  const start = [firstArray, firstObject].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  if (start !== undefined && start > 0) candidates.push(stripped.slice(start));
  for (const candidate of candidates) {
    const closers = ['}', ']'];
    for (const closer of closers) {
      const end = candidate.lastIndexOf(closer);
      if (end < 0) continue;
      try {
        return JSON.parse(candidate.slice(0, end + 1)) as T;
      } catch {
        // try next candidate
      }
    }
  }
  return null;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'untitled';
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isUsableCompletion(raw: string | null): raw is string {
  return typeof raw === 'string' && raw.trim().length > 0 && !raw.includes(FALLBACK_MARKER);
}

/** Phrases the content guard forbids anywhere in generated commercial copy. */
const FORBIDDEN_CLAIM_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: 'guaranteed-income', pattern: /guaranteed (income|returns|profit)/i },
  { id: 'risk-free', pattern: /risk[-\s]free/i },
  { id: 'get-rich', pattern: /get rich (quick|fast)/i },
  { id: 'official-endorsement', pattern: /officially (endorsed|certified) by (google|adobe|aws|microsoft)/i }
];

export function findForbiddenClaims(text: string): string[] {
  return FORBIDDEN_CLAIM_PATTERNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.id);
}

export function scoreToGrade(score: number): Grade {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  return 'F';
}

export function scoreChecks(checks: QualityCheck[]): number {
  const total = checks.reduce((sum, item) => sum + item.weight, 0);
  if (total === 0) return 0;
  const earned = checks.filter((item) => item.ok).reduce((sum, item) => sum + item.weight, 0);
  return Math.round((earned / total) * 1000) / 10;
}

/** Checks that must pass regardless of weighted score: policy, disclosure, and approval gates. */
const HARD_GATE_PATTERN = /(no-forbidden-claims|no-banned-terms|disclosure|generative-ai-flag|generative-flag|template-filled|colophon|draft-status|approval-gate)$/;

export function isHardGate(checkId: string): boolean {
  return HARD_GATE_PATTERN.test(checkId);
}

export function hardGatesPass(checks: QualityCheck[]): boolean {
  return checks.every((check) => check.ok || !isHardGate(check.id));
}

export function stagePasses(agent: Pick<ProcessAgent, 'passThreshold'>, checks: QualityCheck[]): boolean {
  return scoreChecks(checks) >= agent.passThreshold && hardGatesPass(checks);
}

function qc(id: string, ok: boolean, weight: number, detail: string): QualityCheck {
  return { id, ok, weight, detail };
}

function artifact(key: string, kind: ArtifactKind, content: string, provenance: Provenance): Artifact {
  return { key, kind, content, provenance, bytes: Buffer.byteLength(content, 'utf8') };
}

function findArtifact(stages: StageResult[], kind: ArtifactKind): Artifact | undefined {
  for (let index = stages.length - 1; index >= 0; index -= 1) {
    const match = stages[index].artifacts.find((item) => item.kind === kind);
    if (match) return match;
  }
  return undefined;
}

function findArtifacts(stages: StageResult[], kind: ArtifactKind): Artifact[] {
  return stages.flatMap((stage) => stage.artifacts.filter((item) => item.kind === kind));
}

// ---------------------------------------------------------------------------
// System + agent registry
// ---------------------------------------------------------------------------

const SUPERVISOR_PROMPT =
  'You are the Passive Income Engine supervisor. You never publish, upload, list, or spend. You run each process agent in order, grade its artifact against the A+ rubric, retry a failing stage at most once with the failing checks appended to the prompt, and stop the run with a named next action when a stage still fails. Publish-class stages produce approval packets for a human reviewer. Record spend as $0 on every run and refuse any paid adapter.';

const AGENTS: ProcessAgent[] = [
  {
    id: 'pie-ebook-outline',
    systemId: 'technical-ebook',
    order: 1,
    name: 'eBook Outline Agent',
    mission: 'Turn a topic into a 5-8 chapter outline that a senior engineer would pay for.',
    prompt:
      'You architect technical micro-eBooks. Given a topic and audience, return ONLY a JSON array of chapters, each with "title" and "points" (3-6 concrete, non-overlapping points). Order chapters from foundations to production operations. Reject vague chapter titles like "Introduction"; every title must name a concrete outcome.',
    produces: ['outline.json'],
    consumes: [],
    approvalRequired: false,
    maxAttempts: 2,
    passThreshold: 90
  },
  {
    id: 'pie-ebook-chapters',
    systemId: 'technical-ebook',
    order: 2,
    name: 'eBook Chapter Agent',
    mission: 'Draft each chapter in Typst with runnable code examples.',
    prompt:
      'You write one chapter of a technical guide in raw Typst markup. Use == for section headings and === for subsections, ```lang fenced raw blocks for code, and plain paragraphs for prose. Every chapter needs at least two complete code examples with explanation, one pitfalls section, and one checklist. Never wrap the whole output in a fence, never claim guaranteed results, and never invent library APIs.',
    produces: ['chapter.typ'],
    consumes: ['outline.json'],
    approvalRequired: false,
    maxAttempts: 2,
    passThreshold: 90
  },
  {
    id: 'pie-ebook-compiler',
    systemId: 'technical-ebook',
    order: 3,
    name: 'eBook Compiler Agent',
    mission: 'Assemble chapters into a publication-grade Typst document and Markdown mirror.',
    prompt:
      'You assemble chapters into the document template: title page, outline, numbered headings, page breaks between chapters, and a colophon that states the guide was produced with AI assistance and human review. Emit both book.typ (for typst compile) and book.md (for blog excerpts). Fail if any chapter from the outline is missing.',
    produces: ['book.typ', 'book.md'],
    consumes: ['outline.json', 'chapter.typ'],
    approvalRequired: false,
    maxAttempts: 1,
    passThreshold: 95
  },
  {
    id: 'pie-ebook-listing',
    systemId: 'technical-ebook',
    order: 4,
    name: 'Storefront Listing Agent',
    mission: 'Produce a Gumroad/Payhip listing packet ready for human approval.',
    prompt:
      'You write storefront listings for technical guides. Return ONLY JSON with "title" (<=70 chars), "subtitle", "description" (120-350 words, leads with the buyer problem), "bullets" (5-8 concrete outcomes), "tags" (8-15 lowercase), "priceUsd" (9.99-19.99), "disclosure" (AI-assisted, human-reviewed). No income promises, no fake scarcity, no invented testimonials.',
    produces: ['listing.json'],
    consumes: ['outline.json', 'book.md'],
    approvalRequired: true,
    maxAttempts: 2,
    passThreshold: 90
  },
  {
    id: 'pie-stock-prompts',
    systemId: 'stock-asset-factory',
    order: 1,
    name: 'Stock Prompt Agent',
    mission: 'Generate a batch of microstock-safe generation prompts for one niche.',
    prompt:
      'You engineer image prompts for microstock submission. Return ONLY a JSON array of 10-20 objects with "filename", "prompt", "negativePrompt", and "description". Prompts must be vector/abstract/business-utility, contain no people, faces, logos, brand names, celebrities, or trademarked characters, and include the target size 4000x4000 or larger. Vary composition, palette, and density across the batch.',
    produces: ['prompt-batch.json'],
    consumes: [],
    approvalRequired: false,
    maxAttempts: 2,
    passThreshold: 90
  },
  {
    id: 'pie-stock-metadata',
    systemId: 'stock-asset-factory',
    order: 2,
    name: 'Stock Metadata Agent',
    mission: 'Write commercial titles and exactly 30 keywords per asset, flagged as generative AI.',
    prompt:
      'You write microstock metadata. For each asset return ONLY JSON with "filename", "title" (<=70 chars, commercial, no keyword stuffing), "keywords" (exactly 30 unique lowercase tags, most specific first), "category", and "generativeAi": true. Adobe Stock, Shutterstock, and Freepik all require generative-AI labelling; never omit it.',
    produces: ['stock-metadata.json'],
    consumes: ['prompt-batch.json'],
    approvalRequired: false,
    maxAttempts: 2,
    passThreshold: 90
  },
  {
    id: 'pie-stock-upload',
    systemId: 'stock-asset-factory',
    order: 3,
    name: 'Stock Upload Agent',
    mission: 'Emit the CSV manifest and upload checklist for contributor portals.',
    prompt:
      'You prepare the bulk-upload CSV (Filename, Title, Keywords, Category, Releases, GenerativeAI) and a per-platform checklist: minimum 4000x4000 pixels, RGB, no embedded text, generative-AI flag set, no model releases needed for abstract work. You never upload; you hand the packet to the approval queue.',
    produces: ['stock-upload.csv'],
    consumes: ['stock-metadata.json'],
    approvalRequired: true,
    maxAttempts: 1,
    passThreshold: 95
  },
  {
    id: 'pie-news-ingest',
    systemId: 'industry-newsletter',
    order: 1,
    name: 'Newsletter Ingest Agent',
    mission: 'Deduplicate, date-filter, and rank feed items for the issue.',
    prompt:
      'You curate feed items for an executive briefing. Drop duplicates by canonical URL and near-duplicate titles, drop anything older than the issue window, require at least three distinct sources, and rank by relevance to the niche. Return the ranked list with a one-line reason per item. Never fabricate items.',
    produces: ['ingest.json'],
    consumes: [],
    approvalRequired: false,
    maxAttempts: 1,
    passThreshold: 90
  },
  {
    id: 'pie-news-synthesis',
    systemId: 'industry-newsletter',
    order: 2,
    name: 'Newsletter Synthesis Agent',
    mission: 'Write the issue: 3-bullet items with implications, tools footer, disclosures.',
    prompt:
      'You are an executive technology editor. For each ranked item write a heading, exactly three bullets (what happened, why it matters, what to do), and a source link. Close with a "Recommended Tools" footer using the supplied affiliate tools and an explicit affiliate disclosure. Keep the issue between 500 and 1200 words. Never invent facts beyond the snippets.',
    produces: ['newsletter.md'],
    consumes: ['ingest.json'],
    approvalRequired: false,
    maxAttempts: 2,
    passThreshold: 90
  },
  {
    id: 'pie-news-publish',
    systemId: 'industry-newsletter',
    order: 3,
    name: 'Newsletter Publish Agent',
    mission: 'Build the Beehiiv draft payload plus social snippets for approval.',
    prompt:
      'You prepare the publish packet: Beehiiv POST /v2/publications/{id}/posts payload with status "draft", subject line (<=80 chars), preview text (<=140 chars), the Markdown body, and a LinkedIn and X snippet with UTM-tagged link. You never call the API; the packet enters the approval queue.',
    produces: ['publish-packet.json'],
    consumes: ['newsletter.md'],
    approvalRequired: true,
    maxAttempts: 1,
    passThreshold: 95
  }
];

const SYSTEMS: IncomeSystem[] = [
  {
    id: 'technical-ebook',
    name: 'Automated Technical Micro-eBook & Code Bundle Pipeline',
    phase: 1,
    flow: 'Topic → Outline Agent → Chapter Agent → Compiler Agent (Typst/Markdown) → Listing Agent → approval → Gumroad/Payhip',
    storefronts: ['Gumroad', 'Payhip'],
    freeTierStack: ['LiteLLM gateway → Groq → Gemini (free tiers)', 'Typst CLI (open source)', 'GitHub Actions (public repo minutes)'],
    unitEconomics: {
      priceLowUsd: 9.99,
      priceHighUsd: 19.99,
      platformFeePct: 10,
      costToProduceUsd: 0,
      note: 'Gumroad takes 10% + processing; Payhip free plan takes 5%. Estimates only; no revenue is promised.'
    },
    kpis: ['guides published per week', 'listing conversion rate', 'refund rate < 3%', 'chapter A+ pass rate'],
    agents: AGENTS.filter((agent) => agent.systemId === 'technical-ebook')
  },
  {
    id: 'stock-asset-factory',
    name: 'AI Stock Asset & Vector Graphic Factory',
    phase: 2,
    flow: 'Niche → Prompt Agent → (free generation tokens, manual/upscale) → Metadata Agent → Upload Agent → approval → Adobe Stock / Freepik / Shutterstock',
    storefronts: ['Adobe Stock Contributor', 'Freepik Contributor', 'Shutterstock Contributor'],
    freeTierStack: ['Leonardo.ai / Recraft.ai daily tokens', 'Upscayl (open source upscaler)', 'LiteLLM gateway for metadata'],
    unitEconomics: {
      priceLowUsd: 0.25,
      priceHighUsd: 3,
      platformFeePct: 67,
      costToProduceUsd: 0,
      note: 'Royalty per download; contributor share is roughly 33% on Adobe Stock. Generative-AI labelling is mandatory.'
    },
    kpis: ['assets approved per batch', 'review rejection rate < 20%', 'downloads per 100 assets', 'metadata A+ pass rate'],
    agents: AGENTS.filter((agent) => agent.systemId === 'stock-asset-factory')
  },
  {
    id: 'industry-newsletter',
    name: 'Automated Niche Industry Briefing Newsletter',
    phase: 3,
    flow: 'RSS feeds → Ingest Agent → Synthesis Agent → Publish Agent (Beehiiv draft) → approval → send + social',
    storefronts: ['Beehiiv (free plan, API)', 'Substack (manual paste; no public write API)'],
    freeTierStack: ['Beehiiv Launch plan', 'GitHub Actions cron (replaces n8n)', 'LiteLLM gateway for synthesis'],
    unitEconomics: {
      priceLowUsd: 0,
      priceHighUsd: 0,
      platformFeePct: 0,
      costToProduceUsd: 0,
      note: 'Revenue is affiliate + sponsorship; Beehiiv ad network unlocks at subscriber thresholds. FTC disclosure required on every issue.'
    },
    kpis: ['issues shipped on cadence', 'open rate', 'affiliate click-through', 'unsubscribe rate < 0.5%'],
    agents: AGENTS.filter((agent) => agent.systemId === 'industry-newsletter')
  }
];

export function getIncomeSystems(): IncomeSystem[] {
  return SYSTEMS;
}

export function getIncomeSystem(systemId: IncomeSystemId): IncomeSystem {
  const system = SYSTEMS.find((item) => item.id === systemId);
  if (!system) throw new Error(`Unknown income system: ${systemId}`);
  return system;
}

export function getProcessAgents(systemId?: IncomeSystemId): ProcessAgent[] {
  return systemId ? AGENTS.filter((agent) => agent.systemId === systemId) : AGENTS;
}

export function isIncomeSystemId(value: unknown): value is IncomeSystemId {
  return typeof value === 'string' && (INCOME_SYSTEM_IDS as string[]).includes(value);
}

export const SUPERVISOR = {
  id: 'pie-supervisor',
  name: 'Passive Income Supervisor',
  prompt: SUPERVISOR_PROMPT,
  policy: {
    maxCostUsd: 0 as const,
    maxRetriesPerStage: 1,
    passThreshold: 90,
    approvalRequiredActions: ['publish', 'upload', 'list_product', 'send_email', 'social_post'],
    forbiddenActions: ['paid_api_call', 'move_money', 'auto_publish', 'auto_upload']
  }
};

// ---------------------------------------------------------------------------
// System 1 — technical eBook
// ---------------------------------------------------------------------------

export interface OutlineChapter {
  title: string;
  points: string[];
}

function fallbackOutline(input: EbookInput): OutlineChapter[] {
  const count = Math.min(8, Math.max(5, input.chapterCount ?? 5));
  const topic = input.topic;
  const bank: OutlineChapter[] = [
    { title: `Why ${topic} Breaks in Production`, points: ['Failure modes seen in real deployments', 'Cost of doing it wrong', 'Mental model for the rest of the guide'] },
    { title: `Setting Up a Reproducible ${topic} Environment`, points: ['Pinned tool versions', 'Local vs CI parity', 'Smoke test that proves the setup'] },
    { title: `Core ${topic} Patterns`, points: ['Pattern catalogue with trade-offs', 'Reference implementation', 'When not to use each pattern'] },
    { title: `Configuration, Secrets, and Environments for ${topic}`, points: ['Twelve-factor config', 'Secret rotation', 'Per-environment overrides'] },
    { title: `Testing and Verification for ${topic}`, points: ['Unit vs contract vs smoke tests', 'Fixtures that stay fast', 'Gating deploys on tests'] },
    { title: `Observability for ${topic}`, points: ['Structured logs', 'Health endpoints', 'Alert thresholds that do not page at 3am'] },
    { title: `Hardening ${topic}: Security Checklist`, points: ['Least privilege', 'Dependency hygiene', 'Incident response steps'] },
    { title: `Shipping ${topic}: Release and Rollback Runbook`, points: ['Zero-downtime release', 'Rollback in under five minutes', 'Post-release verification'] }
  ];
  return bank.slice(0, count);
}

function checkOutline(chapters: OutlineChapter[] | null, input: EbookInput): QualityCheck[] {
  const list = chapters ?? [];
  const titles = list.map((chapter) => chapter.title.trim().toLowerCase());
  const target = Math.min(8, Math.max(5, input.chapterCount ?? 5));
  return [
    qc('outline-parsed', list.length > 0, 25, `${list.length} chapters parsed`),
    qc('outline-chapter-count', list.length === target, 20, `target ${target}, got ${list.length}`),
    qc('outline-points', list.every((chapter) => Array.isArray(chapter.points) && chapter.points.length >= 3), 20, 'every chapter has >=3 points'),
    qc('outline-unique-titles', new Set(titles).size === titles.length, 15, 'chapter titles unique'),
    qc('outline-concrete-titles', list.every((chapter) => !/^(chapter \d+:?\s*)?(intro|introduction|conclusion|summary)$/i.test(chapter.title.trim())), 10, 'no generic titles'),
    qc('outline-no-forbidden-claims', findForbiddenClaims(JSON.stringify(list)).length === 0, 10, 'content guard clean')
  ];
}

async function runOutlineAgent(input: EbookInput, ctx: EngineContext, feedback: string[]): Promise<Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>> {
  const agent = getAgentById('pie-ebook-outline');
  const count = Math.min(8, Math.max(5, input.chapterCount ?? 5));
  const raw = await ctx.complete(
    [
      { role: 'system', content: agent.prompt },
      {
        role: 'user',
        content: `Topic: ${input.topic}\nAudience: ${input.audience ?? 'working software engineers'}\nChapters: ${count}\n${feedback.length ? `Previous attempt failed checks: ${feedback.join('; ')}` : ''}`
      }
    ],
    1200
  ).catch(() => null);

  let chapters = isUsableCompletion(raw) ? extractJson<OutlineChapter[]>(raw) : null;
  let provenance: Provenance = 'llm';
  if (
    !Array.isArray(chapters) ||
    chapters.some((chapter) => typeof chapter?.title !== 'string' || !Array.isArray(chapter?.points) || chapter.points.some((point) => typeof point !== 'string')) ||
    !stagePasses(agent, checkOutline(chapters, input))
  ) {
    chapters = fallbackOutline(input);
    provenance = 'deterministic-template';
  }
  const checks = checkOutline(chapters, input);
  const score = scoreChecks(checks);
  return {
    agentId: agent.id,
    score,
    grade: scoreToGrade(score),
    checks,
    artifacts: [artifact('outline.json', 'outline.json', JSON.stringify(chapters, null, 2), provenance)],
    notes: [`${chapters.length} chapters (${provenance})`]
  };
}

function fallbackChapter(topic: string, index: number, chapter: OutlineChapter): string {
  const slug = slugify(chapter.title);
  const paragraphs = chapter.points.map(
    (point) =>
      `== ${point}\n\nIn practice, ${point.toLowerCase()} decides whether ${topic} holds up under load. Teams that skip this step tend to discover it during an incident, when the cost of a fix is highest. The approach below is the one we reach for first because it is boring, testable, and easy to reverse.\n\nStart by writing down the single invariant this section protects. Every code sample that follows exists to keep that invariant true in local development, in continuous integration, and in production. If a sample cannot run in all three, it does not belong in the guide.\n`
  );
  return [
    `// chapter ${index}: ${slug}`,
    ...paragraphs,
    '== Worked example',
    '',
    '```python',
    `# ${chapter.title}`,
    `def verify_${slug.replace(/-/g, '_').slice(0, 40)}(config: dict) -> bool:`,
    '    """Return True when every required key is present and non-empty."""',
    `    required = ${JSON.stringify(chapter.points.map((point) => slugify(point).replace(/-/g, '_').slice(0, 24)))}`,
    '    missing = [key for key in required if not config.get(key)]',
    '    if missing:',
    '        raise ValueError(f"missing config: {missing}")',
    '    return True',
    '```',
    '',
    'The verifier fails loudly and early. Wire it into the application start-up path and into the CI smoke test so that a misconfigured environment never reaches users.',
    '',
    '```bash',
    `# Smoke test for ${chapter.title}`,
    'set -euo pipefail',
    'python -c "from app.config import load; load().verify()"',
    'echo "config verified"',
    '```',
    '',
    '== Pitfalls',
    '',
    '- Treating defaults as documentation: defaults hide missing configuration until production.',
    '- Copying snippets without the verifier: the snippet runs, the invariant does not hold.',
    '- Skipping the rollback path: every change in this chapter must be reversible in one command.',
    '',
    '== Checklist',
    '',
    ...chapter.points.map((point) => `- [ ] ${point}`),
    '- [ ] Smoke test passes in local, CI, and production',
    ''
  ].join('\n');
}

function checkChapter(content: string): QualityCheck[] {
  const words = wordCount(content.replace(/```[\s\S]*?```/g, ''));
  const codeBlocks = (content.match(/```/g) ?? []).length / 2;
  const trimmed = content.trim();
  return [
    qc('chapter-length', words >= 250, 25, `${words} prose words (>=250)`),
    qc('chapter-code-examples', codeBlocks >= 2, 25, `${codeBlocks} code blocks (>=2)`),
    qc('chapter-sections', /^==\s+/m.test(content), 15, 'has == sections'),
    qc('chapter-pitfalls', /==\s+pitfalls/i.test(content), 10, 'has pitfalls section'),
    qc('chapter-checklist', /==\s+checklist/i.test(content) && /- \[ \]/.test(content), 10, 'has checklist'),
    qc('chapter-not-fenced-whole', !(trimmed.startsWith('```') && trimmed.endsWith('```') && codeBlocks === 1), 5, 'not wrapped in a single fence'),
    qc('chapter-balanced-fences', Number.isInteger(codeBlocks), 5, 'fences balanced'),
    qc('chapter-no-forbidden-claims', findForbiddenClaims(content).length === 0, 5, 'content guard clean')
  ];
}

async function runChapterAgent(input: EbookInput, prior: StageResult[], ctx: EngineContext, feedback: string[]): Promise<Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>> {
  const agent = getAgentById('pie-ebook-chapters');
  const outline = extractJson<OutlineChapter[]>(findArtifact(prior, 'outline.json')?.content) ?? [];
  const artifacts: Artifact[] = [];
  const allChecks: QualityCheck[] = [];
  const notes: string[] = [];

  for (const [offset, chapter] of outline.entries()) {
    const index = offset + 1;
    const raw = await ctx.complete(
      [
        { role: 'system', content: agent.prompt },
        {
          role: 'user',
          content: `Guide topic: ${input.topic}\nChapter ${index}: ${chapter.title}\nKey points: ${chapter.points.join('; ')}\n${feedback.length ? `Previous attempt failed checks: ${feedback.join('; ')}` : ''}`
        }
      ],
      2500
    ).catch(() => null);

    let content = isUsableCompletion(raw) ? raw.replace(/^```(?:typst)?\s*\n([\s\S]*)\n```\s*$/i, '$1').trim() : '';
    let provenance: Provenance = 'llm';
    let checks = content ? checkChapter(content) : [];
    if (!content || !stagePasses(agent, checks)) {
      content = fallbackChapter(input.topic, index, chapter);
      provenance = 'deterministic-template';
      checks = checkChapter(content);
      if (raw) notes.push(`chapter ${index}: llm draft below threshold, template used`);
    }
    artifacts.push(artifact(`chapters/${String(index).padStart(2, '0')}-${slugify(chapter.title)}.typ`, 'chapter.typ', content, provenance));
    allChecks.push(...checks.map((check) => ({ ...check, id: `ch${index}-${check.id}` })));
  }

  allChecks.push(qc('chapters-cover-outline', artifacts.length === outline.length && outline.length > 0, 30, `${artifacts.length}/${outline.length} chapters drafted`));
  const score = scoreChecks(allChecks);
  return { agentId: agent.id, score, grade: scoreToGrade(score), checks: allChecks, artifacts, notes };
}

export const TYPST_TEMPLATE = `#set page(paper: "a4", margin: (x: 2cm, y: 2.5cm))
#set text(font: "Liberation Sans", size: 10.5pt, fill: rgb("#1e293b"))
#set heading(numbering: "1.1")
#show raw.where(block: true): block.with(fill: rgb("#f1f5f9"), inset: 8pt, radius: 4pt, width: 100%)

#align(center + horizon)[
  #v(-4em)
  #text(28pt, weight: "bold", fill: rgb("#0f172a"))[{{BOOK_TITLE}}] \\
  #v(1em)
  #text(14pt, style: "italic", fill: rgb("#475569"))[{{BOOK_SUBTITLE}}] \\
  #v(3em)
  #text(11pt, weight: "medium")[Already Here LLC · Technical Architecture Series]
]

#pagebreak()
#outline(indent: auto)
#pagebreak()

{{DOCUMENT_BODY}}

#pagebreak()
= Colophon

This guide was produced with AI assistance and reviewed by a human editor before publication. Code samples are provided as-is; verify them against your own environment before production use.
`;

function typstEscape(value: string): string {
  return value.replace(/[#\[\]$*_`@<>]/g, (char) => `\\${char}`);
}

function typstToMarkdown(content: string): string {
  return content
    .replace(/^===\s+(.*)$/gm, '### $1')
    .replace(/^==\s+(.*)$/gm, '## $1')
    .replace(/^=\s+(.*)$/gm, '# $1')
    .replace(/^#pagebreak\(\)\s*$/gm, '')
    .replace(/^\/\/ chapter.*$/gm, '');
}

function checkCompiledBook(book: string, outline: OutlineChapter[]): QualityCheck[] {
  const missing = outline.filter((chapter) => !book.includes(`= ${typstEscape(chapter.title)}`));
  const pagebreaks = (book.match(/#pagebreak\(\)/g) ?? []).length;
  return [
    qc('book-template-filled', !/\{\{[A-Z_]+\}\}/.test(book), 25, 'no unfilled placeholders'),
    qc('book-all-chapters', missing.length === 0 && outline.length > 0, 35, missing.length ? `missing: ${missing.map((c) => c.title).join(', ')}` : 'all chapters present'),
    qc('book-outline-directive', book.includes('#outline('), 10, 'table of contents present'),
    qc('book-pagebreaks', pagebreaks >= outline.length + 1, 10, `${pagebreaks} page breaks`),
    qc('book-colophon', /= Colophon/.test(book) && /AI assistance/.test(book), 10, 'AI-assisted colophon present'),
    qc('book-balanced-fences', ((book.match(/```/g) ?? []).length % 2) === 0, 10, 'fences balanced')
  ];
}

async function runCompilerAgent(input: EbookInput, prior: StageResult[]): Promise<Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>> {
  const agent = getAgentById('pie-ebook-compiler');
  const outline = extractJson<OutlineChapter[]>(findArtifact(prior, 'outline.json')?.content) ?? [];
  const chapters = findArtifacts(prior, 'chapter.typ');
  const body = chapters
    .map((chapter, index) => `= ${typstEscape(outline[index]?.title ?? `Chapter ${index + 1}`)}\n\n${chapter.content}\n\n#pagebreak()`)
    .join('\n\n');
  const book = TYPST_TEMPLATE.replace('{{BOOK_TITLE}}', typstEscape(input.topic))
    .replace('{{BOOK_SUBTITLE}}', 'Production Architecture & Implementation Guide')
    .replace('{{DOCUMENT_BODY}}', body);
  const markdown = `# ${input.topic}\n\n_Production Architecture & Implementation Guide_\n\n${typstToMarkdown(body)}\n\n## Colophon\n\nProduced with AI assistance and human review.\n`;
  const provenance: Provenance = chapters.every((chapter) => chapter.provenance === 'llm') && chapters.length > 0 ? 'llm' : 'deterministic-template';
  const checks = checkCompiledBook(book, outline);
  const score = scoreChecks(checks);
  return {
    agentId: agent.id,
    score,
    grade: scoreToGrade(score),
    checks,
    artifacts: [artifact('book.typ', 'book.typ', book, provenance), artifact('book.md', 'book.md', markdown, provenance)],
    notes: [`compile with: typst compile book.typ ${slugify(input.topic)}.pdf`]
  };
}

export interface ListingPacket {
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  tags: string[];
  priceUsd: number;
  disclosure: string;
  storefronts: string[];
  fileName: string;
}

function fallbackListing(input: EbookInput, outline: OutlineChapter[]): ListingPacket {
  const price = Math.min(19.99, Math.max(9.99, input.priceUsd ?? 14.99));
  const topicWords = input.topic.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  const tags = [...new Set([...topicWords, 'cheat-sheet', 'devops', 'reference-guide', 'code-bundle', 'production', 'engineering', 'pdf', 'architecture', 'best-practices'])].slice(0, 12);
  const description = [
    `Most teams learn ${input.topic} the expensive way: an outage, a rewrite, or a security finding that a two-page checklist would have prevented. This guide compresses that experience into ${outline.length} focused chapters written for ${input.audience ?? 'working software engineers'} who need production-ready answers, not tutorials.`,
    `Each chapter opens with the failure mode it prevents, gives you a reference implementation you can paste into a real project, and closes with a pitfalls list and a checklist you can run before every release. The code is plain and dependency-light so it survives version churn.`,
    `You get the PDF (A4, table of contents, syntax-highlighted code), a Markdown mirror for your internal wiki, and every code sample as a standalone file. Updates to this edition are free.`
  ].join('\n\n');
  return {
    title: `${input.topic}: Production Architecture Guide`.slice(0, 70),
    subtitle: `${outline.length} chapters, ${outline.length * 2}+ runnable examples, release checklists`,
    description,
    bullets: [
      ...outline.slice(0, 6).map((chapter) => chapter.title),
      'Copy-paste code samples verified against pinned versions',
      'Pre-release checklist for every chapter'
    ].slice(0, 8),
    tags,
    priceUsd: price,
    disclosure: 'Written with AI assistance and reviewed by a human editor. No income or certification claims are made.',
    storefronts: ['Gumroad', 'Payhip'],
    fileName: `${slugify(input.topic)}.pdf`
  };
}

function checkListing(listing: ListingPacket | null): QualityCheck[] {
  const words = listing ? wordCount(listing.description) : 0;
  const text = listing ? JSON.stringify(listing) : '';
  return [
    qc('listing-parsed', Boolean(listing), 20, listing ? 'listing parsed' : 'listing missing'),
    qc('listing-title-length', Boolean(listing) && listing!.title.length > 0 && listing!.title.length <= 70, 15, `${listing?.title.length ?? 0} chars (<=70)`),
    qc('listing-description-length', words >= 120 && words <= 350, 15, `${words} words (120-350)`),
    qc('listing-bullets', Boolean(listing) && listing!.bullets.length >= 5 && listing!.bullets.length <= 8, 10, `${listing?.bullets.length ?? 0} bullets (5-8)`),
    qc('listing-tags', Boolean(listing) && listing!.tags.length >= 8 && listing!.tags.length <= 15, 10, `${listing?.tags.length ?? 0} tags (8-15)`),
    qc('listing-price-band', Boolean(listing) && listing!.priceUsd >= 9.99 && listing!.priceUsd <= 19.99, 10, `$${listing?.priceUsd ?? 0} (9.99-19.99)`),
    qc('listing-disclosure', Boolean(listing) && /AI/i.test(listing!.disclosure) && /review/i.test(listing!.disclosure), 10, 'AI-assisted disclosure present'),
    qc('listing-no-forbidden-claims', findForbiddenClaims(text).length === 0, 10, 'content guard clean')
  ];
}

async function runListingAgent(input: EbookInput, prior: StageResult[], ctx: EngineContext, feedback: string[]): Promise<Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>> {
  const agent = getAgentById('pie-ebook-listing');
  const outline = extractJson<OutlineChapter[]>(findArtifact(prior, 'outline.json')?.content) ?? [];
  const raw = await ctx.complete(
    [
      { role: 'system', content: agent.prompt },
      {
        role: 'user',
        content: `Guide: ${input.topic}\nChapters: ${outline.map((chapter) => chapter.title).join(' | ')}\nTarget price: ${input.priceUsd ?? 14.99}\n${feedback.length ? `Previous attempt failed checks: ${feedback.join('; ')}` : ''}`
      }
    ],
    1400
  ).catch(() => null);

  const parsed = isUsableCompletion(raw) ? extractJson<Partial<ListingPacket>>(raw) : null;
  let listing: ListingPacket;
  let provenance: Provenance = 'llm';
  if (parsed && typeof parsed.title === 'string' && typeof parsed.description === 'string' && Array.isArray(parsed.bullets) && Array.isArray(parsed.tags)) {
    listing = {
      ...fallbackListing(input, outline),
      ...parsed,
      priceUsd: typeof parsed.priceUsd === 'number' ? parsed.priceUsd : Math.min(19.99, Math.max(9.99, input.priceUsd ?? 14.99))
    } as ListingPacket;
    if (!stagePasses(agent, checkListing(listing))) {
      listing = fallbackListing(input, outline);
      provenance = 'deterministic-template';
    }
  } else {
    listing = fallbackListing(input, outline);
    provenance = 'deterministic-template';
  }
  const checks = checkListing(listing);
  const score = scoreChecks(checks);
  return {
    agentId: agent.id,
    score,
    grade: scoreToGrade(score),
    checks,
    artifacts: [artifact('listing.json', 'listing.json', JSON.stringify(listing, null, 2), provenance)],
    notes: ['approval required before creating the storefront product']
  };
}

// ---------------------------------------------------------------------------
// System 2 — stock asset factory
// ---------------------------------------------------------------------------

export interface StockPrompt {
  filename: string;
  prompt: string;
  negativePrompt: string;
  description: string;
}

export interface StockMetadata {
  filename: string;
  title: string;
  keywords: string[];
  category: string;
  generativeAi: true;
}

const NICHE_TEMPLATES: Record<StockInput['niche'], { base: string; subjects: string[]; palettes: string[]; category: string }> = {
  'seamless-tech-backgrounds': {
    base: 'Seamless vector texture, abstract {subject}, {palette}, minimalist technology background, tileable, high definition, 4000x4000',
    subjects: ['dark mode network circuit board with glowing nodes', 'hexagonal data grid', 'flowing fiber-optic lines', 'isometric server rack silhouettes', 'particle mesh topology', 'binary rain gradient', 'microchip trace pattern', 'wireframe globe fragments', 'layered waveform signal', 'dotted matrix constellation'],
    palettes: ['deep blue and cyan', 'graphite and electric teal', 'midnight navy with violet accents', 'charcoal with amber highlights'],
    category: 'Graphic Resources / Backgrounds'
  },
  'ui-icon-collections': {
    base: 'Isolated 3D vector app icon set, {subject}, {palette}, rounded glassmorphism, isometric perspective, clean white background, high contrast, 4000x4000',
    subjects: ['financial cloud technology', 'cybersecurity shield and lock', 'analytics dashboard widgets', 'logistics and delivery', 'smart home devices', 'healthcare data', 'e-commerce checkout', 'developer tooling', 'renewable energy', 'remote work collaboration'],
    palettes: ['soft blue gradient', 'mint and slate', 'coral and navy', 'lavender frosted glass'],
    category: 'Graphic Resources / Icons'
  },
  'corporate-slide-textures': {
    base: 'Minimalist abstract geometric {subject}, corporate presentation background, {palette}, clean vector style, generous negative space, 4000x4000',
    subjects: ['wave pattern', 'layered paper cut shapes', 'diagonal ribbon bands', 'soft grid with gradient orbs', 'topographic contour lines', 'faceted low-poly horizon', 'rounded rectangle mosaic', 'sweeping arc composition', 'subtle dot halftone', 'overlapping translucent circles'],
    palettes: ['subtle pastel gradients', 'warm neutral beige and sage', 'cool grey with a single blue accent', 'ivory with muted gold'],
    category: 'Graphic Resources / Backgrounds'
  }
};

const STOCK_BANNED_TERMS = /\b(person|people|face|woman|man|child|celebrity|logo|nike|apple|google|microsoft|disney|marvel|photorealistic|photo of)\b/i;

function fallbackPromptBatch(input: StockInput): StockPrompt[] {
  const template = NICHE_TEMPLATES[input.niche];
  const size = Math.min(20, Math.max(10, input.batchSize ?? 12));
  return Array.from({ length: size }, (_, index) => {
    const subject = template.subjects[index % template.subjects.length];
    const palette = template.palettes[index % template.palettes.length];
    const prompt = template.base.replace('{subject}', subject).replace('{palette}', palette);
    return {
      filename: `${slugify(input.niche)}-${String(index + 1).padStart(2, '0')}.png`,
      prompt,
      negativePrompt: 'photorealism, realistic human, faces, text, watermark, logo, brand, blurry, low resolution',
      description: `${subject} in ${palette}`
    };
  });
}

function checkPromptBatch(batch: StockPrompt[] | null, expected: number): QualityCheck[] {
  const list = batch ?? [];
  const filenames = list.map((item) => item.filename);
  return [
    qc('prompts-parsed', list.length > 0, 20, `${list.length} prompts`),
    qc('prompts-batch-size', list.length === expected, 20, `${list.length}/${expected} prompts`),
    qc('prompts-unique-filenames', new Set(filenames).size === filenames.length, 10, 'filenames unique'),
    qc('prompts-negative', list.every((item) => item.negativePrompt && item.negativePrompt.length > 10), 15, 'negative prompts present'),
    qc('prompts-no-banned-terms', list.every((item) => !STOCK_BANNED_TERMS.test(item.prompt)), 20, 'no people/brands/photorealism'),
    qc('prompts-size-hint', list.every((item) => /4000\s*x\s*4000|8k|high definition/i.test(item.prompt)), 10, 'target resolution stated'),
    qc('prompts-variety', new Set(list.map((item) => item.description)).size === list.length, 5, 'descriptions distinct')
  ];
}

async function runStockPromptAgent(input: StockInput, ctx: EngineContext, feedback: string[]): Promise<Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>> {
  const agent = getAgentById('pie-stock-prompts');
  const size = Math.min(20, Math.max(10, input.batchSize ?? 12));
  const raw = await ctx.complete(
    [
      { role: 'system', content: agent.prompt },
      { role: 'user', content: `Niche: ${input.niche}\nBatch size: ${size}\nReference template: ${NICHE_TEMPLATES[input.niche].base}\n${feedback.length ? `Previous attempt failed checks: ${feedback.join('; ')}` : ''}` }
    ],
    2000
  ).catch(() => null);

  let batch = isUsableCompletion(raw) ? extractJson<StockPrompt[]>(raw) : null;
  let provenance: Provenance = 'llm';
  if (!Array.isArray(batch) || batch.some((item) => typeof item?.prompt !== 'string' || typeof item?.filename !== 'string' || typeof item?.description !== 'string') || !stagePasses(agent, checkPromptBatch(batch, size))) {
    batch = fallbackPromptBatch(input);
    provenance = 'deterministic-template';
  }
  const checks = checkPromptBatch(batch, size);
  const score = scoreChecks(checks);
  return {
    agentId: agent.id,
    score,
    grade: scoreToGrade(score),
    checks,
    artifacts: [artifact('prompt-batch.json', 'prompt-batch.json', JSON.stringify(batch, null, 2), provenance)],
    notes: ['generate with free daily tokens (Leonardo.ai / Recraft.ai), upscale with Upscayl to >=4000px']
  };
}

const KEYWORD_BANK = [
  'abstract', 'background', 'vector', 'technology', 'digital', 'modern', 'minimal', 'pattern', 'texture', 'design',
  'business', 'corporate', 'presentation', 'wallpaper', 'geometric', 'gradient', 'futuristic', 'network', 'data', 'innovation',
  'clean', 'professional', 'creative', 'concept', 'illustration', 'graphic', 'template', 'banner', 'web', 'seamless',
  'icon', 'set', 'isometric', '3d', 'glass', 'ui', 'app', 'interface', 'finance', 'cloud', 'security', 'analytics',
  'wave', 'shape', 'layout', 'slide', 'cover', 'brochure', 'poster', 'element'
];

function fallbackMetadata(batch: StockPrompt[], niche: StockInput['niche']): StockMetadata[] {
  const template = NICHE_TEMPLATES[niche];
  return batch.map((item) => {
    const specific = item.description
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !['and', 'with', 'the', 'for'].includes(word));
    const keywords = [...new Set([...specific, ...KEYWORD_BANK])].slice(0, 30);
    const title = `${item.description.charAt(0).toUpperCase()}${item.description.slice(1)} vector background`.slice(0, 70);
    return { filename: item.filename, title, keywords, category: template.category, generativeAi: true };
  });
}

function isStockMetadata(value: unknown): value is StockMetadata {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.filename === 'string' &&
    typeof item.title === 'string' &&
    Array.isArray(item.keywords) &&
    item.keywords.every((keyword) => typeof keyword === 'string') &&
    typeof item.category === 'string'
  );
}

function checkMetadata(list: StockMetadata[] | null, expectedFilenames: string[]): QualityCheck[] {
  const items = list ?? [];
  const filenames = items.map((item) => item.filename);
  const expected = new Set(expectedFilenames);
  const oneToOne = expected.size > 0 && filenames.length === expected.size && new Set(filenames).size === filenames.length && filenames.every((name) => expected.has(name));
  return [
    qc('metadata-parsed', items.length > 0, 15, `${items.length} records`),
    qc('metadata-covers-batch', oneToOne, 20, `${filenames.filter((name) => expected.has(name)).length}/${expected.size} assets mapped 1:1`),
    qc('metadata-title-length', items.every((item) => item.title.length > 0 && item.title.length <= 70), 15, 'titles <=70 chars'),
    qc('metadata-30-keywords', items.every((item) => Array.isArray(item.keywords) && item.keywords.length === 30), 20, 'exactly 30 keywords each'),
    qc('metadata-unique-keywords', items.every((item) => new Set(item.keywords.map((keyword) => keyword.toLowerCase())).size === item.keywords.length), 10, 'keywords unique per asset'),
    qc('metadata-generative-ai-flag', items.every((item) => item.generativeAi === true), 15, 'generative AI flag set'),
    qc('metadata-category', items.every((item) => typeof item.category === 'string' && item.category.length > 0), 5, 'category set')
  ];
}

async function runStockMetadataAgent(input: StockInput, prior: StageResult[], ctx: EngineContext, feedback: string[]): Promise<Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>> {
  const agent = getAgentById('pie-stock-metadata');
  const batch = extractJson<StockPrompt[]>(findArtifact(prior, 'prompt-batch.json')?.content) ?? [];
  const raw = await ctx.complete(
    [
      { role: 'system', content: agent.prompt },
      { role: 'user', content: `Assets:\n${batch.map((item) => `- ${item.filename}: ${item.description}`).join('\n')}\n${feedback.length ? `Previous attempt failed checks: ${feedback.join('; ')}` : ''}` }
    ],
    3000
  ).catch(() => null);

  let list = isUsableCompletion(raw) ? extractJson<StockMetadata[]>(raw) : null;
  let provenance: Provenance = 'llm';
  const expectedFilenames = batch.map((item) => item.filename);
  if (Array.isArray(list)) {
    list = list.map((item: unknown) => {
      if (!item || typeof item !== 'object') return item as StockMetadata;
      const record = item as Record<string, unknown>;
      const keywords = Array.isArray(record.keywords) ? record.keywords : typeof record.keywords === 'string' ? record.keywords.split(',').map((k) => k.trim()) : [];
      return { ...record, generativeAi: true as const, keywords } as StockMetadata;
    });
  }
  if (!Array.isArray(list) || !list.every(isStockMetadata) || !stagePasses(agent, checkMetadata(list, expectedFilenames))) {
    list = fallbackMetadata(batch, input.niche);
    provenance = 'deterministic-template';
  }
  const checks = checkMetadata(list, expectedFilenames);
  const score = scoreChecks(checks);
  return {
    agentId: agent.id,
    score,
    grade: scoreToGrade(score),
    checks,
    artifacts: [artifact('stock-metadata.json', 'stock-metadata.json', JSON.stringify(list, null, 2), provenance)],
    notes: []
  };
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildStockCsv(list: StockMetadata[]): string {
  const header = ['Filename', 'Title', 'Keywords', 'Category', 'Releases', 'GenerativeAI'];
  const rows = list.map((item) => [item.filename, item.title, item.keywords.join(', '), item.category, '', 'yes'].map(csvCell).join(','));
  return [header.join(','), ...rows].join('\n') + '\n';
}

async function runStockUploadAgent(prior: StageResult[]): Promise<Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>> {
  const agent = getAgentById('pie-stock-upload');
  const list = extractJson<StockMetadata[]>(findArtifact(prior, 'stock-metadata.json')?.content) ?? [];
  const csv = buildStockCsv(list);
  const lines = csv.trim().split('\n');
  const checks = [
    qc('csv-header', lines[0] === 'Filename,Title,Keywords,Category,Releases,GenerativeAI', 30, 'header matches contributor template'),
    qc('csv-row-count', lines.length - 1 === list.length && list.length > 0, 30, `${lines.length - 1} rows`),
    qc('csv-generative-flag', lines.slice(1).every((line) => line.endsWith(',yes')), 20, 'every row flagged generative AI'),
    qc('csv-no-empty-titles', list.every((item) => item.title.trim().length > 0), 20, 'no empty titles')
  ];
  const score = scoreChecks(checks);
  return {
    agentId: agent.id,
    score,
    grade: scoreToGrade(score),
    checks,
    artifacts: [artifact('stock-upload.csv', 'stock-upload.csv', csv, 'deterministic-template')],
    notes: ['upload checklist: >=4000x4000 px, RGB, no embedded text, generative-AI flag on, no releases needed for abstract work', 'approval required before upload']
  };
}

// ---------------------------------------------------------------------------
// System 3 — industry newsletter
// ---------------------------------------------------------------------------

export interface RankedFeedItem extends NewsletterFeedItem {
  canonicalUrl: string;
  rank: number;
  reason: string;
}

export function canonicalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$|source$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.replace(/^www\./, '');
    return url.toString().replace(/\/$/, '');
  } catch {
    return raw.trim();
  }
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
}

export function rankFeedItems(items: NewsletterFeedItem[], niche: string, now: Date, windowDays = 7): RankedFeedItem[] {
  const cutoff = now.getTime() - windowDays * 86_400_000;
  const nicheTerms = niche.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const ranked: Array<{ item: RankedFeedItem; relevance: number }> = [];

  for (const item of items) {
    const published = Date.parse(item.publishedAt);
    if (!Number.isFinite(published) || published < cutoff || published > now.getTime() + 86_400_000) continue;
    const canonicalUrl = canonicalizeUrl(item.url);
    const titleKey = normalizeTitle(item.title);
    if (seenUrls.has(canonicalUrl) || seenTitles.has(titleKey)) continue;
    seenUrls.add(canonicalUrl);
    seenTitles.add(titleKey);
    const haystack = `${item.title} ${item.snippet}`.toLowerCase();
    const hits = nicheTerms.filter((term) => haystack.includes(term)).length;
    const relevance = hits * 10 + Math.min(5, Math.round((published - cutoff) / 86_400_000));
    ranked.push({ item: { ...item, canonicalUrl, rank: 0, reason: `${hits} niche term hit(s); ${item.source}` }, relevance });
  }

  return ranked
    .sort((a, b) => b.relevance - a.relevance || Date.parse(b.item.publishedAt) - Date.parse(a.item.publishedAt))
    .map(({ item }, index) => ({ ...item, rank: index + 1 }));
}

function checkIngest(ranked: RankedFeedItem[], originalCount: number): QualityCheck[] {
  const sources = new Set(ranked.map((item) => item.source));
  return [
    qc('ingest-min-items', ranked.length >= 5, 30, `${ranked.length} items (>=5)`),
    qc('ingest-source-diversity', sources.size >= 3, 25, `${sources.size} sources (>=3)`),
    qc('ingest-dedup-applied', new Set(ranked.map((item) => item.canonicalUrl)).size === ranked.length, 20, `${originalCount - ranked.length} dropped`),
    qc('ingest-ranked', ranked.every((item, index) => item.rank === index + 1), 15, 'ranks contiguous'),
    qc('ingest-reasons', ranked.every((item) => item.reason.length > 0), 10, 'reasons attached')
  ];
}

async function runIngestAgent(input: NewsletterInput, ctx: EngineContext): Promise<Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>> {
  const agent = getAgentById('pie-news-ingest');
  const now = input.issueDate ? new Date(input.issueDate) : ctx.now();
  const ranked = rankFeedItems(input.items, input.niche, now).slice(0, 10);
  const checks = checkIngest(ranked, input.items.length);
  const score = scoreChecks(checks);
  return {
    agentId: agent.id,
    score,
    grade: scoreToGrade(score),
    checks,
    artifacts: [artifact('ingest.json', 'ingest.json', JSON.stringify(ranked, null, 2), 'deterministic-template')],
    notes: [`${input.items.length} in, ${ranked.length} ranked`]
  };
}

const DEFAULT_AFFILIATE_TOOLS = [
  { name: 'DigitalOcean', url: 'https://www.digitalocean.com/?refcode=REPLACE_ME', pitch: 'Predictable cloud compute for small teams' },
  { name: 'Notion', url: 'https://affiliate.notion.so/REPLACE_ME', pitch: 'Executive briefing workspace and knowledge base' }
];

function fallbackNewsletter(input: NewsletterInput, ranked: RankedFeedItem[], issueDate: string): string {
  const tools = input.affiliateTools?.length ? input.affiliateTools : DEFAULT_AFFILIATE_TOOLS;
  const sections = ranked.map(
    (item) =>
      `## ${item.title}\n\n- **What happened:** ${item.snippet.trim()}\n- **Why it matters:** ${item.source} coverage signals movement in ${input.niche}; leaders should expect vendor and budget conversations to reference it this quarter.\n- **What to do:** Assign an owner to assess exposure this week and record the decision in your architecture log.\n\nSource: [${item.source}](${item.canonicalUrl})\n`
  );
  return [
    `# ${input.niche} Executive Briefing — ${issueDate}`,
    '',
    `Three-minute read. ${ranked.length} developments that matter for ${input.niche} leaders this week, each with the implication and the next action.`,
    '',
    ...sections,
    '## Recommended Tools',
    '',
    ...tools.map((tool) => `- [${tool.name}](${tool.url}) — ${tool.pitch} (affiliate partner link)`),
    '',
    '_Disclosure: Some links above are affiliate links. If you purchase through them we may earn a commission at no extra cost to you. This briefing was drafted with AI assistance from public sources and reviewed by an editor before sending._',
    ''
  ].join('\n');
}

function checkNewsletter(content: string, ranked: RankedFeedItem[]): QualityCheck[] {
  const words = wordCount(content);
  const headings = (content.match(/^## /gm) ?? []).length - 1;
  const bullets = (content.match(/^- /gm) ?? []).length;
  const linksPresent = ranked.every((item) => content.includes(item.canonicalUrl) || content.includes(item.url));
  return [
    qc('issue-length', words >= 300 && words <= 1400, 20, `${words} words (300-1400)`),
    qc('issue-item-sections', headings >= Math.min(ranked.length, 5), 15, `${headings} item sections`),
    qc('issue-three-bullets', bullets >= ranked.length * 3, 15, `${bullets} bullets (>=3 per item)`),
    qc('issue-source-links', linksPresent && ranked.length > 0, 15, 'every item links its source'),
    qc('issue-tools-footer', /## Recommended Tools/i.test(content), 10, 'tools footer present'),
    qc('issue-affiliate-disclosure', /affiliate links?/i.test(content) && /disclosure/i.test(content), 15, 'FTC affiliate disclosure present'),
    qc('issue-ai-disclosure', /AI assistance/i.test(content), 5, 'AI-assisted disclosure present'),
    qc('issue-no-forbidden-claims', findForbiddenClaims(content).length === 0, 5, 'content guard clean')
  ];
}

async function runSynthesisAgent(input: NewsletterInput, prior: StageResult[], ctx: EngineContext, feedback: string[]): Promise<Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>> {
  const agent = getAgentById('pie-news-synthesis');
  const ranked = extractJson<RankedFeedItem[]>(findArtifact(prior, 'ingest.json')?.content) ?? [];
  const issueDate = (input.issueDate ? new Date(input.issueDate) : ctx.now()).toISOString().slice(0, 10);
  const tools = input.affiliateTools?.length ? input.affiliateTools : DEFAULT_AFFILIATE_TOOLS;
  const raw = await ctx.complete(
    [
      { role: 'system', content: agent.prompt },
      {
        role: 'user',
        content: `Niche: ${input.niche}\nIssue date: ${issueDate}\nItems:\n${ranked.map((item) => `${item.rank}. ${item.title} (${item.source}) ${item.canonicalUrl}\n   ${item.snippet}`).join('\n')}\nAffiliate tools: ${tools.map((tool) => `${tool.name} <${tool.url}> ${tool.pitch}`).join('; ')}\n${feedback.length ? `Previous attempt failed checks: ${feedback.join('; ')}` : ''}`
      }
    ],
    3000
  ).catch(() => null);

  let content = isUsableCompletion(raw) ? raw.trim() : '';
  let provenance: Provenance = 'llm';
  if (!content || !stagePasses(agent, checkNewsletter(content, ranked))) {
    content = fallbackNewsletter(input, ranked, issueDate);
    provenance = 'deterministic-template';
  }
  const checks = checkNewsletter(content, ranked);
  const score = scoreChecks(checks);
  return {
    agentId: agent.id,
    score,
    grade: scoreToGrade(score),
    checks,
    artifacts: [artifact('newsletter.md', 'newsletter.md', content, provenance)],
    notes: []
  };
}

export interface PublishPacket {
  platform: 'beehiiv';
  endpoint: string;
  method: 'POST';
  payload: {
    title: string;
    subtitle: string;
    status: 'draft';
    content_markdown: string;
    utm_campaign: string;
  };
  social: { linkedin: string; x: string };
  approval: { required: true; action: 'publish'; reviewer: 'human' };
}

function buildPublishPacket(input: NewsletterInput, newsletter: string, issueDate: string, utm: string): PublishPacket {
  const firstLine = newsletter.split('\n').find((line) => line.startsWith('# '))?.replace(/^# /, '') ?? `${input.niche} Briefing`;
  const title = firstLine.slice(0, 80);
  const firstItem = newsletter.split('\n').find((line) => line.startsWith('## ') && !/recommended tools/i.test(line))?.replace(/^## /, '') ?? input.niche;
  const link = `https://REPLACE_ME.beehiiv.com/p/${slugify(title)}?utm_source=social&utm_medium=organic&utm_campaign=${utm}`;
  return {
    platform: 'beehiiv',
    endpoint: 'https://api.beehiiv.com/v2/publications/{publication_id}/posts',
    method: 'POST',
    payload: {
      title,
      subtitle: `This week in ${input.niche}: ${firstItem}`.slice(0, 140),
      status: 'draft',
      content_markdown: newsletter,
      utm_campaign: utm
    },
    social: {
      linkedin: `${title}\n\nTop item: ${firstItem}. Full 3-minute briefing → ${link}`.slice(0, 700),
      x: `${firstItem} — and more in this week's ${input.niche} briefing: ${link}`.slice(0, 280)
    },
    approval: { required: true, action: 'publish', reviewer: 'human' }
  };
}

async function runPublishAgent(input: NewsletterInput, prior: StageResult[], ctx: EngineContext): Promise<Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>> {
  const agent = getAgentById('pie-news-publish');
  const newsletter = findArtifact(prior, 'newsletter.md')?.content ?? '';
  const issueDate = (input.issueDate ? new Date(input.issueDate) : ctx.now()).toISOString().slice(0, 10);
  const packet = buildPublishPacket(input, newsletter, issueDate, `issue-${issueDate}`);
  const checks = [
    qc('packet-draft-status', packet.payload.status === 'draft', 25, 'status is draft'),
    qc('packet-subject-length', packet.payload.title.length > 0 && packet.payload.title.length <= 80, 15, `${packet.payload.title.length} chars`),
    qc('packet-preview-length', packet.payload.subtitle.length <= 140, 10, `${packet.payload.subtitle.length} chars`),
    qc('packet-body', packet.payload.content_markdown.length > 200, 20, 'body attached'),
    qc('packet-social', packet.social.x.length <= 280 && packet.social.linkedin.length > 0 && /utm_campaign/.test(packet.social.x), 15, 'social snippets UTM-tagged'),
    qc('packet-approval-gate', packet.approval.required === true, 15, 'approval gate set')
  ];
  const score = scoreChecks(checks);
  return {
    agentId: agent.id,
    score,
    grade: scoreToGrade(score),
    checks,
    artifacts: [artifact('publish-packet.json', 'publish-packet.json', JSON.stringify(packet, null, 2), 'deterministic-template')],
    notes: ['approval required before POSTing the draft to Beehiiv']
  };
}

// ---------------------------------------------------------------------------
// Supervisor
// ---------------------------------------------------------------------------

function getAgentById(id: ProcessAgentId): ProcessAgent {
  const agent = AGENTS.find((item) => item.id === id);
  if (!agent) throw new Error(`Unknown process agent: ${id}`);
  return agent;
}

type StageDraft = Omit<StageResult, 'attempts' | 'status' | 'approvalRequired'>;

type StageRunner = (input: SystemInput, prior: StageResult[], ctx: EngineContext, feedback: string[]) => Promise<StageDraft>;

const STAGE_RUNNERS: Record<ProcessAgentId, StageRunner> = {
  'pie-ebook-outline': (input, _prior, ctx, feedback) => runOutlineAgent(input as EbookInput, ctx, feedback),
  'pie-ebook-chapters': (input, prior, ctx, feedback) => runChapterAgent(input as EbookInput, prior, ctx, feedback),
  'pie-ebook-compiler': (input, prior) => runCompilerAgent(input as EbookInput, prior),
  'pie-ebook-listing': (input, prior, ctx, feedback) => runListingAgent(input as EbookInput, prior, ctx, feedback),
  'pie-stock-prompts': (input, _prior, ctx, feedback) => runStockPromptAgent(input as StockInput, ctx, feedback),
  'pie-stock-metadata': (input, prior, ctx, feedback) => runStockMetadataAgent(input as StockInput, prior, ctx, feedback),
  'pie-stock-upload': (_input, prior) => runStockUploadAgent(prior),
  'pie-news-ingest': (input, _prior, ctx) => runIngestAgent(input as NewsletterInput, ctx),
  'pie-news-synthesis': (input, prior, ctx, feedback) => runSynthesisAgent(input as NewsletterInput, prior, ctx, feedback),
  'pie-news-publish': (input, prior, ctx) => runPublishAgent(input as NewsletterInput, prior, ctx)
};

async function runStage(agent: ProcessAgent, input: SystemInput, prior: StageResult[], ctx: EngineContext): Promise<StageResult> {
  let attempts = 0;
  let feedback: string[] = [];
  let last: StageDraft | null = null;
  while (attempts < agent.maxAttempts) {
    attempts += 1;
    last = await STAGE_RUNNERS[agent.id](input, prior, ctx, feedback);
    if (stagePasses(agent, last.checks)) break;
    feedback = last.checks.filter((check) => !check.ok).map((check) => `${check.id}: ${check.detail}`);
  }
  if (!last) throw new Error(`Stage ${agent.id} produced no result`);
  const passed = stagePasses(agent, last.checks);
  return {
    ...last,
    attempts,
    approvalRequired: agent.approvalRequired,
    status: passed ? (agent.approvalRequired ? 'passed_pending_approval' : 'passed') : 'failed'
  };
}

function skippedStage(agent: ProcessAgent): StageResult {
  return {
    agentId: agent.id,
    status: 'skipped',
    attempts: 0,
    score: 0,
    grade: 'F',
    checks: [],
    artifacts: [],
    notes: ['skipped: upstream stage failed'],
    approvalRequired: agent.approvalRequired
  };
}

export function validateSystemInput(value: unknown): SystemInput | { error: string } {
  if (!value || typeof value !== 'object') return { error: 'Body must be an object.' };
  const body = value as Record<string, unknown>;
  if (!isIncomeSystemId(body.systemId)) return { error: `systemId must be one of ${INCOME_SYSTEM_IDS.join(', ')}.` };

  if (body.systemId === 'technical-ebook') {
    if (typeof body.topic !== 'string' || body.topic.trim().length < 4 || body.topic.length > 120) return { error: 'topic must be 4-120 characters.' };
    return {
      systemId: 'technical-ebook',
      topic: body.topic.trim(),
      audience: typeof body.audience === 'string' ? body.audience.trim().slice(0, 120) : undefined,
      chapterCount: typeof body.chapterCount === 'number' ? Math.round(body.chapterCount) : undefined,
      priceUsd: typeof body.priceUsd === 'number' ? body.priceUsd : undefined
    };
  }

  if (body.systemId === 'stock-asset-factory') {
    if (!(typeof body.niche === 'string' && body.niche in NICHE_TEMPLATES)) return { error: `niche must be one of ${Object.keys(NICHE_TEMPLATES).join(', ')}.` };
    return {
      systemId: 'stock-asset-factory',
      niche: body.niche as StockInput['niche'],
      batchSize: typeof body.batchSize === 'number' ? Math.round(body.batchSize) : undefined
    };
  }

  if (typeof body.niche !== 'string' || body.niche.trim().length < 3) return { error: 'niche must be at least 3 characters.' };
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 200) return { error: 'items must be a non-empty array (max 200).' };
  const items: NewsletterFeedItem[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== 'object') return { error: 'Each item must be an object.' };
    const item = raw as Record<string, unknown>;
    if (typeof item.title !== 'string' || typeof item.url !== 'string' || typeof item.source !== 'string' || typeof item.publishedAt !== 'string') {
      return { error: 'Each item needs title, url, source, publishedAt.' };
    }
    items.push({
      title: item.title.slice(0, 200),
      url: item.url.slice(0, 500),
      source: item.source.slice(0, 80),
      publishedAt: item.publishedAt,
      snippet: typeof item.snippet === 'string' ? item.snippet.slice(0, 1200) : ''
    });
  }
  const affiliateTools = Array.isArray(body.affiliateTools)
    ? body.affiliateTools
        .filter((tool): tool is { name: string; url: string; pitch: string } =>
          Boolean(tool) && typeof tool === 'object' && typeof (tool as Record<string, unknown>).name === 'string' && typeof (tool as Record<string, unknown>).url === 'string' && typeof (tool as Record<string, unknown>).pitch === 'string'
        )
        .slice(0, 5)
    : undefined;
  return {
    systemId: 'industry-newsletter',
    niche: body.niche.trim().slice(0, 80),
    items,
    affiliateTools,
    issueDate: typeof body.issueDate === 'string' && Number.isFinite(Date.parse(body.issueDate)) ? body.issueDate : undefined
  };
}

export async function runIncomeSystem(input: SystemInput, context: Partial<EngineContext> = {}): Promise<EngineRun> {
  const ctx = createEngineContext(context);
  const system = getIncomeSystem(input.systemId);
  const startedAt = ctx.now();
  const runId = `pie-${input.systemId}-${startedAt.toISOString().replace(/\D/g, '').slice(0, 14)}-${hashString(JSON.stringify(input)).slice(0, 6)}-${randomUUID().slice(0, 8)}`;
  const stages: StageResult[] = [];
  let halted = false;

  for (const agent of [...system.agents].sort((a, b) => a.order - b.order)) {
    if (halted) {
      stages.push(skippedStage(agent));
      continue;
    }
    const result = await runStage(agent, input, stages, ctx);
    stages.push(result);
    if (result.status === 'failed') halted = true;
  }

  const executed = stages.filter((stage) => stage.status !== 'skipped');
  const overallScore = executed.length ? Math.round((executed.reduce((sum, stage) => sum + stage.score, 0) / executed.length) * 10) / 10 : 0;
  const failed = stages.find((stage) => stage.status === 'failed');
  const approvalQueue = stages.filter((stage) => stage.status === 'passed_pending_approval').flatMap((stage) => stage.artifacts.map((item) => item.key));

  return {
    runId,
    systemId: input.systemId,
    input,
    startedAt: startedAt.toISOString(),
    finishedAt: ctx.now().toISOString(),
    stages,
    ok: !failed,
    overallScore,
    overallGrade: failed ? 'F' : scoreToGrade(overallScore),
    spendUsd: 0,
    approvalQueue,
    nextAction: failed
      ? `Fix ${failed.agentId}: ${failed.checks.filter((check) => !check.ok).map((check) => check.id).join(', ')}`
      : approvalQueue.length
        ? `Human review of ${approvalQueue.join(', ')} then execute the ${system.storefronts[0]} step manually or via approved connector.`
        : 'Run complete; nothing pending.'
  };
}

// ---------------------------------------------------------------------------
// Roadmap + verification
// ---------------------------------------------------------------------------

export interface RoadmapPhase {
  phase: 1 | 2 | 3;
  window: string;
  systemId: IncomeSystemId;
  goal: string;
  exitCriteria: string[];
}

export function getRoadmap(): RoadmapPhase[] {
  return [
    {
      phase: 1,
      window: 'Week 1',
      systemId: 'technical-ebook',
      goal: 'First A+ guide compiled and approved for a Gumroad/Payhip listing.',
      exitCriteria: ['book.typ compiles with typst', 'listing packet approved', 'product live with AI-assisted disclosure']
    },
    {
      phase: 2,
      window: 'Weeks 2-4',
      systemId: 'stock-asset-factory',
      goal: 'First 50 generative-AI-labelled assets submitted across two contributor portals.',
      exitCriteria: ['metadata A+ pass rate >= 90%', 'review rejection rate < 20%', 'CSV manifest imported without edits']
    },
    {
      phase: 3,
      window: 'Month 2+',
      systemId: 'industry-newsletter',
      goal: 'Weekly issue drafted automatically, reviewed, and sent with affiliate disclosure.',
      exitCriteria: ['4 consecutive on-cadence issues', 'open rate tracked', 'affiliate links UTM-tagged and disclosed']
    }
  ];
}

export interface EngineCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface EngineVerification {
  ok: boolean;
  checkedAt: string;
  passed: number;
  failed: number;
  checks: EngineCheck[];
}

export function verifyPassiveIncomeEngine(): EngineVerification {
  const agentIds = AGENTS.map((agent) => agent.id);
  const checks: EngineCheck[] = [
    { id: 'systems', ok: SYSTEMS.length === 3, detail: `${SYSTEMS.length} systems` },
    { id: 'agents', ok: AGENTS.length === 10, detail: `${AGENTS.length} process agents` },
    { id: 'agent-ids-unique', ok: new Set(agentIds).size === agentIds.length, detail: 'unique ids' },
    { id: 'one-agent-per-process', ok: SYSTEMS.every((system) => system.agents.length >= 3 && system.agents.every((agent, index) => agent.order === index + 1)), detail: 'orders contiguous' },
    { id: 'publish-stages-gated', ok: SYSTEMS.every((system) => system.agents[system.agents.length - 1].approvalRequired), detail: 'final stage requires approval' },
    { id: 'prompts-sized', ok: AGENTS.every((agent) => agent.prompt.length >= 120), detail: 'prompts >= 120 chars' },
    { id: 'thresholds', ok: AGENTS.every((agent) => agent.passThreshold >= 90 && agent.maxAttempts >= 1 && agent.maxAttempts <= 2), detail: 'A-grade thresholds, bounded retries' },
    { id: 'artifact-chain', ok: SYSTEMS.every((system) => system.agents.every((agent) => agent.consumes.every((kind) => system.agents.some((upstream) => upstream.order < agent.order && upstream.produces.includes(kind))))), detail: 'every consumed artifact is produced upstream' },
    { id: 'zero-spend', ok: SUPERVISOR.policy.maxCostUsd === 0 && SYSTEMS.every((system) => system.unitEconomics.costToProduceUsd === 0), detail: '$0 production cost' },
    { id: 'runners-complete', ok: agentIds.every((id) => typeof STAGE_RUNNERS[id] === 'function'), detail: 'every agent has a runner' },
    { id: 'roadmap-covers-systems', ok: new Set(getRoadmap().map((phase) => phase.systemId)).size === SYSTEMS.length, detail: 'roadmap complete' }
  ];
  const failed = checks.filter((check) => !check.ok);
  return { ok: failed.length === 0, checkedAt: new Date().toISOString(), passed: checks.length - failed.length, failed: failed.length, checks };
}
