/**
 * Passive Income Engine CLI — runs one income system through its process
 * agents, writes graded artifacts to disk, and (when the typst binary is
 * present) compiles book.typ to PDF. Never publishes or uploads.
 *
 *   node --experimental-strip-types --import ./tests/register-next-alias.mjs \
 *     scripts/passive-income-agent.mjs --system technical-ebook --topic "FastAPI + Docker" [--out .tmp/passive-income] [--offline]
 *   ... --system stock-asset-factory --niche ui-icon-collections [--batch 12]
 *   ... --system industry-newsletter --niche "Cloud Architecture" --feeds data/passive-income-feeds.json [--fetch]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runIncomeSystem, verifyPassiveIncomeEngine } from '../lib/passive-income-engine.ts';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

export const MAX_FEED_BYTES = 2 * 1024 * 1024;

/** Read a response body up to MAX_FEED_BYTES; throws if the feed is larger so a hostile server cannot exhaust memory. */
export async function readBounded(res, limit = MAX_FEED_BYTES) {
  if (!res.body) return '';
  const declared = Number(res.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > limit) throw new Error(`feed exceeds ${limit} bytes`);
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error(`feed exceeds ${limit} bytes`);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Resolve an artifact key inside runDir; rejects traversal, absolute paths, and NUL bytes. */
export function safeArtifactPath(runDir, key) {
  if (typeof key !== 'string' || key.length === 0 || key.includes('\0')) throw new Error(`Invalid artifact key: ${JSON.stringify(key)}`);
  const root = resolve(runDir);
  const target = resolve(root, key);
  const rel = relative(root, target);
  if (rel === '' || rel.startsWith('..') || rel.split(sep).includes('..') || resolve(root, rel) !== target) {
    throw new Error(`Artifact key escapes run directory: ${key}`);
  }
  return target;
}

const ENTITY_MAP = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };

function stripTags(value) {
  let previous;
  let current = value;
  do {
    previous = current;
    current = current.replace(/<[^>]*>?/g, '');
  } while (current !== previous);
  return current;
}

/** Plain-text extraction from feed markup: unwrap CDATA, drop tags, single-pass entity decode, drop tags again. */
function decodeEntities(value) {
  const unwrapped = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  const decoded = stripTags(unwrapped).replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, name) => ENTITY_MAP[name]);
  return stripTags(decoded).replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

/** Minimal RSS 2.0 / Atom parser; enough for headline + link + date + snippet. */
export function parseFeed(xml, source) {
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  return blocks
    .map((block) => {
      const atomLink = block.match(/<link[^>]*href="([^"]+)"/i)?.[1];
      return {
        title: tag(block, 'title'),
        url: tag(block, 'link') || atomLink || tag(block, 'guid'),
        source,
        publishedAt: tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date'),
        snippet: (tag(block, 'description') || tag(block, 'summary') || tag(block, 'content')).slice(0, 600)
      };
    })
    .filter((item) => item.title && item.url);
}

async function fetchFeeds(urls) {
  const items = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { 'user-agent': 'already-here-passive-income-engine/1.0' } });
      if (!res.ok) continue;
      const source = new URL(url).hostname.replace(/^www\./, '');
      items.push(...parseFeed(await readBounded(res), source).slice(0, 25));
    } catch {
      // skip unreachable feed; ingest agent enforces minimum item/source counts
    }
  }
  return items;
}

async function buildInput(args) {
  switch (args.system) {
    case 'technical-ebook':
      if (!args.topic) throw new Error('--topic is required for technical-ebook');
      return { systemId: 'technical-ebook', topic: String(args.topic), audience: args.audience, chapterCount: args.chapters ? Number(args.chapters) : undefined, priceUsd: args.price ? Number(args.price) : undefined };
    case 'stock-asset-factory':
      return { systemId: 'stock-asset-factory', niche: String(args.niche ?? 'seamless-tech-backgrounds'), batchSize: args.batch ? Number(args.batch) : undefined };
    case 'industry-newsletter': {
      if (!args.feeds) throw new Error('--feeds <json file> is required for industry-newsletter');
      const feed = JSON.parse(readFileSync(String(args.feeds), 'utf8'));
      const fetched = args.fetch && Array.isArray(feed.feeds) ? await fetchFeeds(feed.feeds) : [];
      return { systemId: 'industry-newsletter', niche: String(args.niche ?? feed.niche ?? 'Cloud Architecture'), items: [...(feed.items ?? []), ...fetched], affiliateTools: feed.affiliateTools, issueDate: args.date };
    }
    default:
      throw new Error('--system must be technical-ebook | stock-asset-factory | industry-newsletter');
  }
}

function tryCompileTypst(runDir, bookKey) {
  const typst = spawnSync('typst', ['--version'], { encoding: 'utf8' });
  if (typst.error || typst.status !== 0) return { compiled: false, reason: 'typst binary not installed (cargo install typst-cli)' };
  const pdf = join(runDir, 'book.pdf');
  const result = spawnSync('typst', ['compile', join(runDir, bookKey), pdf], { encoding: 'utf8' });
  return result.status === 0 ? { compiled: true, pdf } : { compiled: false, reason: result.stderr.trim().slice(0, 500) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const verification = verifyPassiveIncomeEngine();
  if (!verification.ok) {
    console.error(JSON.stringify(verification, null, 2));
    process.exit(2);
  }

  const input = await buildInput(args);
  const context = args.offline ? { complete: async () => null } : {};
  const run = await runIncomeSystem(input, context);
  const outRoot = String(args.out ?? '.tmp/passive-income');
  const runDir = join(outRoot, run.runId);
  mkdirSync(runDir, { recursive: true });

  for (const stage of run.stages) {
    for (const item of stage.artifacts) {
      const target = safeArtifactPath(runDir, item.key);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, item.content);
    }
  }

  const compile = run.systemId === 'technical-ebook' && run.ok ? tryCompileTypst(runDir, 'book.typ') : null;
  const ledger = { ...run, stages: run.stages.map((stage) => ({ ...stage, artifacts: stage.artifacts.map((item) => ({ key: item.key, kind: item.kind, provenance: item.provenance, bytes: Buffer.byteLength(item.content) })) })), compile, outputDir: runDir };
  writeFileSync(join(runDir, 'run.json'), JSON.stringify(ledger, null, 2));

  console.log(
    JSON.stringify(
      {
        runId: run.runId,
        ok: run.ok,
        grade: run.overallGrade,
        score: run.overallScore,
        spendUsd: run.spendUsd,
        stages: run.stages.map((stage) => `${stage.agentId}=${stage.grade}(${stage.score})/${stage.status}`),
        approvalQueue: run.approvalQueue,
        nextAction: run.nextAction,
        compile,
        outputDir: runDir
      },
      null,
      2
    )
  );
  process.exit(run.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
