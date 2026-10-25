#!/usr/bin/env node
/**
 * Local operator CLI for an owned outbox. No network, no billable actions.
 * Access to this host and file grants access to sensitive contact records.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { OwnedOutbox } from '../lib/owned-zero-spend-outbox.mjs';

function args(argv) {
  const result={};
  for (let i=0;i<argv.length;i+=2) {
    const key=argv[i],value=argv[i+1];
    if (!key?.startsWith('--') || value===undefined) throw Error('Expected --name value arguments');
    result[key.slice(2)]=value;
  }
  return result;
}
const [command,...rest]=process.argv.slice(2);
const help='Commands: enqueue --file input.json; pending --tenant TENANT; approve --tenant TENANT --id UUID --operator NAME; sent --tenant TENANT --id UUID --proof RECEIPT; suppress --tenant TENANT --email EMAIL --reason REASON; export --tenant TENANT --file new-export.json';
if (!command || command==='help') {
  console.log(help);
  process.exit(0);
}
let db;
try {
  const p=args(rest);
  const filename=process.env.OWNED_OUTBOX_DB || './data/owned-outbox.sqlite';
  db=new OwnedOutbox(filename);
  let result;
  if (command==='enqueue') {
    result=db.enqueue(JSON.parse(readFileSync(p.file,'utf8')));
  } else if (command==='pending') {
    result=db.listDue(p.tenant);
  } else if (command==='approve') {
    result=db.approve(p.tenant,p.id,p.operator);
  } else if (command==='sent') {
    result=db.recordManualDelivery(p.tenant,p.id,p.proof);
  } else if (command==='suppress') {
    result=db.suppress(p.tenant,p.email,p.reason);
  } else if (command==='export') {
    const data=JSON.stringify(db.exportTenant(p.tenant),null,2)+'\n';
    writeFileSync(p.file,data,{encoding:'utf8',flag:'wx',mode:0o600});
    result={exported:true,file:p.file};
  } else throw Error(help);
  console.log(JSON.stringify(result,null,2));
} catch (error) {
  console.error('Outbox operation rejected: '+(error instanceof Error?error.message:String(error)));
  process.exitCode=1;
} finally {
  db?.close();
}
