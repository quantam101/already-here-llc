import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditPortableCampaign } from '../lib/portable-campaign.ts';

const reference = JSON.parse(readFileSync(
  new URL('../config/campaigns/phoenix-cabling.reference.json', import.meta.url),
  'utf8'
));
const base = auditPortableCampaign(reference);
assert.equal(base.ok, true, base.errors.join('; '));
assert.equal(base.urls.landing, 'https://www.alreadyherellc.com/phoenix-cabling-checklist');

// One implementation is reproducible in markets with different languages,
// currencies, jurisdictions, geographic scope and local time conventions.
for (const market of [
  { country: 'GB', region: '', locale: 'en-GB', timeZone: 'Europe/London', currency: 'GBP' },
  { country: 'JP', region: 'Tokyo', locale: 'ja-JP', timeZone: 'Asia/Tokyo', currency: 'JPY' },
  { country: 'BR', region: 'SP', locale: 'pt-BR', timeZone: 'America/Sao_Paulo', currency: 'BRL' }
]) {
  const p = structuredClone(reference);
  p.market = market;
  p.publicOrigin = 'https://business.example';
  p.businessName = 'Local Service Organization';
  const test = auditPortableCampaign(p);
  assert.equal(test.ok, true, test.errors.join('; '));
  assert.equal(test.urls.quote, 'https://business.example/rfq');
}

function expectBlock(change, fragment) {
  const p = structuredClone(reference);
  change(p);
  const result = auditPortableCampaign(p);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes(fragment)),
    'Expected rejection containing ' + fragment + ', got: ' + result.errors.join('; '));
  assert.equal(result.urls, null);
}
expectBlock(p => { p.policy.monthlySubscriptionBudgetUsd = 1; }, 'Strict zero-spend');
expectBlock(p => { p.policy.explicitMarketingConsentRequired = false; }, 'Strict zero-spend');
expectBlock(p => { p.policy.approvalRequiredForQuotesAndPayments = false; }, 'Strict zero-spend');
expectBlock(p => { p.adapters.email.mode = 'paid'; }, 'cannot guarantee');
expectBlock(p => { p.adapters.email.automaticPaidOverages = true; }, 'cannot guarantee');
expectBlock(p => {
  p.adapters.email = { mode: 'free_tier', provider: 'mail-api',
    recurringCostCeilingUsd: 0, quotaLimit: 50,
    failClosedAtQuota: false, automaticPaidOverages: false };
}, 'requires a positive quota');
const capped = structuredClone(reference);
capped.adapters.email = { mode: 'free_tier', provider: 'mail-api',
  recurringCostCeilingUsd: 0, quotaLimit: 50,
  failClosedAtQuota: true, automaticPaidOverages: false };
assert.equal(auditPortableCampaign(capped).ok, true);

expectBlock(p => { p.publicOrigin = 'http://business.example'; }, 'HTTPS');
expectBlock(p => { p.routes.quote = 'https://vendor.example/rfq'; }, 'safe relative');
expectBlock(p => { p.routes.guide = '//external.example/guide'; }, 'safe relative');
expectBlock(p => { p.routes.guide = '/../secrets'; }, 'safe relative');
expectBlock(p => { p.market.timeZone = 'Random/Nowhere'; }, 'time zone');
expectBlock(p => { p.market.locale = 'not a locale!'; }, 'country, region');

assert.match(readFileSync(new URL('../docs/NO_SPEND_POLICY.md', import.meta.url), 'utf8'), /strict zero-spend/);
assert.match(readFileSync(new URL('../docs/ENTERPRISE_PORTABLE_ZERO_SPEND_STANDARD.md', import.meta.url), 'utf8'), /reproducib/i);
console.log('Portable campaign contracts: three international markets, zero-spend, consent, caps, relative routes: pass');
