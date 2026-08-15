import assert from 'assert';
import {
  buildTechnicianRecords,
  matchTechnicians,
  parseAvailability,
  parseCertifications,
  extractSkills,
  computeDispatchReadinessScore
} from '../lib/technician.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

const sampleInput = {
  fullName: 'Jane Technician',
  email: 'jane.technician@example.invalid',
  phone: '(602) 555-0100',
  city: 'Phoenix',
  state: 'AZ',
  zipCode: '85001',
  workerPath: '1099_contractor',
  workLanes: ['Network / AP / router / switch support', 'Hauling / trailer support'],
  skills: 'I install network access points, run low-voltage cabling, haul trailers, and perform smart hands work. Same-day and weekend available.',
  certifications: 'CompTIA A+, BICSI Installer',
  tools: 'Cable tester, tone probe, ladder, drill, hand tools',
  availability: 'Same-day, weekends, overnight, and travel available.',
  travelRadiusMiles: 75,
  transportation: 'Reliable pickup truck with insured trailer.',
  yearsExperience: 6,
  hourlyRate: '$85/hr',
  source: 'test'
};

const skillResult = extractSkills(sampleInput.skills, sampleInput.workLanes);
assert.ok(skillResult.skills.length >= 2, 'expected skill taxonomy matches');
assert.ok(skillResult.technicianSkills.some((s) => s.proficiency === 'primary'), 'primary skill from work lanes');

const certs = parseCertifications(sampleInput.certifications);
assert.equal(certs.length, 2, 'parsed two certifications');
assert.equal(certs[0].verification_status, 'unverified');

const availability = parseAvailability(sampleInput.availability);
assert.equal(availability.same_day_available, true);
assert.equal(availability.weekend_available, true);
assert.equal(availability.overnight_available, true);
assert.equal(availability.travel_available, true);

const score = computeDispatchReadinessScore({
  travel_radius_miles: 75,
  years_experience: 6,
  work_lanes: sampleInput.workLanes,
  skills_text: sampleInput.skills,
  certifications_text: sampleInput.certifications,
  tools_text: sampleInput.tools,
  availability_text: sampleInput.availability
});
assert.ok(score >= 70, `dispatch readiness score ${score} should be high`);

const writes = buildTechnicianRecords(sampleInput);
assert.ok(writes.some((w) => w.table === 'organizations'), 'organization write');
assert.ok(writes.some((w) => w.table === 'contacts'), 'contact write');
assert.ok(writes.some((w) => w.table === 'technicians'), 'technician write');
assert.ok(writes.some((w) => w.table === 'skills'), 'skill write');
assert.ok(writes.some((w) => w.table === 'technician_skills'), 'technician-skill write');
assert.ok(writes.some((w) => w.table === 'certifications'), 'certification write');
assert.ok(writes.some((w) => w.table === 'availability'), 'availability write');

resetCanonicalStore();
const store = getCanonicalStore();
const writeResult = await store.executeWrites(writes);
assert.equal(writeResult.ok, true, 'canonical writes succeeded');
assert.ok(writeResult.insertedIds.length >= 7, 'inserted at least 7 records');

const techRecord = await store.getRecord('technicians', writes.find((w) => w.table === 'technicians').id);
assert.ok(techRecord, 'technician record retrieved');
assert.equal(techRecord.full_name, 'Jane Technician');
assert.equal(techRecord.state, 'AZ');

const matches = matchTechnicians([techRecord], {
  state: 'AZ',
  skillKeywords: ['network', 'access point', 'cabling'],
  maxRateCents: 9500,
  sameDay: true,
  weekend: true,
  requireReliableTransport: true
});
assert.equal(matches.length, 1);
assert.equal(matches[0].hardFiltersPass, true);
assert.ok(matches[0].fitScore >= 70, `fit score ${matches[0].fitScore} should be high`);
assert.ok(matches[0].explanation.some((e) => e.includes('matched skills') || e.includes('same-day')), 'explanation mentions match reason');

const noMatch = matchTechnicians([techRecord], {
  state: 'NY',
  skillKeywords: ['heavy machinery']
});
assert.ok(noMatch[0].fitScore < matches[0].fitScore, 'NY and unrelated skill scores lower');

console.log('technician tests passed');
