import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OwnedOutbox } from '../lib/owned-zero-spend-outbox.mjs';

const root=mkdtempSync(join(tmpdir(),'owned-outbox-test-'));
const dbPath=join(root,'data','outbox.sqlite');
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw Error('Outbox must not call a network API');};

const now='2026-10-24T12:00:00.000Z';
const due='2026-10-26T12:00:00.000Z';
const later='2026-10-27T12:00:00.000Z';
const market={
  tenant:'already-here-llc',campaign:'phoenix-cabling',
  dedupeKey:'lead-A-day2',recipient:'qa@example.org',
  kind:'marketing',subject:'Cabling planning tip',
  body:'A planning checklist without marketing or purchase obligations.',
  consent:{granted:true,at:now,source:'website-checkbox'},
  scheduledAt:due
};
try {
  let db=new OwnedOutbox(dbPath);
  assert.throws(()=>db.enqueue({...market,consent:{granted:false,at:now,source:'website'}},now),/consent/);
  assert.throws(()=>db.enqueue({...market,consent:undefined},now),/consent/);
  const first=db.enqueue(market,now);
  assert.equal(first.inserted,true);
  assert.equal(first.state,'review');
  assert.equal(db.enqueue({...market,body:'REPLAY IS IGNORED'},now).inserted,false);
  assert.equal(db.exportTenant(market.tenant).messages.length,1);
  assert.deepEqual(db.listDue(market.tenant,later),[],'Unapproved messages never transmit');
  assert.throws(()=>db.approve('another-company',first.id,'operator',now),/unavailable/);
  db.approve(market.tenant,first.id,'Operator - human review',now);
  assert.deepEqual(db.listDue(market.tenant,now),[],'No early sends before schedule');
  assert.equal(db.listDue(market.tenant,later)[0].recipient,'qa@example.org');
  assert.throws(()=>db.recordManualDelivery(market.tenant,first.id,'manual outbound receipt',now),/Cannot record/);
  assert.equal(db.recordManualDelivery(market.tenant,first.id,'Mailbox sent-item evidence #manual-1',later),true);
  assert.deepEqual(db.listDue(market.tenant,later),[],'Delivered message cannot be resent');
  assert.throws(()=>db.recordManualDelivery(market.tenant,first.id,'duplicate',later),/Cannot record/);

  // Same event identifier can be used by another tenant without accessing data across tenants.
  const other=db.enqueue({...market,tenant:'other-tenant',recipient:'other@example.org'},now);
  assert.notEqual(other.id,first.id);
  assert.equal(db.exportTenant('other-tenant').messages.length,1);
  assert.equal(db.exportTenant(market.tenant).messages.length,1);
  assert.equal(db.exportTenant('other-tenant').messages[0].body,market.body);

  // Suppress an approved prospect and reject any future queued message.
  const next=db.enqueue({...market,dedupeKey:'lead-B-day4',recipient:'stop@example.org'},now);
  db.approve(market.tenant,next.id,'Operator',now);
  db.suppress(market.tenant,'stop@example.org','unsubscribe',now);
  assert.deepEqual(db.listDue(market.tenant,later),[]);
  assert.equal(db.exportTenant(market.tenant).messages.find(x=>x.id===next.id).state,'suppressed');
  assert.throws(()=>db.enqueue({...market,dedupeKey:'lead-B-new',recipient:'stop@example.org'},now),/suppressed/);

  // Transactional messages still require approval, but not separate marketing opt-in.
  const receipt=db.enqueue({...market,dedupeKey:'receipt-1',kind:'transactional',consent:undefined,recipient:'receipt@example.org',scheduledAt:now},now);
  assert.equal(receipt.state,'review');
  assert.throws(()=>db.approve(market.tenant,receipt.id,'',now),/operator/);
  db.close();

  // Prove durable replay, delivered receipts and suppression after a process restart.
  db=new OwnedOutbox(dbPath);
  assert.equal(db.enqueue(market,now).inserted,false);
  assert.equal(db.exportTenant(market.tenant).messages.find(x=>x.id===first.id).state,'delivered');
  assert.equal(db.exportTenant(market.tenant).suppressions.length,1);
  assert(db.exportTenant(market.tenant).auditEvents.some(x=>x.action==='manual_delivery_recorded'));
  db.close();
  console.log('Owned outbox contract verified: durable restart, idempotency, tenant isolation, human approval, consent, schedule, suppression, manual delivery, no network');
} finally {
  globalThis.fetch=originalFetch;
  rmSync(root,{recursive:true,force:true});
}
