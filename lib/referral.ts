export const REFERRAL_REWARD = 25;

export function isValidReferralCode(code: string): boolean {
  return /^AH-[A-Z0-9]{6}$/.test(code.trim());
}

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'AH-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function buildReferralLink(code: string, baseUrl = 'https://www.alreadyherellc.com/scooter-rentals'): string {
  const url = new URL(baseUrl);
  url.searchParams.set('ref', code);
  return url.toString();
}
