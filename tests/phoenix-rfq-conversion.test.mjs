import assert from 'node:assert/strict';
import {
  attributedPhoenixLeadId,
  buildPhoenixRfqConversionEvent
} from '../lib/phoenix-rfq-conversion.ts';

const leadId = 'AH-CBL-d9c631d2-507b-4b04-99e5-f78753d8d794';
const message = [
  'RFQ / Project-based bid request',
  'Attributed Phoenix cabling guide lead: ' + leadId,
  'RFQ referral source: phoenix_cabling_checklist',
  'Project scope: Build out the office cabling.'
].join('\n');

assert.equal(attributedPhoenixLeadId('RFQ / project-based bid', message), leadId);
assert.equal(attributedPhoenixLeadId('Printer repair', message), null);
assert.equal(attributedPhoenixLeadId('RFQ / project-based bid', 'Other request'), null);
assert.equal(attributedPhoenixLeadId('RFQ / project-based bid',
  'Attributed Phoenix cabling guide lead: AH-CBL-not-valid'), null);

assert.deepEqual(buildPhoenixRfqConversionEvent({
  serviceType: 'RFQ / project-based bid',
  message,
  email: ' SALES@EXAMPLE.COM ',
  dispatchId: 'AH-TEST-DISPATCH'
}), {
  event: 'phoenix.cabling.converted',
  email: 'sales@example.com',
  payload: {
    lead_id: leadId,
    dispatch_id: 'AH-TEST-DISPATCH',
    stage: 'rfq_submitted'
  }
});
assert.equal(buildPhoenixRfqConversionEvent({
  serviceType: 'RFQ / project-based bid',
  message,
  email: 'bad address',
  dispatchId: 'AH-TEST-DISPATCH'
}), null);
console.log('Phoenix RFQ attribution and nurture-stop eligibility tests passed.');
