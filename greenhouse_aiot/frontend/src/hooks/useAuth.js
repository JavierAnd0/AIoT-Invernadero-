import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, selectTenant as apiSelectTenant, getMe } from '../api';

const AuthContext = createContext(null);

// ── storage helpers ────────────────────────────────────────────────────────────

function safeJson(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    // reject the literal string "undefined" that old code may have stored
    return parsed !== undefined ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadFromStorage() {
  return {
    user:            safeJson(localStorage.getItem('user'),    null),
    token:           localStorage.getItem('token')             || null,
    tenants:         safeJson(localStorage.getItem('tenants'), []),
    currentTenantId: localStorage.getItem('tenantId') ? Number(localStorage.getItem('tenantId')) : 1,
    currentRole:     localStorage.getItem('role')              || 'viewer',
  };
}

function saveSession({ token, user, tenants, tenantId, role }) {
  localStorage.setItem('token',    token);
  localStorage.setItem('user',     JSON.stringify(user));
  localStorage.setItem('tenants',  JSON.stringify(tenants || []));
  localStorage.setItem('tenantId', tenantId ?? '');
  localStorage.setItem('role',     role     ?? '');
}

function clearSession() {
  ['token', 'user', 'tenants', 'tenantId', 'role'].forEach(k =>
    localStorage.removeItem(k)
  );
}

// ── provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const initial                       = loadFromStorage();
  const [user,            setUser]            = useState(initial.user);
  const [token,           setToken]           = useState(initial.token);
  const [tenants,         setTenants]         = useState(initial.tenants);
  const [currentTenantId, setCurrentTenantId] = useState(initial.currentTenantId);
  const [currentRole,     setCurrentRole]     = useState(initial.currentRole);
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);
  // true when the user belongs to multiple tenants and hasn't selected one yet
  const [requiresTenantSelection, setRequiresTenantSelection] = useState(false);

  /**
   * Persist a complete session in state + localStorage.
   * tenantId may be null when the user has multiple tenants and must select.
   */
  const setSession = useCallback(({ token, user, role }) => {
    saveSession({ token, user, tenants: [], tenantId: 1, role });
    setToken(token);
    setUser(user);
    setTenants([]);
    setCurrentTenantId(1);
    setCurrentRole(role ?? 'viewer');
    setRequiresTenantSelection(false);
  }, []);

  /**
   * Authenticate with username + password.
   * Returns:
   *   { ok: true, requiresTenantSelection: bool }  on success
   *   { ok: false }                                 on failure
   */
  const doLogin = useCallback(async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiLogin(username, password);

      const userObj = {
        user_id: data.user_id ?? data.userId,
        username: data.username,
        email: data.email,
        full_name: data.full_name ?? data.fullName,
      };
      const role = data.role?.toLowerCase() || 'viewer';

      setSession({ token: data.token, user: userObj, role });
      return { ok: true, requiresTenantSelection: false };
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [setSession]);

  /**
   * Switch the active tenant.  Issues a new scoped JWT.
   * Call this when requiresTenantSelection is true or the user wants to switch.
   */
  const doSelectTenant = useCallback(async (tenantId) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiSelectTenant(tenantId);
      // Update token and role; keep the existing user + tenants list
      const role = tenants.find(t => t.tenant_id === tenantId)?.role ?? data.role ?? 'viewer';
      const updated = { token: data.token, user, tenants, tenantId, role };
      setSession(updated);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Tenant selection failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, tenants, setSession]);

  /**
   * Restore a session from an OAuth callback URL token.
   * The AuthCallback screen calls this after parsing ?token= from the URL.
   */
  /**
   * Commit an OAuth session once the token has already been verified via /auth/me.
   * AuthCallback calls getMe() explicitly before calling this, so we have real user data.
   */
  const restoreFromOAuth = useCallback((token, meData) => {
    const role = meData?.role?.toLowerCase() || 'viewer';
    const userObj = {
      user_id:   meData?.user_id ?? meData?.userId,
      username:  meData?.username,
      email:     meData?.email,
      full_name: meData?.full_name ?? meData?.fullName,
    };
    setSession({ token, user: userObj, role });
  }, [setSession]);

  /**
   * On mount: if we have a token + tenant context, call /auth/me to refresh
   * user profile, tenant list, and — critically — the current role.
   *
   * This fixes the "role shows as viewer" bug when:
   *   - the user had a token from before multi-tenant changes (no 'role' in localStorage)
   *   - the user logged in via Google OAuth (restoreFromOAuth saves role:'')
   *   - the role was changed by an admin and the JWT is still alive
   */
  // On mount: if there is already a token in localStorage (page reload, returning user)
  // call /auth/me to refresh the user profile and role.
  // Runs ONCE on mount only — the [token] dependency was removed intentionally so that
  // restoreFromOAuth (OAuth callback) does NOT accidentally re-trigger this effect.
  useEffect(() => {
    if (!token) return;
    // Skip on OAuth callback — AuthCallback manages its own session and calling getMe()
    // here with a stale token races against restoreFromOAuth, wiping the new session.
    if (window.location.pathname === '/auth/callback') return;

    getMe()
      .then(data => {
        const freshRole = data.role?.toLowerCase() || 'viewer';
        const userObj = {
          user_id: data.user_id ?? data.userId,
          username: data.username,
          email: data.email,
          full_name: data.full_name ?? data.fullName,
        };
        setUser(userObj);
        setTenants([]);
        setCurrentRole(freshRole);
        setCurrentTenantId(1);
        localStorage.setItem('user',    JSON.stringify(userObj));
        localStorage.setItem('tenants', JSON.stringify([]));
        localStorage.setItem('role',    freshRole);
        localStorage.setItem('tenantId', '1');
      })
      .catch((err) => {
        console.error('getMe() failed on mount:', err);
        if (err.response?.status === 401) {
          clearSession();
          setToken(null);
          setUser(null);
          setTenants([]);
          setCurrentTenantId(null);
          setCurrentRole('viewer');
          setRequiresTenantSelection(false);
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doLogout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
    setTenants([]);
    setCurrentTenantId(null);
    setCurrentRole('viewer');
    setRequiresTenantSelection(false);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    tenants,
    currentTenantId,
    currentRole,
    error,
    loading,
    requiresTenantSelection,
    doLogin,
    doLogout,
    doSelectTenant,
    restoreFromOAuth,
    setSession,
    isAuthenticated: !!token,
    // Convenience role checks
    isAdmin:    currentRole === 'admin',
    isOperator: currentRole === 'operator',
    isViewer:   currentRole === 'viewer',
  }), [
    user, token, tenants, currentTenantId, currentRole,
    error, loading, requiresTenantSelection,
    doLogin, doLogout, doSelectTenant, restoreFromOAuth, setSession,
  ]);

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
