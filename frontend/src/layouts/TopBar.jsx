import { MenuIcon } from '../components/sidebar/icons';

const roundButton =
  'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-400/70 bg-white text-[#4b5163] transition hover:border-gray-500 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8793f]';

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M12 3.2a1.4 1.4 0 0 1 1.4 1.4v.5A6 6 0 0 1 18 11v3.4l1.6 2.4a.8.8 0 0 1-.7 1.2H5.1a.8.8 0 0 1-.7-1.2L6 14.4V11a6 6 0 0 1 4.6-5.9v-.5A1.4 1.4 0 0 1 12 3.2Z"
      fill="#f6b800"
      stroke="#2b2b2b"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M9.8 19.2a2.3 2.3 0 0 0 4.4 0" fill="none" stroke="#2b2b2b" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const AvatarIcon = () => (
  <svg viewBox="0 0 36 36" className="h-full w-full" aria-hidden="true">
    <rect width="36" height="36" fill="#dfe3ea" />
    <circle cx="18" cy="14" r="6.2" fill="#a9afba" />
    <path d="M5.5 36c.8-7.2 6-11 12.5-11s11.7 3.8 12.5 11Z" fill="#a9afba" />
  </svg>
);

/**
 * Header across the top of the content area. The theme and notification buttons are placeholders for now
 * (no dark mode or notifications behind them yet).
 */
function TopBar({ onOpenMenu }) {
  return (
    <header className="sticky border-2 top-0 z-20 flex h-16 items-center justify-between  border-gray-100 bg-white px-4 sm:px-6 lg:px-10 mx-1">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="-ml-2 cursor-pointer rounded-lg p-2 text-[#3a3f55] hover:bg-gray-100 lg:hidden"
      >
        <MenuIcon />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <button type="button" className={roundButton} aria-label="Switch theme" title="Dark mode is coming soon">
          <MoonIcon />
        </button>
        <button type="button" className={roundButton} aria-label="Notifications" title="Notifications">
          <BellIcon />
        </button>
        <button
          type="button"
          aria-label="Account"
          title="Account"
          className="h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-[#4a8fd8] ring-offset-2 ring-offset-white transition hover:ring-[#2f78c4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8793f]"
        >
          <AvatarIcon />
        </button>
      </div>
    </header>
  );
}

export default TopBar;
