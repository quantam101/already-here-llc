import assert from 'node:assert/strict';
import {
  createLevel4Event,
  executeWithLevel4Resiliency,
  getLevel4Event,
  getLevel4RuntimeSnapshot,
  recordLevel4Event,
  resetLevel4RuntimeForTests,
  serializeFormDataForLevel4
} from '../lib/level4-resiliency.ts';

resetLevel4RuntimeForTests();

{
  const formData = new FormData();
  formData.set('fullName', 'Taylor Buyer');
  formData.set('company', 'Already Here LLC');
  formData.set('attachment', new File(['test'], 'scope.pdf', { type: 'application/pdf' }));

  const payload = serializeFormDataForLevel4(formData);
  assert.equal(payload.fields.fullName, 'Taylor Buyer');
  assert.equal(payload.fields.company, 'Already Here LLC');
  assert.equal(Array.isArray(payload.files), true);
  assert.equal(payload.files[0].name, 'scope.pdf');
  assert.equal(payload.files[0].retained, false);
}

{
  const event = createLevel4Event({
    type: 'dispatch.delivery',
    source: 'test',
    payload: { dispatchId: 'AH-TEST-1', company: 'Already Here LLC' }
  });

  const result = await executeWithLevel4Resiliency({
    event,
    primary: async () => ({ ok: true, provider: 'primary' })
  });

  assert.deepEqual(result, { ok: true, provider: 'primary' });
  const saved = getLevel4Event(event.id);
  assert.equal(saved.status, 'committed');
  assert.equal(saved.attempts, 1);
  assert.equal(saved.lastError, null);
}

{
  const event = createLevel4Event({
    type: 'dispatch.delivery',
    source: 'test',
    payload: { dispatchId: 'AH-TEST-2', company: 'Already Here LLC' }
  });

  const result = await executeWithLevel4Resiliency({
    event,
    primary: async () => {
      throw new Error('provider outage');
    },
    fallback: ({ event: fallbackEvent, error }) => ({
      ok: true,
      degraded: true,
      eventId: fallbackEvent.id,
      reason: error.message
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.degraded, true);
  assert.equal(result.reason, 'provider outage');
  const saved = getLevel4Event(event.id);
  assert.equal(saved.status, 'degraded_queued');
  assert.equal(saved.deterministicFallback, true);
  assert.equal(saved.lastError, 'provider outage');
}

{
  const event = createLevel4Event({
    type: 'dispatch.delivery',
    source: 'test',
    payload: { dispatchId: 'AH-TEST-3', company: 'Already Here LLC' },
    maxAttempts: 1
  });

  await assert.rejects(
    () => executeWithLevel4Resiliency({
      event,
      primary: async () => {
        throw new Error('fatal provider outage');
      }
    }),
    /fatal provider outage/
  );

  const saved = getLevel4Event(event.id);
  assert.equal(saved.status, 'dead_letter');
  assert.equal(saved.attempts, 1);
}

{
  const event = createLevel4Event({
    type: 'manual.audit',
    source: 'test',
    payload: { id: 'manual-1' }
  });
  recordLevel4Event(event);

  const snapshot = getLevel4RuntimeSnapshot();
  assert.equal(snapshot.level, 4);
  assert.equal(snapshot.service, 'already-here-context-mesh');
  assert.equal(snapshot.mode, 'degraded');
  assert.equal(snapshot.queueDepth >= 1, true);
  assert.equal(snapshot.deadLetterDepth >= 1, true);
  assert.equal(snapshot.degradedQueuedCount >= 1, true);
  assert.equal(snapshot.committedCount >= 1, true);
  assert.equal(typeof snapshot.providers.resend, 'string');
}

console.log('level4 resiliency runtime tests passed');
