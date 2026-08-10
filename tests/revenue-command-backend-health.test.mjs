import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'revenue-backend-health-'));
process.env.REVENUE_COMMAND_DB_PATH = join(dir, 'db.sqlite3');
const db = await import('../lib/revenue-command-db.ts');
const health = await import('../lib/revenue-command-backend-health.ts');

const fakeFetch = async (url) => new Response(JSON.stringify({ ok: true, url }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const result = await health.probeBackend({ baseUrl: 'https://backend.example.com', service: 'test-oci', observedAt: '2026-08-10T17:00:00.000Z' }, fakeFetch);
assert.equal(result.ok, true);
assert.equal(result.state, 'healthy');
assert.equal(result.healthz.status, 200);
assert.equal(result.readyz.status, 200);
const persisted = await health.persistBackendProbe(result);
assert.equal(persisted.ok, true);
assert.equal(db.getDatabaseStats().system_health_signals, 1);
assert.equal(db.getDatabaseStats().verification_history, 1);

const degradedFetch = async (url) => new Response('', { status: String(url).endsWith('/healthz') ? 200 : 503 });
const degraded = await health.probeBackend({ baseUrl: 'https://backend.example.com', service: 'test-oci' }, degradedFetch);
assert.equal(degraded.state, 'degraded');

db.closeDatabase();
rmSync(dir, { recursive: true, force: true });
console.log('revenue command backend health tests passed');
