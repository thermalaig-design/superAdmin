import { Link, useLocation, useNavigate } from 'react-router-dom';

import { logout } from '../../features/auth/services/authService';
import { useTargetsView } from '../../features/targets/hooks/useTargetsView';
import Logo from '../Logo';
import { DashboardIcon, InsightsIcon, LogoutIcon, MarketingIcon, MembersIcon, PageDirectoryIcon, SidebarToggleIcon, TargetIcon } from './icons';

const NAV_ITEMS = [
  { to: '/', also: ['/campaign-leads'], label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/organization-insights', also: ['/trust-insights'], label: 'Organization Insights', icon: InsightsIcon },
  { to: '/member-insights', label: 'Member Insights', icon: MembersIcon },
  { to: '/marketing', label: 'Marketing', icon: MarketingIcon },
  { to: '/app-templates', label: 'App Template', icon: DashboardIcon },
  { to: '/page-directory', label: 'Page Directory', icon: PageDirectoryIcon },
  { to: '/targets', label: 'Targets', icon: TargetIcon }, // also highlighted on /targets/set-target
];

/**
 * Which menu item a page belongs to. A page can say so itself (a link passes state={{ section: '/organization-insights' }}),
 * e.g. a member's page opened from Organization Insights stays under Organization Insights; otherwise the address decides.
 */
const isActiveItem = ({ to, end, also = [] }, pathname, section) => {
  if (section) return section === to;
  if (end) return pathname === to || also.some((base) => pathname === base);
  return [to, ...also].some((base) => pathname === base || pathname.startsWith(`${base}/`));
};

const linkClass = (collapsed, isActive) =>
  `flex items-center gap-3 rounded-full px-5 py-3 text-[0.95rem] font-medium transition duration-200 ${isActive ? '' : 'hover:translate-x-1'} ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
    isActive
      ? 'bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) text-white shadow-[0_8px_18px_color-mix(in_srgb,var(--c-accent)_35%,transparent)]'
      : 'text-(--c-text-2) hover:bg-(--c-accent-soft)'
  }`;

/** `collapsed` only applies on large screens (an icon strip); the phone drawer is always the full menu. */
function Sidebar({ open, onClose, collapsed = false, onToggle }) {
  const navigate = useNavigate();
  const { pathname, state } = useLocation();
  const [, setTargetsView] = useTargetsView();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-white px-5 py-8 shadow-[0_20px_60px_rgba(80,40,60,0.12)] transition-[transform,width] duration-200 lg:translate-x-0 ${collapsed ? 'lg:w-20 lg:px-3' : ''} ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`flex items-center gap-3 px-2 ${collapsed ? 'lg:flex-col lg:px-0' : ''}`}>
          <Logo className={collapsed ? 'h-14 w-14 lg:h-11 lg:w-11' : 'h-14 w-14'} />
          <div className={collapsed ? 'lg:hidden' : ''}>
            <p className="text-sm font-semibold leading-tight">SETU AI</p>
            <p className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.35em] text-(--c-text-2)">
              Investors
            </p>
          </div>
          {/* Collapses / expands the sidebar (large screens; on phones the top bar opens the drawer) */}
          <button
            type="button"
            onClick={onToggle}
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-pressed={collapsed}
            className={`hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-(--c-text-2) hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent) lg:flex ${collapsed ? '' : 'ml-auto'}`}
          >
            <SidebarToggleIcon />
          </button>
        </div>
        <div className={`mx-2 mt-4 h-0.5 w-11 bg-(--c-accent) ${collapsed ? 'lg:mx-auto lg:w-8' : ''}`} />

        <nav className="mt-10 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const { to, label, icon: Icon } = item;
            const active = isActiveItem(item, pathname, state?.section);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={linkClass(collapsed, active)}
                onClick={() => {
                  if (to === '/targets') setTargetsView({ platform: null, status: null }); // Targets opens on all platforms, not the last one picked
                  onClose();
                }}
                title={collapsed ? label : undefined}
              >
                <Icon />
                <span className={collapsed ? 'lg:sr-only' : ''}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Log out' : undefined}
          className={`mt-2 flex shrink-0 cursor-pointer items-center gap-3 rounded-full px-5 py-3 text-[0.95rem] font-medium text-(--c-text-2) transition hover:bg-(--c-accent-soft) ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
        >
          <LogoutIcon />
          <span className={collapsed ? 'lg:sr-only' : ''}>Log out</span>
        </button>
      </aside>
    </>
  );
}

export default Sidebar;
