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
      <path
        d="M16 87C31 95 62 94 92 80C110 72 121 62 118 55C116 50 106 49 94 53"
        fill="none"
        stroke="#071B34"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M19 94C39 101 76 95 108 77C116 72 122 67 126 61"
        fill="none"
        stroke="#071B34"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M64 8C39 8 23 26 23 49C23 80 64 120 64 120C64 120 105 80 105 49C105 26 89 8 64 8Z"
        fill="#071B34"
      />
      <path
        d="M64 8C89 8 105 26 105 49C105 80 64 120 64 120V8Z"
        fill="#0B4D89"
      />
      <path
        d="M66 58L42 88C49 101 64 120 64 120C64 120 105 80 105 49C105 39 102 30 97 23L66 58Z"
        fill="#0A63A8"
        opacity="0.9"
      />
      <circle cx="64" cy="48" r="22" fill="#F8FAFC" />
      <circle cx="64" cy="48" r="14" fill="#FFFFFF" />
      <path
        d="M15 85C34 94 68 89 99 72C114 64 123 55 121 50"
        fill="none"
        stroke="#F8FAFC"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M14 88C31 99 71 95 109 75"
        fill="none"
        stroke="#071B34"
        strokeWidth="5"
        strokeLinecap="round"
      />
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
      <BrandIcon className="h-12 w-12 shrink-0" />
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
