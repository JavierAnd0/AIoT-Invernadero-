import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';
import { login as apiLogin } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [token,   setToken]   = useState(() => localStorage.getItem('token') || null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const setSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const doLogin = useCallback(async (username, password) => {
    setLoading(true); setError('');
    try {
      const data = await apiLogin(username, password);
      setSession(data.token, data.user);
      return data.user.role;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [setSession]);

  const doLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null); setUser(null);
  }, []);

  const value = useMemo(() => ({
    user, token, error, loading, doLogin, doLogout, setSession,
    isAuthenticated: !!token,
    role: user?.role || 'viewer',
  }), [user, token, error, loading, doLogin, doLogout, setSession]);

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
