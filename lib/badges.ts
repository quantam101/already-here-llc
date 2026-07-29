export const verificationBadges = [
  { id: 'identity', label: 'Identity verified', description: 'Government ID on file' },
  { id: 'license', label: 'License verified', description: 'Driver or operator license verified' },
  { id: 'insurance', label: 'Insurance verified', description: 'Insurance or coverage verified' },
  { id: 'inspection', label: 'Inspection passed', description: 'Recent condition inspection completed' },
  { id: 'background', label: 'Background checked', description: 'Background check completed' },
  { id: 'payment', label: 'Payment ready', description: 'Payment method on file' },
  { id: 'veteran', label: 'Top-rated', description: 'Consistently positive reviews' }
] as const;

export type VerificationBadge = (typeof verificationBadges)[number]['id'];

export function formatBadges(badgeIds: VerificationBadge[]) {
  return badgeIds.map((id) => verificationBadges.find((b) => b.id === id)).filter(Boolean);
}
