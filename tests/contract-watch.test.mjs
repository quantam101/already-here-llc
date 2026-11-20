import test from 'node:test';
import assert from 'node:assert/strict';
import { openContractStore,saveNotice,exportWatch,normalizeNotice,syncSam } from '../ops/local-revenue-radar/contract-watch.mjs';
const now = new Date('2026-11-03T12:00:00Z');
const notice = {agency:'Test agency',solicitationId:'TEST-1',title:'IT support',sourceId:'sam-gov-contract-opportunities',url:'https://sam.gov/opp/test/view',dueAt:'2026-11-10T17:00:00-07:00',observedAt:now.toISOString(),score:90,eligibility:'verified',evidence:['Test fixture only: qualified requirements']};
test('cross-portal dedupe, amendment history, superseded outbox and restart durability', async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs'); const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=mkdtempSync(join(tmpdir(),'contract-test-'));const path=join(dir,'test.db');let db=openContractStore(path);
 try {
  assert.equal(saveNotice(db,notice,now).queued,true);
  assert.equal(saveNotice(db,{...notice,sourceId:'instantmarkets',url:'https://www.instantmarkets.com/test'},now).queued,false);
  assert.equal(saveNotice(db,{...notice,dueAt:'2026-11-11T17:00:00-07:00'},now).queued,true);
  assert.equal(exportWatch(db,now).pendingAlerts.length,1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM contract_history').get().n,2);
  db.close();db=openContractStore(path);assert.equal(exportWatch(db,now).notices.length,1);
  saveNotice(db,{...notice,status:'cancelled',observedAt:'2026-11-03T12:01:00Z'},new Date('2026-11-03T12:01:00Z'));
  assert.equal(exportWatch(db,now).pendingAlerts.length,0);
  assert.equal(saveNotice(db,notice,now).ignored,'older observation');
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('expired, stale, unknown eligibility, false qualification and ambiguous deadlines',()=>{
 const db=openContractStore(':memory:');try{
 assert.equal(saveNotice(db,{...notice,dueAt:'2026-11-01T12:00:00Z'},now).queued,false);
 assert.equal(saveNotice(db,{...notice,observedAt:'2026-10-01T12:00:00Z'},now).queued,false);
 assert.equal(saveNotice(db,{...notice,eligibility:'unknown'},now).assessment.decision,'VERIFY_ELIGIBILITY');
 assert.equal(saveNotice(db,{...notice,evidence:[]},now).queued,false);
 assert.equal(saveNotice(db,{...notice,noticeType:'sources_sought'},now).queued,false);
 assert.throws(()=>normalizeNotice({...notice,dueAt:'2026-11-10T17:00:00'}),/timezone/);
 assert.throws(()=>normalizeNotice({...notice,score:NaN}),/Score/);
 assert.throws(()=>normalizeNotice({...notice,url:'javascript:alert(1)'}),/HTTPS/);
 }finally{db.close();}
});
test('partial SAM scan retains pages but never reports completed coverage or leaks credentials',async()=>{
 const db=openContractStore(':memory:');let calls=0;
 try{
 await assert.rejects(syncSam(db,{apiKey:'secret-test-key',postedFrom:'11/01/2026',postedTo:'11/03/2026',now,fetchImpl:async()=>{
 calls++;if(calls>1)throw new Error('URL with secret-test-key');
 return {ok:true,json:async()=>({totalRecords:1001,opportunitiesData:[{solicitationNumber:'SAM1',responseDeadLine:notice.dueAt,noticeId:'1',title:'IT support',active:'Yes',type:'Solicitation',department:'Test agency'}]})};
 }}),/SAM sync failed/);
 const snapshot=exportWatch(db,now);assert.equal(snapshot.notices.length,1);assert.equal(snapshot.pendingAlerts.length,0);
 const source=snapshot.sources.find(s=>s.id==='sam-gov-contract-opportunities');assert.equal(source.health,'ERROR');assert.equal(source.completed_at,null);assert.doesNotMatch(JSON.stringify(snapshot),/secret-test-key/);
 }finally{db.close();}
});
test('unread sources are explicitly not checked; complete empty scan is fresh',async()=>{
 const db=openContractStore(':memory:');try{
 assert.ok(exportWatch(db,now).sources.every(s=>s.health==='NOT_CHECKED'));
 await syncSam(db,{apiKey:'key',postedFrom:'11/01/2026',postedTo:'11/03/2026',now,fetchImpl:async()=>({ok:true,json:async()=>({totalRecords:0,opportunitiesData:[]})})});
 assert.equal(exportWatch(db,now).sources.find(s=>s.id==='sam-gov-contract-opportunities').health,'FRESH');
 assert.equal(exportWatch(db,now).pendingAlerts.length,0);
 }finally{db.close();}
});
test('SAM pagination uses page indexes and respects complete coverage',async()=>{
 const db=openContractStore(':memory:');const offsets=[];
 try{
 const result=await syncSam(db,{apiKey:'test',postedFrom:'11/01/2026',postedTo:'11/03/2026',now,fetchImpl:async url=>{
 const index=Number(url.searchParams.get('offset'));offsets.push(index);
 return {ok:true,json:async()=>({totalRecords:1001,opportunitiesData:index===0?Array.from({length:1000},()=>({})): [{}]})};
 }});
 assert.deepEqual(offsets,[0,1]);assert.equal(result.complete,true);assert.equal(result.pages,2);
 }finally{db.close();}
});
