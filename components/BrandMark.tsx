type BrandMarkProps = {
  variant?: 'horizontal' | 'icon';
  className?: string;
  tagline?: string;
  textColorClassName?: string;
};

export function BrandIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 128 128"
      role="img"
      aria-label="Already Here LLC location pin orbit logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M64 9C42 9 25 26 25 48c0 29 39 71 39 71s39-42 39-71C103 26 86 9 64 9Z" fill="#071B34" />
      <path d="M64 9c22 0 39 17 39 39 0 29-39 71-39 71V9Z" fill="#0B4D89" />
      <path d="M65 57 43 86c8 15 21 33 21 33s39-42 39-71c0-9-3-18-8-25L65 57Z" fill="#0A63A8" />
      <circle cx="64" cy="47" r="21" fill="#F8FAFC" />
      <circle cx="64" cy="47" r="15" fill="#FFFFFF" />
      <path d="M15 83c19 11 57 9 90-10 15-9 24-19 22-26" fill="none" stroke="#071B34" strokeWidth="8" strokeLinecap="round" />
      <path d="M14 82c21 11 61 7 94-12 12-7 19-14 20-20" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <path d="M16 89c23 10 68 4 105-20" fill="none" stroke="#071B34" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function BrandMark({
  variant = 'horizontal',
  className = '',
  tagline = 'ONSITE INFRASTRUCTURE EXECUTION',
  textColorClassName = 'text-navy'
}: BrandMarkProps) {
  if (variant === 'icon') {
    return <BrandIcon className={className || 'h-12 w-12'} />;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <BrandIcon className="h-16 w-16 shrink-0" />
      <div className="min-w-0 leading-none">
        <div className={`text-[15px] font-semibold uppercase tracking-[0.18em] ${textColorClassName}`.trim()}>
          ALREADY HERE LLC
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-steel">
          {tagline}
        </div>
      </div>
    </div>
  );
}
