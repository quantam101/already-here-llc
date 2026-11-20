import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const sourceConfig = JSON.parse(readFileSync(new URL('./procurement-radar.json', import.meta.url)));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const text = value => String(value ?? '').trim();
function iso(value, name) {
  if (!text(value) || !/(Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${name} must include an explicit timezone`);
  }
  return new Date(value).toISOString();
}
export function normalizeNotice(raw) {
  const agency = text(raw.agency); const solicitationId = text(raw.solicitationId);
  if (!agency || !solicitationId || !text(raw.title)) throw new Error('Agency, solicitation ID and title are required');
  const source = sourceConfig.approvedSources.find(item => item.id === raw.sourceId);
  if (!source) throw new Error('Unapproved source');
  const url = new URL(raw.url);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Source URL must be HTTPS without credentials');
  const canonicalAgency = agency.toLowerCase().replace(/\s+/g, ' ');
  const canonicalId = solicitationId.toUpperCase().replace(/\s+/g, '');
  const score = raw.score;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) throw new Error('Score must be 0–100');
  const eligibility = raw.eligibility ?? 'unknown';
  if (!['verified','unknown','disqualified'].includes(eligibility)) throw new Error('Invalid eligibility');
  const status = raw.status ?? 'open';
  if (!['open','closed','cancelled','awarded'].includes(status)) throw new Error('Invalid status');
  const noticeType = raw.noticeType ?? 'solicitation';
  if (!['solicitation','sources_sought','presolicitation','award'].includes(noticeType)) throw new Error('Invalid notice type');
  return { key: digest([canonicalAgency, canonicalId]), agency, solicitationId, title: text(raw.title),
    sourceId: source.id, url: url.href, dueAt: iso(raw.dueAt, 'dueAt'), observedAt: iso(raw.observedAt, 'observedAt'),
    score, eligibility, status, noticeType, location: text(raw.location),
    value: raw.value == null ? null : text(raw.value), requirements: Array.isArray(raw.requirements) ? raw.requirements.map(text) : [],
    evidence: Array.isArray(raw.evidence) ? raw.evidence.map(text) : [],
    nextAction: text(raw.nextAction) || 'Review official scope, requirements and bid economics' };
}
export function assessNotice(notice, now = new Date()) {
  const reasons = [];
  const age = now.getTime() - Date.parse(notice.observedAt);
  if (notice.status !== 'open') reasons.push(notice.status);
  if (notice.noticeType !== 'solicitation') reasons.push('Capture or award intelligence; not an open bid');
  if (Date.parse(notice.dueAt) <= now.getTime()) reasons.push('Deadline passed');
  if (age < -300000 || age > sourceConfig.watchPolicy.freshnessHours * 3600000) reasons.push('Evidence stale or future-dated');
  if (notice.score < sourceConfig.watchPolicy.minimumScore) reasons.push('Below fit threshold');
  if (notice.eligibility === 'disqualified') reasons.push('Eligibility disqualified');
  if (!notice.evidence.length) reasons.push('Missing qualification evidence');
  return { alert: reasons.length === 0, decision: reasons.length ? 'HOLD' : notice.eligibility === 'verified' ? 'REVIEW_FOR_BID' : 'VERIFY_ELIGIBILITY',
    reasons, urgent: Date.parse(notice.dueAt) - now.getTime() < 72 * 3600000 };
}
export function openContractStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS contract_notices (key TEXT PRIMARY KEY, version TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS contract_history (key TEXT NOT NULL, version TEXT NOT NULL, observed_at TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(key,version));
    CREATE TABLE IF NOT EXISTS contract_alerts (id TEXT PRIMARY KEY, key TEXT NOT NULL, version TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS contract_sources (id TEXT PRIMARY KEY, attempted_at TEXT NOT NULL, completed_at TEXT, error TEXT);`);
  return db;
}
export function saveNotice(db, raw, now = new Date()) {
  const notice = normalizeNotice(raw);
  // Source URL and observation timestamps are provenance, not an amendment.
  const { sourceId, url, observedAt, ...material } = notice;
  void sourceId; void url;
  const version = digest(material); const assessment = assessNotice(notice, now);
  db.exec('BEGIN IMMEDIATE');
  try {
    const old = db.prepare('SELECT payload,version FROM contract_notices WHERE key=?').get(notice.key);
    if (old && Date.parse(JSON.parse(old.payload).observedAt) > Date.parse(observedAt)) {
      db.exec('COMMIT'); return { notice, assessment, changed: false, queued: false, ignored: 'older observation' };
    }
    const changed = !old || old.version !== version;
    const payload = JSON.stringify(notice);
    db.prepare('INSERT INTO contract_notices VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET version=excluded.version,payload=excluded.payload').run(notice.key, version, payload);
    db.prepare('INSERT OR IGNORE INTO contract_history VALUES (?,?,?,?)').run(notice.key, version, observedAt, payload);
    const pending = db.prepare('SELECT id FROM contract_alerts WHERE key=? AND version=? AND state IN (\'pending\',\'delivered\')').get(notice.key, version);
    // Invalidate superseded or no-longer-qualified messages before dispatch.
    db.prepare("UPDATE contract_alerts SET state='superseded' WHERE key=? AND state='pending' AND (version<>? OR ?=0)").run(notice.key, version, Number(assessment.alert));
    const queued = assessment.alert && !pending;
    if (queued) db.prepare('INSERT INTO contract_alerts VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,payload=excluded.payload').run(digest([notice.key, version]), notice.key, version, 'pending', JSON.stringify({ notice, assessment }));
    db.exec('COMMIT'); return { notice, assessment, changed, queued };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function recordSourceRun(db, sourceId, { attemptedAt, completedAt = null, error = null }) {
  if (!sourceConfig.approvedSources.some(source => source.id === sourceId)) throw new Error('Unapproved source');
  attemptedAt = iso(attemptedAt, 'attemptedAt');
  if (completedAt) completedAt = iso(completedAt, 'completedAt');
  if (error && completedAt) throw new Error('Failed scans cannot advance coverage freshness');
  db.prepare(`INSERT INTO contract_sources VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET attempted_at=excluded.attempted_at,
    completed_at=COALESCE(excluded.completed_at,contract_sources.completed_at),error=excluded.error`).run(sourceId, attemptedAt, completedAt, error ? text(error) : null);
}
export function exportWatch(db, now = new Date()) {
  const notices = db.prepare('SELECT payload FROM contract_notices').all().map(row => {
    const notice = JSON.parse(row.payload); return { ...notice, assessment: assessNotice(notice, now) };
  }).sort((a,b) => b.score-a.score);
  const health = new Map(db.prepare('SELECT * FROM contract_sources').all().map(row => [row.id,row]));
  const sources = sourceConfig.approvedSources.map(source => {
    const run = health.get(source.id);
    const fresh = run?.completed_at && now.getTime()-Date.parse(run.completed_at) <= sourceConfig.watchPolicy.freshnessHours*3600000;
    return { ...source, ...(run ?? {}), health: run?.error ? 'ERROR' : fresh ? 'FRESH' : run ? 'STALE' : 'NOT_CHECKED' };
  });
  const pendingAlerts = db.prepare("SELECT id,payload FROM contract_alerts WHERE state='pending'").all()
    .map(row => ({ id: row.id, ...JSON.parse(row.payload) })).filter(item => assessNotice(item.notice, now).alert);
  return { generatedAt: now.toISOString(), notices, sources, pendingAlerts, deliveryStatus: 'Unconfirmed: pending outbox is not delivered notification' };
}
export async function syncSam(db, { apiKey, postedFrom, postedTo, now = new Date(), fetchImpl = fetch, maxPages = 10 }) {
  if (!apiKey) throw new Error('SAM_API_KEY is required server-side');
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(postedFrom ?? '') || !/^\d{2}\/\d{2}\/\d{4}$/.test(postedTo ?? '')) throw new Error('SAM date window must use MM/dd/yyyy');
  if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error('maxPages must be positive');
  let total = 0; let pages = 0; let complete = false;
  try {
    for (let offset = 0; pages < maxPages; offset += 1) {
      const url = new URL('https://api.sam.gov/opportunities/v2/search');
      for (const [key,value] of Object.entries({api_key:apiKey,postedFrom,postedTo,limit:1000,offset})) url.searchParams.set(key,String(value));
      let response;
      try { response = await fetchImpl(url, { signal: AbortSignal.timeout(30000), redirect: 'error' }); }
      catch { throw new Error('SAM request failed; credentials and request URL omitted'); }
      if (!response.ok) throw new Error(`SAM HTTP ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body.opportunitiesData) || !Number.isInteger(body.totalRecords) || body.totalRecords < 0) throw new Error('Invalid SAM response');
      pages++;
      for (const item of body.opportunitiesData) {
        // Keep the source adapter honest: no guessed scores or inferred eligibility.
        if (!item.solicitationNumber || !item.responseDeadLine || !item.noticeId) continue;
        const title = text(item.title);
        const matching = sourceConfig.includeTerms.filter(term => title.toLowerCase().includes(term.toLowerCase()));
        saveNotice(db, { agency:item.fullParentPathName || item.department || 'Federal agency not specified',solicitationId:item.solicitationNumber,
          title,sourceId:'sam-gov-contract-opportunities',url:`https://sam.gov/opp/${encodeURIComponent(item.noticeId)}/view`,
          dueAt:item.responseDeadLine,observedAt:now.toISOString(),score:0,eligibility:'unknown',
          status:item.active === 'Yes' ? 'open' : 'closed',noticeType:item.type === 'Award Notice' ? 'award' : ['Solicitation','Combined Synopsis/Solicitation'].includes(item.type) ? 'solicitation' : item.type === 'Sources Sought' ? 'sources_sought' : 'presolicitation',
          evidence:matching.length ? [`Title keyword matches only: ${matching.join(', ')}`] : [],
          nextAction:'Read official documents and qualify fit, delivery readiness and economics before scoring' },now);
        total++;
      }
      if (offset * 1000 + body.opportunitiesData.length >= body.totalRecords) { complete = true; break; }
      if (!body.opportunitiesData.length) throw new Error('SAM pagination incomplete');
    }
    if (!complete) throw new Error('Page limit reached: coverage incomplete');
    recordSourceRun(db,'sam-gov-contract-opportunities',{attemptedAt:now.toISOString(),completedAt:now.toISOString()});
    return { total,pages,complete,scope:{postedFrom,postedTo} };
  } catch (error) {
    // Never persist transport messages that can contain API keys.
    const message = /^SAM HTTP \d+$|^Invalid SAM response$|^SAM pagination incomplete$|^Page limit reached: coverage incomplete$/.test(error.message) ? error.message : 'SAM sync failed; inspect source data and explicit timezone requirements';
    recordSourceRun(db,'sam-gov-contract-opportunities',{attemptedAt:now.toISOString(),error:message});
    throw new Error(message);
  }
}
