import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Sidebar from '../components/sidebar/Sidebar';
import TopBar from './TopBar';

// The header is 4rem tall (h-16 in TopBar); pages that fit the screen account for it in their height maths.
function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fbf6f3] text-[#14213d]">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-72 ">
        <TopBar onOpenMenu={() => setMobileOpen(true)} />

        <main className="p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
