// Run only from the privileged GitHub Actions backup job, never from the site.
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { put } from '@vercel/blob';

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

