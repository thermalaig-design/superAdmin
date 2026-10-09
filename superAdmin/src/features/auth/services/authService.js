const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5005/api/auth';

export const TOKEN_KEY = 'token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const logout = () => localStorage.removeItem(TOKEN_KEY);

export async function login(phoneNo, secretCode) {
  let response;
  try {
    response = await fetch(`${AUTH_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNo, secretCode }),
    });
  } catch {
    throw new Error('Cannot reach the server. Please try again.');
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body.success) {
    throw new Error(body.message || 'Login failed');
  }

  localStorage.setItem(TOKEN_KEY, body.data.token);
  return body.data;
}
