export interface SmsPayload {
  to: string;
  body: string;
  referenceId?: string;
}

export function formatSmsPayload(payload: SmsPayload) {
  return {
    to: payload.to.replace(/\D/g, '').slice(-10),
    body: payload.body.slice(0, 320),
    referenceId: payload.referenceId
  };
}

export const smsTemplates = {
  waitlistOpen: (name: string) => `Hi ${name}, a scooter is now available. Reply to confirm or visit alreadyherellc.com/scooter-rentals to book.`,
  bookingConfirmed: (reference: string) => `Your Already Here rental is confirmed. Reference: ${reference}. Reply for pickup details.`,
  matchFound: (name: string, category: string) => `Hi ${name}, we found a ${category} match for you. Check your email or reply to schedule a call.`,
  reminder: (name: string, event: string) => `Hi ${name}, reminder: ${event}. Reply or call dispatch for help.`
} as const;
