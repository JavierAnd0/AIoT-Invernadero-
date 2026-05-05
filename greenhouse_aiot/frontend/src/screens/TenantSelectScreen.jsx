import { useAuth } from '../hooks/useAuth';

/**
 * Tenant selection screen.
 *
 * Shown when a user belongs to more than one tenant and the JWT was issued
 * without a tenant_id (requires_tenant_selection=true).
 * Calls POST /auth/select-tenant to receive a scoped token, after which
 * isAuthenticated becomes true and the main app renders.
 *
 * For single-tenant installations this screen is never shown.
 */
export default function TenantSelectScreen() {
  const { tenants, doSelectTenant, error, loading, doLogout } = useAuth();

  return (
    <div style={{
      minHeight: '100vh', background: '#08160d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: '#0f2318', border: '1px solid #1e3a26',
        borderRadius: 16, padding: '40px 36px', width: 420,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
          <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>
            Select Organisation
          </div>
          <div style={{ color: '#4b7a56', fontSize: 12, marginTop: 4 }}>
            Your account belongs to multiple organisations.<br />
            Choose which one to access.
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#3b0a0a', color: '#f87171',
            padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 16,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Tenant cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tenants.map(t => (
            <button
              key={t.tenant_id}
              disabled={loading}
              onClick={() => doSelectTenant(t.tenant_id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 10,
                background: '#162d1e', border: '1.5px solid #1e3a26',
                color: '#e2f0e6', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
                transition: 'border-color 0.15s, background 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#22c55e';
                e.currentTarget.style.background  = '#1a3522';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e3a26';
                e.currentTarget.style.background  = '#162d1e';
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                <div style={{ color: '#4b7a56', fontSize: 11, marginTop: 2 }}>
                  {t.slug}
                </div>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px',
                borderRadius: 20, background: '#0f2318',
                color: t.role === 'admin' ? '#8b5cf6'
                     : t.role === 'operator' ? '#3b82f6'
                     : '#6b7280',
                border: '1px solid currentColor',
              }}>
                {t.role}
              </div>
            </button>
          ))}

          {tenants.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
              No organisations available. Contact your administrator.
            </p>
          )}
        </div>

        {/* Sign out */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            type="button"
            onClick={doLogout}
            style={{
              background: 'none', border: 'none', color: '#4b7a56',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
