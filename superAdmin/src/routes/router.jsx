import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

const LoginPage = lazy(() =>
  import('../features/auth/pages/LoginPage')
);

const DashboardPage = lazy(() =>
  import('../features/dashboard/pages/DashboardPage')
);

const TrustInsightsPage = lazy(() =>
  import('../features/trust-insights/pages/TrustInsightsPage')
);

const TrustActivityPage = lazy(() =>
  import('../features/trust-insights/pages/TrustActivityPage')
);

const TrustMemberLoginsPage = lazy(() =>
  import('../features/trust-insights/pages/TrustMemberLoginsPage')
);

const lazyPage = (Component) => (
  <Suspense fallback={<div>Loading...</div>}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: lazyPage(LoginPage),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: '/',
            element: lazyPage(DashboardPage),
          },
          {
            path: '/trust-insights',
            element: lazyPage(TrustInsightsPage),
          },
          {
            path: '/trust-insights/:trustId',
            element: lazyPage(TrustActivityPage),
          },
          {
            path: '/trust-insights/:trustId/members',
            element: lazyPage(TrustMemberLoginsPage),
          },
        ],
      },
    ],
  },
]);
