import { useState, useCallback } from 'react';
import { login as apiLogin } from '../api';

export function useAuth() {
  const [user,    setUser]    = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [token,   setToken]   = useState(() => localStorage.getItem('token') || null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = useCallback(async (username, password) => {
    setLoading(true); setError('');
    try {
      const data = await apiLogin(username, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user.role;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const doLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null); setUser(null);
  }, []);

  return {
    user, token, error, loading, doLogin, doLogout,
    isAuthenticated: !!token,
    role: user?.role || 'viewer',
  };
}
