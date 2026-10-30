import { useLocation } from 'react-router-dom';

import { SidebarToggleIcon } from '../components/sidebar/icons';
import { useTheme } from '../hooks/useTheme';
import TargetsNav from '../features/targets/components/TargetsNav';
import BackLink from '../components/BackLink';
import ReportsNav from './ReportsNav';


const roundButton =
  'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-400/70 bg-white text-(--c-text-3) transition hover:border-gray-500 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)';

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M12 3.2a1.4 1.4 0 0 1 1.4 1.4v.5A6 6 0 0 1 18 11v3.4l1.6 2.4a.8.8 0 0 1-.7 1.2H5.1a.8.8 0 0 1-.7-1.2L6 14.4V11a6 6 0 0 1 4.6-5.9v-.5A1.4 1.4 0 0 1 12 3.2Z"
      fill="#f6b800"
      stroke="var(--c-text-2)"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M9.8 19.2a2.3 2.3 0 0 0 4.4 0" fill="none" stroke="var(--c-text-2)" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const AvatarIcon = () => (
  <svg viewBox="0 0 36 36" className="h-full w-full" aria-hidden="true">
    <rect width="36" height="36" fill="var(--c-track)" />
    <circle cx="18" cy="14" r="6.2" fill="var(--c-faint)" />
    <path d="M5.5 36c.8-7.2 6-11 12.5-11s11.7 3.8 12.5 11Z" fill="var(--c-faint)" />
  </svg>
);

/**
 * Header across the top of the content area. The first round button switches between light and dark; the notification
 * button is still a placeholder.
 */
function TopBar({ onOpenMenu }) {
  const [theme, toggleTheme] = useTheme();
  // The report shortcuts belong to the dashboard only; other pages show nothing here
  const { pathname } = useLocation();
  const onDashboard = pathname === '/';
  const onTargets = pathname.startsWith('/targets');
  const onSetTarget = pathname.startsWith('/targets/set-target');
  const onLeadList = pathname === '/campaign-leads' || pathname === '/otp-not-login' || pathname === '/new-apps' || pathname.startsWith('/registrations'); // these pages put their Back link, search and period here (see CampaignLeadsPage, RegistrationsPage)
  return (
    <header className="sticky border-2 top-0 z-20 flex h-16 items-center justify-between  border-gray-100 bg-white px-3 sm:px-6 lg:px-10 mx-1">
      <div className={`flex min-w-0 flex-1 items-center gap-2 pr-2 sm:gap-3 sm:pr-8 ${onDashboard ? '' : 'overflow-hidden'} ${onTargets ? "xl:justify-center" : ""}`}>
        {/* Phones only: opens the drawer. On large screens the sidebar has its own collapse button. */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          title="Open menu"
          className="-ml-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-(--c-text-2) hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent) lg:hidden"
        >
          <SidebarToggleIcon />
        </button>
        {onLeadList && <div id="topbar-slot" className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6 lg:gap-8" />}
        {onTargets && (
          <div className="flex min-w-0 items-center gap-3 xl:gap-5">
            {/* the settings pages have no other way back, so the button lives here */}
            {onSetTarget && (
              <div className="shrink-0">
                <BackLink to="/targets" label="Back to Targets and Scorecard" button buttonText="Back" compact />
              </div>
            )}
            {onSetTarget && <span className="hidden h-6 w-px bg-gray-200 xl:block" aria-hidden="true" />}
            <div className="hidden xl:block">
              <TargetsNav variant="wide" />
            </div>
          </div>
        )}
        {onDashboard && (
          <div className="hidden xl:ml-24 xl:block">
            <ReportsNav />
          </div>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {onDashboard && (
          <div className="xl:hidden">
            <ReportsNav />
          </div>
        )}
        {onTargets && (
          <>
            <div className="xl:hidden">
              <TargetsNav variant="compact" />
            </div>
          </>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className={roundButton}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <button type="button" className={`${roundButton} max-[379px]:hidden`} aria-label="Notifications" title="Notifications">
          <BellIcon />
        </button>
        <button
          type="button"
          aria-label="Account"
          title="Account"
          className="h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full ring-2 ring-(--c-accent) ring-offset-2 ring-offset-white transition hover:ring-(--c-link) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--c-accent)"
        >
          <AvatarIcon />
        </button>
      </div>
    </header>
  );
}

export default TopBar;
