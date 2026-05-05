import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';
import { login as apiLogin, selectTenant as apiSelectTenant } from '../api';

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
    currentTenantId: Number(localStorage.getItem('tenantId')) || null,
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
  const setSession = useCallback(({ token, user, tenants, tenantId, role }) => {
    saveSession({ token, user, tenants, tenantId, role });
    setToken(token);
    setUser(user);
    setTenants(tenants || []);
    setCurrentTenantId(tenantId ?? null);
    setCurrentRole(role ?? 'viewer');
    setRequiresTenantSelection(!tenantId && (tenants?.length ?? 0) > 1);
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

      // The server returns:
      //   token, user, tenants[], requires_tenant_selection
      const tenantList = data.tenants || [];
      const tenantId   = data.requires_tenant_selection ? null : (tenantList[0]?.tenant_id ?? null);
      const role       = tenantList.find(t => t.tenant_id === tenantId)?.role ?? 'viewer';

      setSession({ token: data.token, user: data.user, tenants: tenantList, tenantId, role });
      return { ok: true, requiresTenantSelection: !!data.requires_tenant_selection };
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
  const restoreFromOAuth = useCallback((token, requiresTenantSelection) => {
    // Decode the JWT payload (not verification — server already verified it)
    try {
      const payload    = JSON.parse(atob(token.split('.')[1]));
      const userId     = payload.sub;
      const tenantId   = payload.tenant_id ?? null;
      // We don't have full user/tenants info at this point — call /auth/me after redirect
      saveSession({ token, user: { user_id: userId }, tenants: [], tenantId, role: '' });
      setToken(token);
      setCurrentTenantId(tenantId);
      setRequiresTenantSelection(requiresTenantSelection && !tenantId);
    } catch {
      // fallback — just save the token and let /auth/me fill in the rest
      localStorage.setItem('token', token);
      setToken(token);
    }
  }, []);

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
    isAuthenticated: !!token && !!currentTenantId,
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
