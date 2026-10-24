import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { OwnedOutbox } from '../lib/owned-zero-spend-outbox.mjs';
import { OwnedLoopbackDelivery, sendToLoopbackSmtp } from '../lib/owned-loopback-delivery.mjs';

const dir=mkdtempSync(join(tmpdir(),'ah-smtp-zero-spend-'));
const dbFile=join(dir,'campaign','local.sqlite');
const time='2026-10-24T22:00:00.000Z';
const nextDay='2026-10-25T22:00:00.000Z';
const addresses=[];
const accepted=[];
const commands=[];
const server=createServer(socket=>{
  socket.write('220 local-test-only ESMTP\r\n');
  const lines=createInterface({input:socket,crlfDelay:Infinity});
  let data=false,packet=[];
  lines.on('line',line=>{
    if (data) {
      if (line==='.') {
        data=false;
        accepted.push(packet.join('\n'));
        packet=[];
        socket.write('250 local sink accepted - no internet egress\r\n');
      }else packet.push(line);
      return;
    }
    commands.push(line.split(' ')[0]);
    if(line.startsWith('EHLO '))socket.write('250-localhost\r\n250 PIPELINING\r\n');
    else if(line.startsWith('MAIL FROM:'))socket.write('250 sender local\r\n');
    else if(line.startsWith('RCPT TO:')){
      addresses.push(line.slice('RCPT TO:'.length));
      socket.write('250 receiver local\r\n');
    }else if(line==='DATA'){data=true;socket.write('354 end with dot\r\n');}
    else if(line==='QUIT'){socket.write('221 bye\r\n');socket.end();}
    else socket.write('500 unsupported\r\n');
  });
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
const port=server.address().port;
const tenant='already-here-llc';
const company='separate-business';
const sample=(dedupeKey,recipient='internal-qa@example.org',scheduledAt=time)=>({
  tenant,campaign:'commercial-cabling',dedupeKey,recipient,
  kind:'marketing',subject:'Cabling follow-up - internal proof',
  body:'This is a synthetic internal marketing test. No customer was contacted.',
  scheduledAt,consent:{granted:true,source:'internal-qa-checkbox',at:time}
});
function enqueueApproved(db,item) {
  const row=db.enqueue(item,time);
  db.approve(item.tenant,row.id,'Internal QA reviewer',time);
  return row.id;
}
let store;
const proof={test:'owned-loopback-smtp',date:'2026-10-24',externalNetworkCalls:0,paidProviderCalls:0,realCustomerMessages:0};
try {
  store=new OwnedOutbox(dbFile);
  const gate=new OwnedLoopbackDelivery(store,{tenant,maxDaily:2,maxMonthly:2,port});
  assert.throws(()=>new OwnedLoopbackDelivery(store,{tenant,maxDaily:0,maxMonthly:2,port}),/quota/);
  assert.throws(()=>sendToLoopbackSmtp({subject:'hi',body:'hi'},25),/unprivileged/);
  const first=enqueueApproved(store,sample('lead-a/day2'));
  const second=enqueueApproved(store,sample('lead-b/day2'));
  const third=enqueueApproved(store,sample('lead-c/day2'));

  // Nothing leaves the queue before an explicit, internal-only runner executes.
  assert.equal(accepted.length,0);
  const results=await gate.deliverDue(time);
  assert.equal(results.filter(r=>r.accepted).length,2);
  assert.equal(results.filter(r=>!r.accepted).length,1);
  assert.match(results.find(r=>!r.accepted).reason,/quota/);
  assert.equal(accepted.length,2);
  assert(addresses.every(a=>a==='<proof@localhost.invalid>'));
  assert(accepted.every(body=>body.includes('INTERNAL AUTOMATION PROOF')));
  assert(accepted.every(body=>!body.includes('To: <internal-qa@example.org>')));
  assert.deepEqual(gate.inspect().quotas.map(x=>x.reserved),[2,2]);
  assert.equal(store.exportTenant(tenant).messages.filter(m=>m.state==='delivered').length,2);
  assert.equal(store.exportTenant(tenant).messages.find(m=>m.id===third).state,'approved');

  // A repeat runner can neither duplicate sends nor raise the committed cap.
  const repeated=await gate.deliverDue(time);
  assert.equal(repeated.filter(x=>x.accepted).length,0);
  assert.equal(accepted.length,2);
  store.close();
  store=new OwnedOutbox(dbFile);
  const restarted=new OwnedLoopbackDelivery(store,{tenant,maxDaily:100,maxMonthly:100,port});
  assert.deepEqual(restarted.inspect().quotas.map(x=>x.ceiling),[2,2]);
  const afterRestart=await restarted.deliverDue(nextDay);
  assert.equal(afterRestart.filter(x=>x.accepted).length,0);
  assert.match(afterRestart[0].reason,/quota/);
  assert.equal(accepted.length,2);

  // Tenant B is isolated: same email/lead key does not inherit A's quota.
  const other=enqueueApproved(store,{...sample('lead-a/day2'),tenant:company});
  const otherGate=new OwnedLoopbackDelivery(store,{tenant:company,maxDaily:1,maxMonthly:1,port});
  assert.equal((await otherGate.deliverOne(other,time)).accepted,true);
  assert.equal(accepted.length,3);
  assert.equal(otherGate.inspect().quotas[0].reserved,1);

  // Revocation is checked at the actual reservation boundary.
  const suppressed=enqueueApproved(store,sample('lead-d/day2','stop@example.org'));
  store.suppress(tenant,'stop@example.org','unsubscribe',time);
  assert.deepEqual(store.listDue(tenant,time).map(m=>m.id).includes(suppressed),false);
  assert.rejects(restarted.deliverOne(suppressed,time),/Not approved/);
  assert.equal(accepted.length,3);

  // Uncertain sends reserve a permanent attempt before network delivery.
  // A restart cannot double-deliver even if the transport crashed.
  const uncertain=enqueueApproved(store,{...sample('lead-e/day2'),tenant:'uncertain-tenant'});
  const uncertainGate=new OwnedLoopbackDelivery(store,{tenant:'uncertain-tenant',maxDaily:1,maxMonthly:1,port});
  uncertainGate.reserve(uncertain,time); // simulate process crash after durable reservation
  store.close();
  store=new OwnedOutbox(dbFile);
  const recovered=new OwnedLoopbackDelivery(store,{tenant:'uncertain-tenant',maxDaily:1,maxMonthly:1,port});
  await assert.rejects(recovered.deliverOne(uncertain,time),/Already reserved/);
  assert.equal(accepted.length,3);

  const audit=store.exportTenant(tenant).auditEvents;
  assert.equal(audit.filter(x=>x.action==='local_sink_accepted').length,2);
  assert.equal(audit.filter(x=>x.action==='local_delivery_reserved').length,2);
  assert(accepted.every(x=>x.includes('X-AlreadyHere-Proof: local-sink-only')));
  assert(commands.includes('DATA')&&commands.includes('QUIT'));
  proof.verdict='PASS';
  proof.localSmtpAcceptances=accepted.length;
  proof.companyTenantAcceptances=2;
  proof.secondTenantAcceptances=1;
  proof.dailyAndMonthlyQuota=2;
  proof.restartAndDuplicateProtection=true;
  proof.suppressionAndConsent=true;
  proof.onlyReceiver='proof@localhost.invalid';
  proof.revenueCreated=0;
  proof.externalMessages=0;
  mkdirSync('.tmp',{recursive:true});
  writeFileSync('.tmp/owned-zero-spend-delivery-proof.json',JSON.stringify(proof,null,2)+'\n');
  console.log('OWNED ZERO-SPEND SMTP PROOF PASS');
  console.log(JSON.stringify(proof));
}finally{
  store?.close();
  server.close();
  await once(server,'close');
  rmSync(dir,{recursive:true,force:true});
}
