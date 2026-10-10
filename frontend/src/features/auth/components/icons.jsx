const base = {
  className: 'h-5 w-5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

export const LockIcon = () => (
  <svg {...base}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" />
  </svg>
);

export const EyeIcon = ({ off }) => (
  <svg {...base}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="m4 4 16 16" />}
  </svg>
);

export const ShieldIcon = () => (
  <svg {...base} className="h-[18px] w-[18px]">
    <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const ArrowIcon = () => (
  <svg {...base}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </svg>
);

export const ChevronIcon = () => (
  <svg {...base} className="h-3 w-3" strokeWidth={1.6}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function IndiaFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-[2px]" aria-hidden="true">
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="6.67" fill="#f59a2f" />
      <rect y="13.33" width="30" height="6.67" fill="#1f8a3b" />
      <circle cx="15" cy="10" r="2.4" fill="none" stroke="#2b3a8c" strokeWidth="0.8" />
    </svg>
  );
}
