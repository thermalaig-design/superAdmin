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

const MemberInsightsPage = lazy(() =>
  import('../features/member-insights/pages/MemberInsightsPage')
);

const MemberTrustsPage = lazy(() =>
  import('../features/member-insights/pages/MemberTrustsPage')
);

const MemberActivityPage = lazy(() =>
  import('../features/member-insights/pages/MemberActivityPage')
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
            path: '/organization-insights',
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
          {
            path: '/member-insights',
            element: lazyPage(MemberInsightsPage),
          },
          {
            path: '/member-insights/:memberId/activity',
            element: lazyPage(MemberActivityPage),
          },
          {
            path: '/member-insights/:memberId/trusts',
            element: lazyPage(MemberTrustsPage),
          },
        ],
      },
    ],
  },
]);
