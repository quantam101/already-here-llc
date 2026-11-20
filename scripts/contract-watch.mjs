import { readFileSync, writeFileSync } from 'node:fs';
import { openContractStore, saveNotice, exportWatch, syncSam } from '../ops/local-revenue-radar/contract-watch.mjs';
const [command, file] = process.argv.slice(2);
const db = openContractStore(process.env.CONTRACT_WATCH_DB || 'data/procurement/contract-watch.db');
try {
  if (command === 'import' && file) {
    const records = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(records)) throw new Error('Input must be an array of qualified notices');
    console.log(JSON.stringify(records.map(record => saveNotice(db, record))));
  } else if (command === 'export' && file) {
    writeFileSync(file, JSON.stringify(exportWatch(db), null, 2));
    console.log('Exported snapshot. Pending alerts are not delivery confirmation.');
  } else if (command === 'sync-sam') {
    console.log(JSON.stringify(await syncSam(db, { apiKey: process.env.SAM_API_KEY, postedFrom:process.env.SAM_POSTED_FROM, postedTo:process.env.SAM_POSTED_TO })));
  } else throw new Error('Usage: node scripts/contract-watch.mjs import notices.json | export snapshot.json | sync-sam (SAM_API_KEY, SAM_POSTED_FROM, SAM_POSTED_TO)');
} catch(error) { console.error(error.message); process.exitCode=1; }
finally { db.close(); }
