import { Navigate, Outlet } from 'react-router-dom';

import { getToken } from '../features/auth/services/authService';

function ProtectedRoute() {
  return getToken() ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
