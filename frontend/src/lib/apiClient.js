import { getToken, logout } from '../features/auth/services/authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

export async function apiGet(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  ).toString();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
  } catch {
    throw new Error('Cannot reach the server. Please try again.');
  }

  if (response.status === 401) {
    logout();
    window.location.replace('/login');
    throw new Error('Session expired. Please log in again.');
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    throw new Error(body.message || 'Something went wrong');
  }

  return body.data;
}
