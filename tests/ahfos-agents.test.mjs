import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { dispatchAgent, intakeAgent, managementAgent, qaAgent } from '../lib/ahfos/agents.ts';

function baseJob(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    status: 'completed',
    priority: 'normal',
    trade: 'Network',
    skill: 'network',
    estimatedDurationMinutes: 120,
    customerId: randomUUID(),
    assetIds: [],
    intake: { requestSource: 'portal', problemDescription: 'Router down at branch site', preferredSchedule: '', urgency: 'same day' },
    dispatcherPacket: { summary: 'Router down', suggestedParts: [], suggestedCrew: [], riskFlags: [] },
    checklist: [],
    parts: [],
    labor: [],
    materials: [],
    recommendations: [],
    beforePhotos: [],
    afterPhotos: [],
    workNotes: '',
    warrantyDays: 30,
    invoice: { status: 'pending', totalCents: 0 },
    review: { status: 'pending' },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// intakeAgent infers trade, priority, and packet
{
  const result = await intakeAgent({
    name: 'Test Customer',
    company: '',
    email: 'customer@example.com',
    phone: '4805551234',
    address: { line1: '1 Main St', line2: '', city: 'Phoenix', state: 'AZ', zip: '85001', country: 'US' },
    problemDescription: 'WiFi access point offline, router needs replacement',
    urgency: 'same day',
    preferredSchedule: '',
    assetCategory: '',
    assetMake: '',
    assetModel: '',
    serialNumber: '',
    photos: [],
  });
  assert.equal(result.trade, 'Network');
  assert.equal(result.priority, 'high');
  assert.ok(result.dispatcherPacket.suggestedParts.length > 0);
}

// dispatchAgent picks best skill match with lowest load
{
  const job = baseJob({ status: 'intake' });
  const result = await dispatchAgent(job, {
    availableTechnicians: [
      { id: 'a', name: 'Alice', skills: ['network'], assignedJobCount: 5 },
      { id: 'b', name: 'Bob', skills: ['network'], assignedJobCount: 0 },
      { id: 'c', name: 'Cara', skills: ['pos'], assignedJobCount: 0 },
    ],
  });
  assert.equal(result.assignedTo, 'b');
}

// qaAgent scores 100 for fully documented job
{
  const photo = { id: randomUUID(), kind: 'before', url: 'https://example.com/p.jpg', caption: '', uploadedAt: new Date().toISOString(), uploadedBy: randomUUID() };
  const job = baseJob({
    beforePhotos: [photo],
    afterPhotos: [{ ...photo, kind: 'after' }],
    signature: { name: 'Customer', signedAt: new Date().toISOString() },
    workNotes: 'Replaced router and validated connectivity end to end.',
    labor: [{ id: randomUUID(), description: 'Onsite labor', hours: 2, rateCents: 12500 }],
    recommendations: ['Schedule annual maintenance'],
    checklist: [{ id: randomUUID(), text: 'Before photos', checked: true }],
  });
  const result = qaAgent(job);
  assert.equal(result.score, 100);
  assert.equal(result.missingItems.length, 0);
}

// qaAgent flags missing documentation
{
  const result = qaAgent(baseJob());
  assert.ok(result.score < 50);
  assert.ok(result.missingItems.includes('Before photos'));
  assert.ok(result.missingItems.includes('Customer signature'));
  assert.ok(result.missingItems.includes('Safety/work checklist'));
}

// managementAgent aggregates counts, revenue, and technician ranking
{
  const techId = randomUUID();
  const jobs = [
    baseJob({ status: 'completed', assignedTo: techId, invoice: { status: 'sent', totalCents: 25000 }, qa: { score: 90, missingItems: [], scoredAt: new Date().toISOString() } }),
    baseJob({ status: 'in_progress', assignedTo: techId }),
    baseJob({ status: 'intake' }),
  ];
  const report = managementAgent(jobs, [{ id: techId, name: 'Alice' }]);
  assert.equal(report.jobCounts.completed, 1);
  assert.equal(report.openJobs, 2);
  assert.equal(report.revenueCents, 25000);
  assert.equal(report.averageQaScore, 90);
  assert.equal(report.technicianRanking[0].technicianId, techId);
  assert.equal(report.technicianRanking[0].completedJobs, 1);
  assert.equal(report.technicianRanking[0].averageQaScore, 90);
}

console.log('ahfos-agents.test.mjs passed');
