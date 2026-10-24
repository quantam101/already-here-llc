/**
 * Extracts a first-party Phoenix cabling lead reference from a submitted RFQ.
 * This is attribution / nurture suppression, NOT evidence of a signed quote or
 * payment. The event is associated with the submitter's own email only.
 */
export function attributedPhoenixLeadId(serviceType: string, message: string): string | null {
  if (serviceType !== 'RFQ / project-based bid') return null;
  const match = /^Attributed Phoenix cabling guide lead:\s*(AH-CBL-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/im.exec(message);
  return match ? match[1].toLowerCase() : null;
}

export function buildPhoenixRfqConversionEvent(input: {
  serviceType: string;
  message: string;
  email: string;
  dispatchId: string;
}): { event: string; email: string; payload: Record<string, string> } | null {
  const leadId = attributedPhoenixLeadId(input.serviceType, input.message);
  const email = input.email.trim().toLowerCase();
  if (!leadId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return {
    event: 'phoenix.cabling.converted',
    email,
    payload: {
      lead_id: leadId,
      dispatch_id: input.dispatchId,
      stage: 'rfq_submitted'
    }
  };
}
