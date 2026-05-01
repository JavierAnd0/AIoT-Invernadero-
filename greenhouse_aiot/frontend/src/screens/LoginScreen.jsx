import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const QUICK = [
  { label: 'Admin',    user: 'admin',    pass: 'admin123' },
  { label: 'Operator', user: 'operator', pass: 'op123' },
  { label: 'Viewer',   user: 'viewer',   pass: 'view123' },
];

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const { doLogin, error, loading } = useAuth();

  async function handleLogin(e) {
    e.preventDefault();
    const role = await doLogin(email, pass);
    if (role) onLogin(role);
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#08160d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: '#0f2318', border: '1px solid #1e3a26',
        borderRadius: 16, padding: '40px 36px', width: 380,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div>
          <div style={{ color: '#22c55e', fontSize: 22, fontWeight: 700 }}>GreenCore</div>
          <div style={{ color: '#4b7a56', fontSize: 12, marginTop: 4 }}>AIoT Greenhouse Management</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', color: '#6b9b70', fontSize: 11, marginBottom: 5, fontWeight: 600 }}>
              USERNAME
            </label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="username"
              autoComplete="username"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: '#162d1e', border: '1px solid #1e3a26',
                color: '#e2f0e6', fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#6b9b70', fontSize: 11, marginBottom: 5, fontWeight: 600 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: '#162d1e', border: '1px solid #1e3a26',
                color: '#e2f0e6', fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#3b0a0a', color: '#f87171', padding: '8px 12px',
              borderRadius: 8, fontSize: 12,
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px', borderRadius: 8, border: 'none',
              background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading && (
              <div style={{
                width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid #fff', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            )}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 24 }}>
          <div style={{ color: '#4b7a56', fontSize: 10, letterSpacing: 0.8, marginBottom: 8, textAlign: 'center' }}>
            QUICK ACCESS
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {QUICK.map(q => (
              <button
                key={q.label}
                onClick={() => { setEmail(q.user); setPass(q.pass); }}
                style={{
                  flex: 1, padding: '7px 4px', borderRadius: 8,
                  background: '#162d1e', border: '1px solid #1e3a26',
                  color: '#6b9b70', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
