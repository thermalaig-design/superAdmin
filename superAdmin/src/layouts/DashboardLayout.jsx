import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Sidebar from '../components/sidebar/Sidebar';
import { MenuIcon } from '../components/sidebar/icons';

function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fbf6f3] text-[#14213d]">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-72">
        <header className="flex h-16 items-center px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="cursor-pointer rounded-lg p-2 text-[#3a3f55] hover:bg-white"
          >
            <MenuIcon />
          </button>
        </header>

        <main className="p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
