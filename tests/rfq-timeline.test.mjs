import assert from 'node:assert/strict';
import { formatRFQTimeline, validateRFQTimeline } from '../lib/rfq-timeline.ts';

const selection = {
  mode: 'exact', startDate: '2026-10-30', startTime: '13:45',
  endDate: '', endTime: ''
};
assert.equal(validateRFQTimeline(selection), null);
assert.equal(formatRFQTimeline(selection),
  'Target project start: Oct 30, 2026 at 1:45 PM (project/site local time)');

assert.match(validateRFQTimeline({ ...selection, startDate: '' }), /Choose a valid date/);
assert.match(validateRFQTimeline({ ...selection, startTime: '' }), /start time/);
assert.match(validateRFQTimeline({ ...selection, startDate: '2026-02-29' }), /valid date/);
assert.equal(validateRFQTimeline({ ...selection, startDate: '2028-02-29' }), null);
assert.match(validateRFQTimeline({ ...selection, startDate: '2026-13-01' }), /valid date/);
assert.match(validateRFQTimeline({ ...selection, startTime: '26:99' }), /start time/);
assert.equal(formatRFQTimeline({ ...selection, startDate: '' }), '');

const deadline = { ...selection, mode: 'deadline', startDate: '2026-11-03', startTime: '09:00' };
assert.equal(formatRFQTimeline(deadline),
  'Bid deadline: Nov 3, 2026 at 9:00 AM (project/site local time)');

const range = {
  mode: 'window', startDate: '2026-11-02', endDate: '2026-11-06',
  startTime: '', endTime: ''
};
assert.equal(validateRFQTimeline(range), null);
assert.equal(formatRFQTimeline(range),
  'Project rollout window: Nov 2, 2026 through Nov 6, 2026 (all-day dates)');
assert.match(validateRFQTimeline({ ...range, endDate: '2026-10-31' }), /end on or after/);
assert.match(validateRFQTimeline({ ...range, endDate: '' }), /end date/);
assert.match(validateRFQTimeline({ ...range, startTime: '09:00' }), /both start and end times/);
assert.equal(validateRFQTimeline({ ...range, startTime: '09:00', endTime: '17:00' }), null);
assert.match(formatRFQTimeline({ ...range, startTime: '09:00', endTime: '17:00' }),
  /Nov 2, 2026 at 9:00 AM through Nov 6, 2026 at 5:00 PM/);
assert.match(validateRFQTimeline({ ...range, endDate: '2026-11-02',
  startTime: '17:00', endTime: '09:00' }), /after the start time/);
assert.equal(validateRFQTimeline({ ...range, endDate: '2026-11-02',
  startTime: '09:00', endTime: '17:00' }), null);
assert.match(validateRFQTimeline({ ...range, mode: 'unspecified' }), /Select a timeline type/);
console.log('RFQ date/time calendar and rollout-window contract tests passed.');
