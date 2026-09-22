import assert from 'assert';

process.env.NEXT_PUBLIC_SITE_URL = 'https://www.alreadyherellc.com';
process.env.CANONICAL_STORE_TYPE = 'memory';

const { getCanonicalStore, resetCanonicalStore } = await import('../lib/canonical-store.ts');
const {
  buildPartnerWrites,
  buildUserReferralWrites,
  buildReferralConversionWrite,
  buildReferralCodeUpdate,
  getOrCreateUserReferralCode,
  getReferralStats,
  isValidReferralCode,
  normalizePartnerType
} = await import('../lib/referral.ts');

process.env.REFERRAL_CONVERT_SECRET = 'test-convert-secret';

resetCanonicalStore();
const store = getCanonicalStore();

// Test 1: partner writes create a partner and an active referral code
const partnerInput = {
  name: 'Partner Co',
  company: 'Partner Co LLC',
  type: 'msp',
  contactEmail: 'partner@example.invalid',
  website: 'https://partner.example.invalid',
  notes: 'Test partner application'
};
const partnerWrites = buildPartnerWrites(partnerInput);
assert.strictEqual(partnerWrites.length, 2);
assert.strictEqual(partnerWrites[0].table, 'partners');
assert.strictEqual(partnerWrites[1].table, 'referral_codes');

const partnerWriteResult = await store.executeWrites(partnerWrites);
assert.strictEqual(partnerWriteResult.ok, true);

const partner = await store.getRecord('partners', partnerWrites[0].id);
assert.ok(partner);
assert.strictEqual(partner.name, 'Partner Co');
assert.strictEqual(partner.type, 'msp');
assert.strictEqual(partner.status, 'pending');
assert.ok(isValidReferralCode(partner.referral_code));
assert.strictEqual(normalizePartnerType('prime contractor'), 'prime_contractor');
assert.strictEqual(normalizePartnerType('MSP'), 'msp');

const partnerCode = await store.getRecord('referral_codes', partnerWrites[1].id);
assert.ok(partnerCode);
assert.strictEqual(partnerCode.owner_type, 'partner');
assert.strictEqual(partnerCode.owner_id, partner.id);
assert.strictEqual(partnerCode.status, 'active');

// Test 2: user referral code creation and idempotency
const { code: userCode, created } = await getOrCreateUserReferralCode(store, { email: 'user@example.invalid' });
assert.strictEqual(created, true);
assert.strictEqual(userCode.owner_type, 'user');
assert.ok(isValidReferralCode(userCode.code));

const { code: userCodeAgain, created: createdAgain } = await getOrCreateUserReferralCode(store, { email: 'user@example.invalid' });
assert.strictEqual(createdAgain, false);
assert.strictEqual(userCodeAgain.code, userCode.code);

// Test 3: stats are empty before conversions
const stats = await getReferralStats(store, userCode.code, process.env.NEXT_PUBLIC_SITE_URL);
assert.strictEqual(stats.conversions, 0);
assert.strictEqual(stats.totalRevenueCents, 0);
assert.strictEqual(stats.totalRewardsCents, 0);
assert.ok(stats.link.includes(`ref=${userCode.code}`));

// Test 4: referral conversion updates code stats
const conversionWrite = buildReferralConversionWrite({
  code: userCode.code,
  referredEmail: 'buyer@example.invalid',
  referredName: 'Buyer Person',
  eventType: 'checkout',
  sourceTable: 'revenue_events',
  sourceId: 'rev_test_123',
  revenueCents: 14900,
  rewardCents: 2500
}, userCode);

const codeUpdate = buildReferralCodeUpdate(userCode, 14900, 2500);
const conversionResult = await store.executeWrites([conversionWrite, codeUpdate]);
assert.strictEqual(conversionResult.ok, true);

const updatedCode = await store.getRecord('referral_codes', userCode.id);
assert.strictEqual(updatedCode.conversions_count, 1);
assert.strictEqual(updatedCode.total_revenue_cents, 14900);
assert.strictEqual(updatedCode.total_rewards_cents, 2500);

const updatedStats = await getReferralStats(store, userCode.code, process.env.NEXT_PUBLIC_SITE_URL);
assert.strictEqual(updatedStats.conversions, 1);
assert.strictEqual(updatedStats.totalRevenueCents, 14900);
assert.strictEqual(updatedStats.totalRewardsCents, 2500);

// Test 5: user referral writes accept a custom code
const customWrites = buildUserReferralWrites({ email: 'custom@example.invalid', code: 'AH-TEST01' });
assert.strictEqual(customWrites.length, 1);
assert.strictEqual(customWrites[0].record.code, 'AH-TEST01');

// Test 6: partner API route accepts a valid signup
const { POST: partnerPost } = await import('../app/api/partners/route.ts');
const partnerResponse = await partnerPost(new Request('http://localhost:3000/api/partners', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Route Partner',
    company: 'Route Partner LLC',
    type: 'vendor',
    contactEmail: 'route@example.invalid'
  })
}));
assert.strictEqual(partnerResponse.status, 200);
const partnerJson = await partnerResponse.json();
assert.strictEqual(partnerJson.ok, true);
assert.ok(isValidReferralCode(partnerJson.referralCode));

// Test 7: referral POST route creates a user code
const { POST: referralPost } = await import('../app/api/referrals/route.ts');
const referralResponse = await referralPost(new Request('http://localhost:3000/api/referrals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'post@example.invalid' })
}));
assert.strictEqual(referralResponse.status, 200);
const referralJson = await referralResponse.json();
assert.strictEqual(referralJson.ok, true);
assert.ok(isValidReferralCode(referralJson.stats.code));

// Test 8: conversion API rejects unauthenticated requests
const { POST: convertPost } = await import('../app/api/referrals/convert/route.ts');
const convertUnauthorized = await convertPost(new Request('http://localhost:3000/api/referrals/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: referralJson.stats.code,
    sourceId: 'rev_post_123',
    revenueCents: 30500,
    rewardCents: 2500
  })
}));
assert.strictEqual(convertUnauthorized.status, 401);

// Test 9: conversion API records a conversion for the referral code with the secret
const convertResponse = await convertPost(new Request('http://localhost:3000/api/referrals/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-referral-secret': 'test-convert-secret' },
  body: JSON.stringify({
    code: referralJson.stats.code,
    sourceId: 'rev_post_123',
    revenueCents: 30500,
    rewardCents: 2500
  })
}));
assert.strictEqual(convertResponse.status, 200);
const convertJson = await convertResponse.json();
assert.strictEqual(convertJson.ok, true);
assert.strictEqual(convertJson.revenueCents, 30500);

// Test 10: repeating the same conversion is idempotent
const convertDupResponse = await convertPost(new Request('http://localhost:3000/api/referrals/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-referral-secret': 'test-convert-secret' },
  body: JSON.stringify({
    code: referralJson.stats.code,
    sourceId: 'rev_post_123',
    revenueCents: 30500,
    rewardCents: 2500
  })
}));
assert.strictEqual(convertDupResponse.status, 200);
const convertDupJson = await convertDupResponse.json();
assert.strictEqual(convertDupJson.duplicated, true);

const finalStats = await getReferralStats(store, referralJson.stats.code, process.env.NEXT_PUBLIC_SITE_URL);
assert.strictEqual(finalStats.conversions, 1);
assert.strictEqual(finalStats.totalRevenueCents, 30500);
assert.strictEqual(finalStats.totalRewardsCents, 2500);

console.log('referral-partner tests passed');
