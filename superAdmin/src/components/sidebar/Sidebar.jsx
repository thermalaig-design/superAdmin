import { NavLink, useNavigate } from 'react-router-dom';

import BrandMark from '../../features/auth/components/BrandMark';
import { logout } from '../../features/auth/services/authService';
import { DashboardIcon, InsightsIcon, LogoutIcon } from './icons';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/trust-insights', label: 'Trust Insights', icon: InsightsIcon },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-full px-5 py-3 text-[0.95rem] font-medium transition ${
    isActive
      ? 'bg-gradient-to-r from-[#ee7b3e] via-[#b04a4f] to-[#5b2650] text-white shadow-[0_8px_18px_rgba(120,40,70,0.3)]'
      : 'text-[#3a3f55] hover:bg-[#fde6d6]'
  }`;

function Sidebar({ open, onClose }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

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
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-white px-5 py-8 shadow-[0_20px_60px_rgba(80,40,60,0.12)] transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-2">
          <BrandMark className="h-11 w-10 text-[#c98a4b]" />
          <div>
            <p className="text-sm font-semibold leading-tight">TEI</p>
            <p className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.35em] text-[#3a3f55]">
              Super Admin
            </p>
          </div>
        </div>
        <div className="mx-2 mt-4 h-0.5 w-11 bg-[#e8793f]" />

        <nav className="mt-10 flex flex-col gap-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} onClick={onClose}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex cursor-pointer items-center gap-3 rounded-full px-5 py-3 text-[0.95rem] font-medium text-[#3a3f55] transition hover:bg-[#fde6d6]"
        >
          <LogoutIcon />
          Log out
        </button>
      </aside>
    </>
  );
}

export default Sidebar;
