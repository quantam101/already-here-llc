type BrandMarkProps = {
  variant?: 'horizontal' | 'icon';
  className?: string;
  tagline?: string;
  textColorClassName?: string;
};

export function BrandIcon({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      role="img"
      aria-label="Already Here LLC location and routing mark"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="96" height="96" rx="24" fill="#071B34" />
      <ellipse
        cx="48"
        cy="47"
        rx="35"
        ry="13"
        transform="rotate(-28 48 47)"
        fill="none"
        stroke="#1B66FF"
        strokeWidth="6"
      />
      <path
        d="M48 16C35.2 16 24.8 26.4 24.8 39.2C24.8 57.6 48 82 48 82C48 82 71.2 57.6 71.2 39.2C71.2 26.4 60.8 16 48 16Z"
        fill="#FFFFFF"
      />
      <path
        d="M48 23.5C39.3 23.5 32.2 30.5 32.2 39.2C32.2 50.4 43.9 65.2 48 70.1C52.1 65.2 63.8 50.4 63.8 39.2C63.8 30.5 56.7 23.5 48 23.5Z"
        fill="#071B34"
      />
      <circle cx="48" cy="39" r="8.5" fill="#1B66FF" />
      <circle cx="75" cy="33" r="4.5" fill="#1B66FF" />
      <circle cx="21" cy="61" r="4.5" fill="#7E8A9A" />
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
    return <BrandIcon className={className || 'h-11 w-11'} />;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <BrandIcon className="h-11 w-11 shrink-0" />
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
