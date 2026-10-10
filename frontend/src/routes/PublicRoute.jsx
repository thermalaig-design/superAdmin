import { Navigate, Outlet } from 'react-router-dom';

import { getToken } from '../features/auth/services/authService';

function PublicRoute() {
  return getToken() ? <Navigate to="/" replace /> : <Outlet />;
}

export default PublicRoute;
