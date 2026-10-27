/**
 * Reproducible zero-SaaS outbox for an owned, self-hosted runtime.
 * NEVER sends email, DMs, SMS or makes purchases. Human approval and
 * independently evidenced manual delivery are mandatory.
 * Node 22 (with --experimental-sqlite) and Node 24+.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

function required(v, name, max=200) {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error('Invalid '+name);
  return v.trim();
}
function utc(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v) || !Number.isFinite(Date.parse(v)))
    throw new Error('Expected UTC ISO date-time');
  return new Date(v).toISOString();
}
function tenantId(v) {
  const s=required(v,'tenant ID',64);
  if (!/^[a-z][a-z0-9-]{1,63}$/.test(s)) throw new Error('Invalid tenant ID');
  return s;
}
function email(v) {
  const s=required(v,'email address',160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error('Invalid email address');
  return s;
}
export class OwnedOutbox {
  constructor(filename=':memory:') {
    if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(filename);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    this.db.exec([
      "CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, tenant TEXT NOT NULL, campaign TEXT NOT NULL, dedupe_key TEXT NOT NULL, recipient TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('transactional','marketing')), subject TEXT NOT NULL, body TEXT NOT NULL, consent_source TEXT, consent_at TEXT, scheduled_at TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('review','approved','delivered','suppressed')), approved_by TEXT, approved_at TEXT, proof TEXT, delivered_at TEXT, created_at TEXT NOT NULL, UNIQUE(tenant,dedupe_key))",
      "CREATE INDEX IF NOT EXISTS messages_due ON messages(tenant,state,scheduled_at)",
      "CREATE TABLE IF NOT EXISTS suppression (tenant TEXT NOT NULL, recipient TEXT NOT NULL, reason TEXT NOT NULL, at TEXT NOT NULL, PRIMARY KEY(tenant,recipient))",
      "CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, tenant TEXT NOT NULL, message_id TEXT, action TEXT NOT NULL, at TEXT NOT NULL)"
    ].join(';')+';');
  }
  audit(tenant,id,action,at) {
    this.db.prepare('INSERT INTO audit_events(id,tenant,message_id,action,at) VALUES(?,?,?,?,?)')
      .run(randomUUID(),tenant,id,action,at);
  }
  enqueue(input,now=new Date().toISOString()) {
    const tenant=tenantId(input.tenant);
    const campaign=required(input.campaign,'campaign',120);
    const dedupe=required(input.dedupeKey,'dedupe key',200);
    const recipient=email(input.recipient);
    const kind=input.kind;
    if (!['transactional','marketing'].includes(kind)) throw new Error('Unsupported kind');
    const subject=required(input.subject,'subject',240);
    const body=required(input.body,'body',80000);
    const timestamp=utc(now),scheduled=utc(input.scheduledAt??timestamp);
    const consent=input.consent;
    if (kind==='marketing' && (consent?.granted!==true || !consent.source?.trim() || !consent.at))
      throw new Error('Explicit timestamped marketing consent required');
    const consentAt=kind==='marketing'?utc(consent.at):null;
    const consentSource=kind==='marketing'?required(consent.source,'consent source',200):null;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const prior=this.db.prepare('SELECT id,state FROM messages WHERE tenant=? AND dedupe_key=?').get(tenant,dedupe);
      if (prior) { this.db.exec('COMMIT'); return {id:prior.id,state:prior.state,inserted:false}; }
      const block=this.db.prepare('SELECT 1 FROM suppression WHERE tenant=? AND recipient=?').get(tenant,recipient);
      if (block) throw new Error('Recipient is suppressed');
      const id=randomUUID();
      this.db.prepare('INSERT INTO messages(id,tenant,campaign,dedupe_key,recipient,kind,subject,body,consent_source,consent_at,scheduled_at,state,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(id,tenant,campaign,dedupe,recipient,kind,subject,body,consentSource,consentAt,scheduled,'review',timestamp);
      this.audit(tenant,id,'created',timestamp);
      this.db.exec('COMMIT');
      return {id,state:'review',inserted:true};
    } catch(e) { this.db.exec('ROLLBACK'); throw e; }
  }
  approve(tenantValue,id,operator,now=new Date().toISOString()) {
    const tenant=tenantId(tenantValue),reviewer=required(operator,'operator',120),at=utc(now);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const changed=this.db.prepare("UPDATE messages SET state='approved',approved_by=?,approved_at=? WHERE tenant=? AND id=? AND state='review' AND NOT EXISTS (SELECT 1 FROM suppression s WHERE s.tenant=messages.tenant AND s.recipient=messages.recipient)")
        .run(reviewer,at,tenant,required(id,'message ID',64));
      if (changed.changes!==1) throw new Error('Message unavailable for approval');
      this.audit(tenant,id,'approved',at); this.db.exec('COMMIT');return true;
    } catch(e) {this.db.exec('ROLLBACK');throw e;}
  }
  listDue(tenantValue,now=new Date().toISOString()) {
    const tenant=tenantId(tenantValue),at=utc(now);
    return this.db.prepare("SELECT id,campaign,recipient,kind,subject,body,scheduled_at,approved_by,approved_at FROM messages m WHERE tenant=? AND state='approved' AND scheduled_at<=? AND NOT EXISTS (SELECT 1 FROM suppression s WHERE s.tenant=m.tenant AND s.recipient=m.recipient) ORDER BY scheduled_at,id").all(tenant,at);
  }
  // Records an independently supplied delivery proof. NEVER sends a message.
  recordManualDelivery(tenantValue,id,evidence,now=new Date().toISOString()) {
    const tenant=tenantId(tenantValue),proof=required(evidence,'delivery proof',1000),at=utc(now);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result=this.db.prepare("UPDATE messages SET state='delivered',proof=?,delivered_at=? WHERE tenant=? AND id=? AND state='approved' AND scheduled_at<=? AND NOT EXISTS (SELECT 1 FROM suppression s WHERE s.tenant=messages.tenant AND s.recipient=messages.recipient)")
        .run(proof,at,tenant,required(id,'message ID',64),at);
      if (result.changes!==1) throw new Error('Cannot record delivery for this message');
      this.audit(tenant,id,'manual_delivery_recorded',at);this.db.exec('COMMIT');return true;
    }catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  suppress(tenantValue,recipientValue,reason,now=new Date().toISOString()) {
    const tenant=tenantId(tenantValue),recipient=email(recipientValue),why=required(reason,'reason',300),at=utc(now);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO suppression(tenant,recipient,reason,at) VALUES(?,?,?,?) ON CONFLICT(tenant,recipient) DO UPDATE SET reason=excluded.reason,at=excluded.at').run(tenant,recipient,why,at);
      this.db.prepare("UPDATE messages SET state='suppressed' WHERE tenant=? AND recipient=? AND state IN ('review','approved')").run(tenant,recipient);
      this.audit(tenant,null,'recipient_suppressed',at);this.db.exec('COMMIT');return true;
    }catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  // Includes sensitive PII: export only through operator-controlled workflows.
  exportTenant(tenantValue) {
    const tenant=tenantId(tenantValue);
    return {schemaVersion:1,tenant,
      messages:this.db.prepare('SELECT * FROM messages WHERE tenant=? ORDER BY created_at,id').all(tenant),
      suppressions:this.db.prepare('SELECT * FROM suppression WHERE tenant=? ORDER BY recipient').all(tenant),
      auditEvents:this.db.prepare('SELECT * FROM audit_events WHERE tenant=? ORDER BY at,id').all(tenant)};
  }
  close(){this.db.close();}
}
