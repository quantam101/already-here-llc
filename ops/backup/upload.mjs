// Run only from the privileged GitHub Actions backup job, never from the site.
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { put, list, del } from '@vercel/blob';

const file = process.argv[2];
const token = process.env.VERCEL_BLOB_BACKUP_TOKEN;
if (!file || !token) throw new Error('Encrypted file and private Blob token are required');

const prefix = 'already-here/redis/';
const uploaded = await put(`${prefix}${basename(file)}`, await readFile(file), {
  access: 'private',
  contentType: 'application/octet-stream',
  addRandomSuffix: false,
  token,
});
if (!uploaded.pathname.startsWith(prefix) || !uploaded.url.includes('.private.blob.vercel-storage.com/')) {
  throw new Error('Backup did not reach the expected private store');
}
console.log(`Encrypted backup uploaded: ${uploaded.pathname}`);

// Retention cleanup runs only after a successful new backup upload.
const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
let cursor;
const expired = [];
do {
  const result = await list({ prefix, cursor, token, limit: 1000 });
  for (const blob of result.blobs) {
    if (blob.pathname.startsWith(prefix) &&
        blob.pathname.endsWith('.aes') &&
        new Date(blob.uploadedAt).getTime() < cutoff) {
      expired.push(blob.url);
    }
  }
  cursor = result.hasMore ? result.cursor : undefined;
} while (cursor);
for (const url of expired) await del(url, { token });
console.log(`Expired encrypted backups removed: ${expired.length}`);
