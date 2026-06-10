import assert from 'node:assert/strict';
import { GET as revenueGet, POST as revenuePost } from '../app/api/revenue-mesh/route.ts';
import {
  buildRevenueMeshPlan,
  evaluateRevenueOpportunity,
  productizedRevenueOffers,
  selectBestProductizedOffer
} from '../lib/revenue-mesh.ts';

function request(body, ip = '203.0.113.180') {
  return new Request('http://localhost/api/revenue-mesh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body)
  });
}

{
  const scored = evaluateRevenueOpportunity({
    source: 'WorkMarket',
    title: 'HPE CyrusOne memory replacement',
    buyer: 'Source Support Services',
    location: 'Phoenix, AZ',
    fixedPay: 200,
    estimatedHours: 2.1,
    scope: 'Data center smart-hands memory replacement with structured closeout',
    urgency: 'same_day'
  });

  assert.equal(scored.grade, 'A');
  assert.ok(scored.effectiveHourly >= 90);
  assert.equal(scored.counterMessage, undefined);
}

{
  const scored = evaluateRevenueOpportunity({
    source: 'Field Nation',
    title: 'Low-rate server hardware request',
    location: 'Chandler, AZ',
    fixedPay: 90,
    estimatedHours: 2,
    scope: 'PowerEdge hardware replacement with remote support bridge',
    urgency: 'next_day'
  });

  assert.notEqual(scored.grade, 'A');
  assert.ok(scored.riskFlags.includes('below $130 minimum dispatch value'));
  assert.ok(scored.counterMessage?.includes('$130'));
}

{
  const plan = buildRevenueMeshPlan([]);
  assert.equal(plan.status, 'revenue_system_failure');
  assert.ok(plan.taskReplacement);
  assert.equal(plan.approvalGate.required, true);
  assert.ok(plan.approvalGate.blockedActions.includes('moving money'));
}

{
  const plan = buildRevenueMeshPlan([
    {
      source: 'Direct prospect',
      title: 'HVAC missed-call capture system',
      buyer: 'Phoenix HVAC operator',
      lane: 'ai_automation_offer',
      location: 'Phoenix, AZ',
      scope: 'Missed calls, quote intake, after-hours visitor capture, owner alerts',
      expectedSetupFee: 997,
      expectedMonthlyRevenue: 197,
      recurringPotential: true,
      urgency: 'this_week'
    },
    {
      source: 'Local hauling lead',
      title: 'Appliance pickup with stairs',
      location: 'Glendale, AZ',
      fixedPay: 95,
      estimatedHours: 2,
      travelMiles: 26,
      scope: 'Appliance pickup and delivery with stairs',
      urgency: 'same_day'
    }
  ]);

  assert.equal(plan.status, 'ready_to_execute');
  assert.equal(plan.dailyStack[0].lane, 'ai_automation_offer');
  assert.ok(plan.dailyStack[0].outreachDraft?.includes('Already Here LLC'));
}

{
  const selected = selectBestProductizedOffer('The MSP needs cleaner field tech closeout notes and faster ticket billing.');
  assert.equal(selected.id, 'field-tech-closeout-assistant');
  for (const offer of productizedRevenueOffers) {
    assert.ok(offer.setupFee >= 497);
    assert.ok(offer.monthlyFee >= 99);
    assert.ok(!offer.delivery.toLowerCase().includes('tbd'));
  }
}

{
  const response = await revenueGet();
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.service, 'revenue-mesh');
  assert.equal(json.status, 'ready');
  assert.ok(json.productizedOffers.length >= 4);
}

{
  const response = await revenuePost(request({
    prospectText: 'junk removal company needs hauling quote intake',
    opportunities: [
      {
        source: 'Direct prospect',
        title: 'Junk removal quote intake',
        lane: 'ai_automation_offer',
        location: 'Mesa, AZ',
        scope: 'Need web quote form, missed lead capture, owner alert, and booking workflow.',
        expectedSetupFee: 997,
        expectedMonthlyRevenue: 197,
        recurringPotential: true,
        urgency: 'this_week'
      }
    ]
  }, '203.0.113.181'));

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.ok, true);
  assert.equal(json.plan.status, 'ready_to_execute');
  assert.equal(json.selectedOffer.id, 'local-hauling-quote-agent');
}

console.log('revenue mesh tests passed');
