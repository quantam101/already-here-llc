import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const requiredMarkers = [
  ['lib/site.ts', "stripeProfileHandle: '@alreadyherellc'"],
  ['components/StripePaymentButton.tsx', 'siteConfig.stripeProfileHandle'],
  ['app/api/stripe/checkout/route.ts', 'stripeProfileHandle: siteConfig.stripeProfileHandle'],
  ['docs/field-ops/CLIENT-ONBOARDING-PACKET.md', '@alreadyherellc'],
  ['docs/field-ops/MSA.md', '@alreadyherellc'],
  ['docs/field-ops/RETAINER-AGREEMENT.md', '@alreadyherellc'],
  ['docs/field-ops/PAYMENT-AND-REMITTANCE-STANDARD.md', '@alreadyherellc']
];

for (const [file, marker] of requiredMarkers) {
  assert.ok(read(file).includes(marker), `${file} must include ${marker}`);
}

const publicRoots = ['app', 'components', 'content/blog', 'public'];
const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.md', '.mdx', '.html', '.txt', '.json']);

const forbiddenPatterns = [
  ['payout-account disclosure', /funds are deposited into your payout account/i],
  ['bank-account ending disclosure', /bank of america[^\n]{0,100}(?:ending(?: in)?|account(?: number)?|acct\.?)[^\n]{0,30}\d{4}/i],
  ['routing-number disclosure', /routing\s*(?:number|#|no\.?)[^\n]{0,50}\d{6,}/i],
  ['full-account-number disclosure', /account\s*(?:number|#|no\.?)[^\n]{0,50}\d{6,}/i]
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (textExtensions.has(path.extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}

for (const relRoot of publicRoots) {
  for (const file of walk(path.join(root, relRoot))) {
    const content = fs.readFileSync(file, 'utf8');
    for (const [name, pattern] of forbiddenPatterns) {
      assert.equal(pattern.test(content), false, `${name} found in public surface: ${path.relative(root, file)}`);
    }
  }
}

console.log('Payment identity and public bank-detail privacy controls passed.');
