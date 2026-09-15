import assert from 'node:assert/strict';
import { GET as engineGet, POST as enginePost } from '../app/api/passive-income/route.ts';
import { resolve } from 'node:path';
import {
  SUPERVISOR,
  buildStockCsv,
  canonicalizeUrl,
  createEngineContext,
  extractJson,
  getIncomeSystems,
  getProcessAgents,
  hardGatesPass,
  isHardGate,
  rankFeedItems,
  runIncomeSystem,
  scoreToGrade,
  stagePasses,
  validateSystemInput,
  verifyPassiveIncomeEngine
} from '../lib/passive-income-engine.ts';
import { parseFeed, readBounded, safeArtifactPath } from '../scripts/passive-income-agent.mjs';

const offline = { complete: async () => null, now: () => new Date('2026-09-15T00:00:00Z') };
const fallbackLlm = { complete: async () => 'AI providers are currently unavailable. Level-4 deterministic fallback is active.' };

{
  const verification = verifyPassiveIncomeEngine();
  assert.equal(verification.ok, true, JSON.stringify(verification.checks.filter((c) => !c.ok)));
  assert.equal(getIncomeSystems().length, 3);
  assert.equal(getProcessAgents().length, 10);
  assert.equal(SUPERVISOR.policy.maxCostUsd, 0);
  for (const agent of getProcessAgents()) assert.ok(agent.prompt.length >= 120, agent.id);
}

{
  assert.deepEqual(extractJson('```json\n[{"a":1}]\n```'), [{ a: 1 }]);
  assert.deepEqual(extractJson('Sure! Here it is: {"title":"x"} hope that helps'), { title: 'x' });
  assert.equal(extractJson('not json'), null);
  assert.equal(scoreToGrade(95), 'A+');
  assert.equal(scoreToGrade(90), 'A');
  assert.equal(scoreToGrade(50), 'F');
  assert.equal(canonicalizeUrl('https://www.example.com/a/?utm_source=x&id=1#frag'), 'https://example.com/a/?id=1');
}

// System 1 — offline run produces every artifact with A+ grades and a gated listing.
{
  const run = await runIncomeSystem({ systemId: 'technical-ebook', topic: 'FastAPI + Docker Production Patterns', chapterCount: 6 }, offline);
  assert.equal(run.ok, true, run.nextAction);
  assert.equal(run.spendUsd, 0);
  assert.equal(run.stages.length, 4);
  assert.equal(run.overallGrade, 'A+', JSON.stringify(run.stages.map((s) => [s.agentId, s.score])));
  const kinds = run.stages.flatMap((s) => s.artifacts.map((a) => a.kind));
  for (const kind of ['outline.json', 'chapter.typ', 'book.typ', 'book.md', 'listing.json']) assert.ok(kinds.includes(kind), kind);
  assert.equal(run.stages.filter((s) => s.artifacts.some((a) => a.kind === 'chapter.typ')).flatMap((s) => s.artifacts).length, 6);
  const listing = run.stages.at(-1);
  assert.equal(listing.status, 'passed_pending_approval');
  assert.deepEqual(run.approvalQueue, ['listing.json']);
  const book = run.stages[2].artifacts.find((a) => a.kind === 'book.typ').content;
  assert.ok(!book.includes('{{'));
  assert.ok(book.includes('= Colophon'));
  assert.ok(run.runId.startsWith('pie-technical-ebook-'));
}

// LLM output that is usable is preferred; garbage/fallback output falls back to templates.
{
  const llmOutline = JSON.stringify([
    { title: 'Why Deploys Fail', points: ['a', 'b', 'c'] },
    { title: 'Containers Done Right', points: ['a', 'b', 'c'] },
    { title: 'Config and Secrets', points: ['a', 'b', 'c'] },
    { title: 'Testing the Image', points: ['a', 'b', 'c'] },
    { title: 'Rolling Out Safely', points: ['a', 'b', 'c'] }
  ]);
  let calls = 0;
  const run = await runIncomeSystem(
    { systemId: 'technical-ebook', topic: 'Docker Deploys' },
    { complete: async (messages) => { calls += 1; return messages[1].content.includes('Chapters:') && !messages[1].content.includes('Chapter ') ? llmOutline : null; } }
  );
  assert.ok(calls > 0);
  const outlineStage = run.stages[0];
  assert.equal(outlineStage.artifacts[0].provenance, 'llm');
  assert.ok(outlineStage.artifacts[0].content.includes('Why Deploys Fail'));
  assert.equal(run.stages[1].artifacts[0].provenance, 'deterministic-template');
  assert.equal(run.ok, true);

  const fallbackRun = await runIncomeSystem({ systemId: 'technical-ebook', topic: 'Gateway Down' }, fallbackLlm);
  assert.ok(fallbackRun.stages.every((s) => s.artifacts.every((a) => a.provenance === 'deterministic-template')));
}

// System 2 — prompt batch, 30-keyword metadata, generative-AI-flagged CSV.
{
  const run = await runIncomeSystem({ systemId: 'stock-asset-factory', niche: 'ui-icon-collections', batchSize: 12 }, offline);
  assert.equal(run.ok, true, run.nextAction);
  assert.equal(run.overallGrade, 'A+');
  const metadata = JSON.parse(run.stages[1].artifacts[0].content);
  assert.equal(metadata.length, 12);
  assert.ok(metadata.every((item) => item.keywords.length === 30 && item.generativeAi === true && item.title.length <= 70));
  const csv = run.stages[2].artifacts[0].content;
  assert.equal(csv.split('\n')[0], 'Filename,Title,Keywords,Category,Releases,GenerativeAI');
  assert.equal(csv.trim().split('\n').length, 13);
  assert.equal(run.stages[2].status, 'passed_pending_approval');
  assert.ok(buildStockCsv([{ filename: 'a.png', title: 'Say "hi", ok', keywords: ['x'], category: 'c', generativeAi: true }]).includes('"Say ""hi"", ok"'));
}

// System 3 — dedup + window filter, disclosure-bearing issue, draft-only publish packet.
{
  const items = [];
  const sources = ['Hacker News', 'The Register', 'InfoQ', 'AWS Blog'];
  for (let i = 0; i < 8; i += 1) {
    items.push({ title: `Cloud architecture update ${i}`, url: `https://www.example.com/post/${i}?utm_source=rss`, source: sources[i % 4], publishedAt: `2026-09-1${i % 4}T10:00:00Z`, snippet: `Cloud architecture teams shipped change ${i} this week.` });
  }
  items.push({ ...items[0], url: 'https://example.com/post/0' }); // duplicate by canonical URL
  items.push({ title: 'Stale item', url: 'https://example.com/old', source: 'Old', publishedAt: '2026-01-01T00:00:00Z', snippet: 'old' });
  items.push({ title: 'Cloud Architecture Update 1', url: 'https://example.com/post/1-copy', source: 'Mirror', publishedAt: '2026-09-13T10:00:00Z', snippet: 'dup title' });

  const ranked = rankFeedItems(items, 'Cloud Architecture', new Date('2026-09-15T00:00:00Z'));
  assert.equal(ranked.length, 8);
  assert.ok(ranked.every((item) => !item.canonicalUrl.includes('utm_')));

  const run = await runIncomeSystem(
    { systemId: 'industry-newsletter', niche: 'Cloud Architecture', items, issueDate: '2026-09-15T00:00:00Z', affiliateTools: [{ name: 'ToolCo', url: 'https://toolco.example/?ref=ah', pitch: 'Deploy faster' }] },
    offline
  );
  assert.equal(run.ok, true, run.nextAction);
  assert.equal(run.overallGrade, 'A+');
  const issue = run.stages[1].artifacts[0].content;
  assert.ok(/Disclosure/.test(issue) && /affiliate links/i.test(issue));
  assert.ok(issue.includes('ToolCo'));
  const packet = JSON.parse(run.stages[2].artifacts[0].content);
  assert.equal(packet.payload.status, 'draft');
  assert.equal(packet.approval.required, true);
  assert.ok(packet.social.x.length <= 280);

  const thin = await runIncomeSystem({ systemId: 'industry-newsletter', niche: 'Cloud Architecture', items: items.slice(0, 2), issueDate: '2026-09-15T00:00:00Z' }, offline);
  assert.equal(thin.ok, false);
  assert.equal(thin.stages[0].status, 'failed');
  assert.equal(thin.stages[1].status, 'skipped');
  assert.equal(thin.stages[2].status, 'skipped');
  assert.equal(thin.overallGrade, 'F');
  assert.ok(thin.nextAction.startsWith('Fix pie-news-ingest'));
}

// Input validation
{
  assert.ok('error' in validateSystemInput({ systemId: 'nope' }));
  assert.ok('error' in validateSystemInput({ systemId: 'technical-ebook', topic: 'ab' }));
  assert.ok('error' in validateSystemInput({ systemId: 'stock-asset-factory', niche: 'cats' }));
  assert.ok('error' in validateSystemInput({ systemId: 'industry-newsletter', niche: 'AI', items: [] }));
  const ok = validateSystemInput({ systemId: 'technical-ebook', topic: 'Kubernetes Cost Control', priceUsd: 12.99 });
  assert.equal(ok.systemId, 'technical-ebook');
}

// API route
{
  const res = await engineGet(new Request('http://localhost/api/passive-income'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.systems.length, 3);
  assert.equal(body.agents.length, 10);
  assert.equal(body.verification.ok, true);

  assert.equal((await engineGet(new Request('http://localhost/api/passive-income?system=bogus'))).status, 400);
  assert.equal((await engineGet(new Request('http://localhost/api/passive-income?view=verify'))).status, 200);

  const unauthorized = await enginePost(new Request('http://localhost/api/passive-income', { method: 'POST', body: '{}' }));
  assert.equal(unauthorized.status, 401);

  process.env.AHFOS_INTERNAL_API_KEY = 'test-key';
  const bad = await enginePost(new Request('http://localhost/api/passive-income', { method: 'POST', headers: { 'x-api-key': 'test-key' }, body: '{"systemId":"technical-ebook"}' }));
  assert.equal(bad.status, 400);
  const good = await enginePost(new Request('http://localhost/api/passive-income', { method: 'POST', headers: { 'x-api-key': 'test-key', 'content-type': 'application/json' }, body: JSON.stringify({ systemId: 'stock-asset-factory', niche: 'corporate-slide-textures' }) }));
  assert.equal(good.status, 200);
  const payload = await good.json();
  assert.equal(payload.run.ok, true);
  assert.equal(payload.run.spendUsd, 0);
}

// RSS/Atom parsing used by the CLI --fetch path
{
  const rss = '<rss><channel><item><title><![CDATA[Hello &amp; welcome]]></title><link>https://example.com/a</link><pubDate>Mon, 14 Sep 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Snippet&lt;/p&gt;</description></item></channel></rss>';
  const atom = '<feed><entry><title>Atom post</title><link href="https://example.com/b"/><updated>2026-09-14T10:00:00Z</updated><summary>S</summary></entry></feed>';
  const [rssItem] = parseFeed(rss, 'example.com');
  assert.deepEqual(rssItem, { title: 'Hello & welcome', url: 'https://example.com/a', source: 'example.com', publishedAt: 'Mon, 14 Sep 2026 10:00:00 GMT', snippet: 'Snippet' });
  assert.equal(parseFeed(atom, 'example.com')[0].url, 'https://example.com/b');
  assert.equal(parseFeed('<html></html>', 'x').length, 0);
}

// Review hardening: run IDs are collision-resistant even for identical inputs in the same second.
{
  const input = { systemId: 'stock-asset-factory', niche: 'ui-icon-collections' };
  const [a, b] = await Promise.all([runIncomeSystem(input, offline), runIncomeSystem(input, offline)]);
  assert.notEqual(a.runId, b.runId);
}

// Hard gates: forbidden claims fail a stage even when the weighted score clears the threshold.
{
  assert.ok(isHardGate('listing-no-forbidden-claims'));
  assert.ok(isHardGate('issue-affiliate-disclosure'));
  assert.ok(isHardGate('csv-generative-flag'));
  assert.ok(!isHardGate('listing-title-length'));
  const checks = [
    { id: 'listing-no-forbidden-claims', ok: false, weight: 10, detail: '' },
    { id: 'listing-title-length', ok: true, weight: 90, detail: '' }
  ];
  assert.equal(hardGatesPass(checks), false);
  assert.equal(stagePasses({ passThreshold: 90 }, checks), false);

  const dirtyListing = JSON.stringify({
    title: 'FastAPI Deploy Guide',
    subtitle: 'Guaranteed income from day one',
    description: 'x'.repeat(400),
    bullets: ['a', 'b', 'c', 'd', 'e'],
    tags: ['fastapi', 'docker', 'devops', 'python', 'deploy'],
    priceUsd: 12,
    disclosure: 'AI-assisted; reviewed by a human before sale.'
  });
  const run = await runIncomeSystem(
    { systemId: 'technical-ebook', topic: 'FastAPI Deploys' },
    { complete: async (messages) => (messages[0].content.includes('listing') || messages[0].content.includes('Listing') ? dirtyListing : null) }
  );
  const listing = JSON.parse(run.stages.at(-1).artifacts[0].content);
  assert.ok(!JSON.stringify(listing).toLowerCase().includes('guaranteed income'));
  assert.ok(run.stages.at(-1).checks.find((c) => c.id === 'listing-no-forbidden-claims').ok);
}

// Requested chapter count is enforced exactly (LLM outline with too few chapters falls back).
{
  const shortOutline = JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ title: `Chapter Topic ${i} Deep Dive`, points: ['a', 'b', 'c'] })));
  const run = await runIncomeSystem(
    { systemId: 'technical-ebook', topic: 'Kubernetes Ops', chapterCount: 8 },
    { complete: async (messages) => (messages[1].content.includes('Chapters:') ? shortOutline : null) }
  );
  assert.equal(run.stages[0].artifacts[0].provenance, 'deterministic-template');
  assert.equal(JSON.parse(run.stages[0].artifacts[0].content).length, 8);
  assert.equal(run.stages[1].artifacts.length, 8);
}

// Requested stock batch size is enforced exactly; malformed metadata triggers deterministic fallback instead of throwing.
{
  const tenPrompts = JSON.stringify(Array.from({ length: 10 }, (_, i) => ({
    filename: `asset-${i}.png`,
    prompt: `abstract vector background ${i}, 4000x4000`,
    negativePrompt: 'people, faces, logos, photorealism',
    description: `pattern ${i}`
  })));
  const run = await runIncomeSystem(
    { systemId: 'stock-asset-factory', niche: 'seamless-tech-backgrounds', batchSize: 20 },
    { complete: async (messages) => (messages[1].content.includes('Batch size') ? tenPrompts : '[{"filename":"asset.png","keywords":[]}]') }
  );
  assert.equal(run.ok, true, run.nextAction);
  assert.equal(run.stages[0].artifacts[0].provenance, 'deterministic-template');
  assert.equal(JSON.parse(run.stages[0].artifacts[0].content).length, 20);
  assert.equal(run.stages[1].artifacts[0].provenance, 'deterministic-template');
  assert.equal(JSON.parse(run.stages[1].artifacts[0].content).length, 20);

  // Metadata with duplicate / invented filenames is rejected even when the row count matches.
  const batch = 10;
  const promptsOk = JSON.stringify(Array.from({ length: batch }, (_, i) => ({
    filename: `asset-${i}.png`,
    prompt: `abstract vector background ${i}, 4000x4000`,
    negativePrompt: 'people, faces, logos, photorealism',
    description: `pattern ${i}`
  })));
  const keywords = Array.from({ length: 30 }, (_, i) => `kw${i}`);
  const badMetadata = JSON.stringify(Array.from({ length: batch }, () => ({ filename: 'invented.png', title: 'T', keywords, category: 'c', generativeAi: true })));
  const run2 = await runIncomeSystem(
    { systemId: 'stock-asset-factory', niche: 'seamless-tech-backgrounds', batchSize: batch },
    { complete: async (messages) => (messages[1].content.includes('Batch size') ? promptsOk : badMetadata) }
  );
  assert.equal(run2.stages[0].artifacts[0].provenance, 'llm');
  assert.equal(run2.stages[1].artifacts[0].provenance, 'deterministic-template');
  assert.deepEqual(JSON.parse(run2.stages[1].artifacts[0].content).map((m) => m.filename).sort(), Array.from({ length: batch }, (_, i) => `asset-${i}.png`).sort());
}

// Run-wide budget: once exhausted, provider calls are skipped and deterministic templates finish the run.
{
  let providerCalls = 0;
  const ctx = createEngineContext({
    budgetMs: 1,
    complete: async () => { providerCalls += 1; await new Promise((r) => setTimeout(r, 50)); return 'never used'; }
  });
  const run = await runIncomeSystem({ systemId: 'technical-ebook', topic: 'Budgeted Run' }, ctx);
  assert.equal(run.ok, true, run.nextAction);
  assert.ok(providerCalls <= 1);
  assert.ok(run.stages.every((s) => s.artifacts.every((a) => a.provenance === 'deterministic-template')));
}

// CLI hardening: artifact keys cannot escape the run directory; feed bodies are size-capped.
{
  const runDir = '/tmp/pie-run';
  assert.equal(safeArtifactPath(runDir, 'chapters/01-intro.typ'), resolve(runDir, 'chapters/01-intro.typ'));
  for (const key of ['../escape.txt', 'chapters/../../escape.txt', '/etc/passwd', 'a\0b', '', '.']) {
    assert.throws(() => safeArtifactPath(runDir, key), key || '(empty)');
  }
  const bigBody = new Response(new Uint8Array(1024).fill(65));
  await assert.rejects(readBounded(bigBody, 512), /exceeds/);
  assert.equal(await readBounded(new Response('<rss/>'), 512), '<rss/>');
  await assert.rejects(readBounded(new Response('x', { headers: { 'content-length': '999999' } }), 512), /exceeds/);
}

console.log('passive-income-engine tests passed');
