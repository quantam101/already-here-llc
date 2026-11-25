// Only accepts a short-lived, operation-scoped Vercel Blob PUT URL.
// Never provide a store-wide Blob token to this process.
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const file = process.argv[2];
const signedUrl = process.env.BACKUP_SIGNED_PUT_URL;
if (!file || !signedUrl) throw new Error('Encrypted file and signed PUT URL are required');
const url = new URL(signedUrl);
const name = basename(file);
if (
  url.protocol !== 'https:' ||
  !/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/i.test(url.hostname) ||
  !url.pathname.startsWith('/already-here/redis/') ||
  !url.pathname.endsWith('/' + name) ||
  !url.searchParams.has('vercel-blob-delegation') ||
  !url.searchParams.has('vercel-blob-signature') ||
  url.username || url.password || url.port
) throw new Error('Signed URL must target the expected private Blob path and filename');
const encrypted = await readFile(file);
if (!encrypted.length) throw new Error('Refusing empty encrypted backup');
const response = await fetch(url, {
  method: 'PUT',
  headers: { 'content-type': 'application/octet-stream' },
  body: encrypted,
  redirect: 'error',
  signal: AbortSignal.timeout(120000),
});
if (!response.ok) throw new Error('Private backup upload failed: HTTP ' + response.status);
console.log('Encrypted backup uploaded to private store: ' + url.pathname);
