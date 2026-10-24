/**
 * Controlled proof transport: sends ONLY to a loopback SMTP sink.
 * A real internet mailbox is intentionally impossible: the TCP host and
 * SMTP recipient are hardcoded to local test identities.
 *
 * Atomic quotas live in the same SQLite DB as OwnedOutbox, not RAM.
 * The delivery reservation is durable BEFORE SMTP DATA is transmitted.
 * On a crash/uncertain acknowledgment it will NOT retry automatically.
 */
import { createConnection } from 'node:net';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { OwnedOutbox } from './owned-zero-spend-outbox.mjs';

const sinkAddress='proof@localhost.invalid';
function time(value) {
  if (typeof value!=='string' || !Number.isFinite(Date.parse(value)) ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)) {
    throw new Error('Expected explicit UTC date/time');
  }
  return new Date(value).toISOString();
}
function positiveLimit(n,label) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 1000) throw new Error('Invalid '+label);
  return n;
}
function header(text) {
  return String(text).replace(/[\r\n\0]/g,' ').slice(0,240);
}

export async function sendToLoopbackSmtp(message,port) {
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
    throw new Error('Explicit unprivileged local port required');
  }
  // No DNS lookup, user-supplied hostname, TLS upgrade, remote MX or paid API.
  const socket=createConnection({host:'127.0.0.1',port});
  socket.setTimeout(5000,()=>socket.destroy(new Error('Local SMTP timeout')));
  const reader=createInterface({input:socket,crlfDelay:Infinity});
  const lines=reader[Symbol.asyncIterator]();
  async function expect(code) {
    let line;
    do {
      const next=await lines.next();
      if (next.done) throw new Error('SMTP local sink disconnected');
      line=next.value;
      if (!/^\d{3}[ -]/.test(line)) throw new Error('Invalid SMTP response');
    } while(line[3]==='-');
    if (Number(line.slice(0,3))!==code) throw new Error('Local SMTP response code: '+line.slice(0,3));
    return line;
  }
  function send(line) {
    socket.write(line+'\r\n');
  }
  try {
    await once(socket,'connect');
    await expect(220);
    send('EHLO localhost.invalid');await expect(250);
    send('MAIL FROM:<'+sinkAddress+'>');await expect(250);
    // The actual lead address never appears in SMTP RCPT TO.
    send('RCPT TO:<'+sinkAddress+'>');await expect(250);
    send('DATA');await expect(354);
    const rawBody=String(message.body).replace(/\r\n|\r/g,'\n');
    const payload=[
      'From: <'+sinkAddress+'>',
      'To: <'+sinkAddress+'>',
      'Subject: '+header(message.subject),
      'X-AlreadyHere-Proof: local-sink-only',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'INTERNAL AUTOMATION PROOF. No actual customer delivery.',
      ...rawBody.split('\n')
    ].map(line=>line.startsWith('.')?'.'+line:line).join('\r\n');
    send(payload+'\r\n.');
    const result=await expect(250);
    send('QUIT');await expect(221);
    return {accepted:true,proof:'local-smtp-'+randomUUID(),localResponse:result};
  } finally {
    reader.close();socket.destroy();
  }
}

export class OwnedLoopbackDelivery {
  constructor(outbox,{tenant,maxDaily,maxMonthly,port}) {
    if (!(outbox instanceof OwnedOutbox)) throw new Error('OwnedOutbox instance required');
    if (typeof tenant!=='string' || !/^[a-z][a-z0-9-]{1,63}$/.test(tenant)) throw new Error('Invalid tenant');
    this.outbox=outbox;this.tenant=tenant;
    this.maxDaily=positiveLimit(maxDaily,'daily quota');
    this.maxMonthly=positiveLimit(maxMonthly,'monthly quota');
    if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port');
    this.port=port;
    outbox.db.exec([
      "CREATE TABLE IF NOT EXISTS delivery_quota (tenant TEXT NOT NULL, period TEXT NOT NULL, ceiling INTEGER NOT NULL, reserved INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tenant,period), CHECK(ceiling>=1 AND reserved>=0))",
      "CREATE TABLE IF NOT EXISTS delivery_attempts (id TEXT PRIMARY KEY,tenant TEXT NOT NULL,message_id TEXT NOT NULL,at TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('reserved','accepted','uncertain')),proof TEXT, UNIQUE(tenant,message_id))"
    ].join(';')+';');
  }
  reserve(id,now=new Date().toISOString()) {
    const at=time(now),tenant=this.tenant,db=this.outbox.db;
    const day=at.slice(0,10),month=at.slice(0,7);
    db.exec('BEGIN IMMEDIATE');
    try {
      const message=db.prepare(
        "SELECT id,tenant,recipient,kind,subject,body,scheduled_at,consent_source,consent_at,approved_by FROM messages m WHERE tenant=? AND id=? AND state='approved' AND scheduled_at<=? AND NOT EXISTS (SELECT 1 FROM suppression s WHERE s.tenant=m.tenant AND s.recipient=m.recipient)"
      ).get(tenant,id,at);
      if (!message) throw new Error('Not approved, not due, or suppressed');
      if (message.kind==='marketing' && (!message.consent_source || !message.consent_at)) {
        throw new Error('Marketing consent missing');
      }
      if (db.prepare('SELECT id FROM delivery_attempts WHERE tenant=? AND message_id=?').get(tenant,id)) {
        throw new Error('Already reserved; never automatically retry an uncertain send');
      }
      for (const [period,ceiling] of [[day,this.maxDaily],[month,this.maxMonthly]]) {
        db.prepare(
          'INSERT OR IGNORE INTO delivery_quota(tenant,period,ceiling,reserved) VALUES(?,?,?,0)'
        ).run(tenant,period,ceiling);
        const update=db.prepare(
          'UPDATE delivery_quota SET reserved=reserved+1 WHERE tenant=? AND period=? AND reserved<ceiling'
        ).run(tenant,period);
        if (update.changes!==1) throw new Error('Hard quota exhausted: '+period);
      }
      const attempt=randomUUID();
      db.prepare(
        "INSERT INTO delivery_attempts(id,tenant,message_id,at,status) VALUES(?,?,?,?,'reserved')"
      ).run(attempt,tenant,id,at);
      this.outbox.audit(tenant,id,'local_delivery_reserved',at);
      db.exec('COMMIT');
      return {attempt,message};
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  finalize(id,proof,now=new Date().toISOString()) {
    const at=time(now),tenant=this.tenant,db=this.outbox.db;
    db.exec('BEGIN IMMEDIATE');
    try{
      const update=db.prepare(
        "UPDATE delivery_attempts SET status='accepted',proof=? WHERE tenant=? AND message_id=? AND status='reserved'"
      ).run(String(proof).slice(0,1000),tenant,id);
      if(update.changes!==1) throw new Error('Attempt already resolved');
      const message=db.prepare(
        "UPDATE messages SET state='delivered',proof=?,delivered_at=? WHERE tenant=? AND id=? AND state='approved'"
      ).run(String(proof).slice(0,1000),at,tenant,id);
      if(message.changes!==1) throw new Error('Message no longer approved');
      this.outbox.audit(tenant,id,'local_sink_accepted',at);
      db.exec('COMMIT');return true;
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  markUncertain(id,now=new Date().toISOString()) {
    const at=time(now),db=this.outbox.db,tenant=this.tenant;
    db.exec('BEGIN IMMEDIATE');
    try {
      const update=db.prepare(
        "UPDATE delivery_attempts SET status='uncertain' WHERE tenant=? AND message_id=? AND status='reserved'"
      ).run(tenant,id);
      if(update.changes===1)this.outbox.audit(tenant,id,'local_delivery_uncertain',at);
      db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  async deliverOne(id,now=new Date().toISOString()) {
    const {message}=this.reserve(id,now);
    try{
      const reply=await sendToLoopbackSmtp(message,this.port);
      this.finalize(id,reply.proof,now);
      return {accepted:true,localSinkOnly:true,messageId:id,proof:reply.proof};
    }catch(e){
      this.markUncertain(id,now);
      throw e;
    }
  }
  async deliverDue(now=new Date().toISOString()) {
    const due=this.outbox.listDue(this.tenant,now);
    const results=[];
    for (const message of due) {
      try {results.push(await this.deliverOne(message.id,now));}
      catch(e){results.push({accepted:false,messageId:message.id,reason:e instanceof Error?e.message:String(e)});}
    }
    return results;
  }
  inspect() {
    const db=this.outbox.db,tenant=this.tenant;
    return {
      quotas:db.prepare('SELECT period,ceiling,reserved FROM delivery_quota WHERE tenant=? ORDER BY period').all(tenant),
      attempts:db.prepare('SELECT message_id,status,proof FROM delivery_attempts WHERE tenant=? ORDER BY at,id').all(tenant)
    };
  }
}
