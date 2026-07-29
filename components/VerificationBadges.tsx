import { formatBadges, VerificationBadge } from '@/lib/badges';

export function VerificationBadges({ badges }: { badges: VerificationBadge[] }) {
  const formatted = formatBadges(badges);
  if (formatted.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {formatted.map((badge) => (
        <span key={badge!.id} title={badge!.description} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {badge!.label}
        </span>
      ))}
    </div>
  );
}
