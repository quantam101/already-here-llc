import assert from 'node:assert/strict';
import { decideOutcome, executeOutcome, parseLocation, serviceCatalog } from '../lib/conversation-outcome.ts';
import { GET as outcomeGet } from '../app/api/ai-receptionist/outcome/route.ts';
import { looksLikeQuestion, answerQuestion } from '../lib/conversation-knowledge.ts';

function lead(overrides = {}) {
  return {
    fullName: 'Taylor Owner',
    company: 'Phoenix Service Company',
    phone: '602-555-0100',
    serviceType: 'network support',
    location: 'Phoenix, AZ',
    urgency: 'normal',
    preferredTime: 'tomorrow morning',
    message: 'Router is flaky at the office.',
    ...overrides
  };
}

// Catalog sanity
assert.ok(serviceCatalog.length >= 5, 'service catalog should cover the receptionist question set');
assert.equal(serviceCatalog[serviceCatalog.length - 1].id, 'smart_hands', 'last catalog entry is the catch-all');

// Location parsing
assert.deepEqual(parseLocation('123 Main St, Phoenix, AZ 85001'), { siteAddress: '123 Main St', siteCity: 'Phoenix', siteState: 'AZ', siteZip: '85001' });
assert.equal(parseLocation(''), null);
assert.equal(parseLocation('Austin, TX'), null, 'non-AZ locations are not dispatch-ready');

// Quote issued: contact + in-coverage + no street address
const quote = decideOutcome(lead());
assert.equal(quote.kind, 'quote_issued');
assert.equal(quote.serviceId, 'network_support');
assert.equal(quote.priority, 'normal');
assert.ok(quote.quoteRangeUsd.low > 0 && quote.quoteRangeUsd.high >= quote.quoteRangeUsd.low);
assert.ok(quote.policyChecks.find((c) => c.name === 'coverage_area').passed);
assert.equal(quote.policyChecks.find((c) => c.name === 'dispatch_ready').passed, false);
assert.match(quote.confirmation, /\$\d+–\$\d+/);

// Dispatch created: street address present
const dispatch = decideOutcome(lead({ location: '4800 E Ray Rd, Phoenix, AZ 85044' }));
assert.equal(dispatch.kind, 'dispatch_created');
assert.equal(dispatch.policyChecks.find((c) => c.name === 'dispatch_ready').passed, true);
assert.match(dispatch.confirmation, /scheduled|dispatched/i);

// Emergency escalation without a street address still closes the loop
const emergency = decideOutcome(lead({ urgency: 'emergency', message: 'network is down' }));
assert.equal(emergency.kind, 'urgent_escalation');
assert.equal(emergency.priority, 'urgent');
assert.match(emergency.responseWindow, /immediate/i);

// Missing contact degrades to needs_details
const noContact = decideOutcome(lead({ phone: undefined, email: undefined }));
assert.equal(noContact.kind, 'needs_details');
assert.equal(noContact.policyChecks.find((c) => c.name === 'contact_provided').passed, false);

// Out-of-area, non-emergency
const outOfArea = decideOutcome(lead({ location: 'Austin, TX' }));
assert.equal(outOfArea.kind, 'out_of_area');
assert.equal(outOfArea.policyChecks.find((c) => c.name === 'coverage_area').passed, false);

// Service matching
assert.equal(decideOutcome(lead({ serviceType: 'door access control' })).serviceId, 'door_access');
assert.equal(decideOutcome(lead({ serviceType: 'equipment removal' })).serviceId, 'equipment_removal');
assert.equal(decideOutcome(lead({ serviceType: 'mckesson healthcare install' })).serviceId, 'healthcare_equipment');
assert.equal(decideOutcome(lead({ serviceType: 'ai receptionist setup' })).serviceId, 'ai_receptionist');
assert.equal(decideOutcome(lead({ serviceType: 'something vague' })).serviceId, 'smart_hands');

// executeOutcome: non-dispatch outcomes do no work
const none = await executeOutcome('http://localhost/api/ai-receptionist/outcome', lead(), quote);
assert.equal(none.executed, 'none');

// executeOutcome: unparsable location degrades to intake fallback
const fallback = await executeOutcome('http://localhost/api/ai-receptionist/outcome', lead({ location: 'Austin, TX', urgency: 'emergency' }), emergency);
assert.equal(fallback.executed, 'intake_fallback');

// City-only emergency never creates a work order with a pending street address
const cityOnly = await executeOutcome(
  'http://localhost/api/ai-receptionist/outcome',
  lead({ location: 'Phoenix, AZ', urgency: 'emergency' }),
  decideOutcome(lead({ location: 'Phoenix, AZ', urgency: 'emergency' }))
);
assert.equal(cityOnly.executed, 'intake_fallback');

// Knowledge layer: question detection
assert.equal(looksLikeQuestion('how many jobs are open?'), true);
assert.equal(looksLikeQuestion('What is the status of my work order'), true);
assert.equal(looksLikeQuestion('Tell me about open leads'), true);
assert.equal(looksLikeQuestion('Phoenix, AZ'), false);
assert.equal(looksLikeQuestion('tomorrow morning'), false);
assert.equal(looksLikeQuestion('Can you fix my Wi-Fi?'), false, 'service requests phrased as questions must advance intake');
assert.equal(looksLikeQuestion('Can you tell me my work order status?'), true);
assert.equal(looksLikeQuestion('Do you have any open leads?'), true);

// Knowledge layer: answers come back even when stores are empty or unconfigured
const kb = await answerQuestion('how many work orders exist?');
assert.equal(typeof kb.answered, 'boolean');
assert.equal(typeof kb.text, 'string');
assert.ok('canonical' in kb.sources && 'brain' in kb.sources);

// GET route reports the loop
const getRes = await outcomeGet();
const getBody = await getRes.json();
assert.equal(getBody.ok, true);
assert.match(getBody.loop, /policy check/);

console.log('conversation-outcome tests passed');
