import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { loginWithGoogle } from '../api';
import RegisterScreen from './RegisterScreen';

const QUICK = [
  { label: 'Admin',    user: 'admin',    pass: 'admin123' },
  { label: 'Operator', user: 'operator', pass: 'op123' },
  { label: 'Viewer',   user: 'viewer',   pass: 'view123' },
];

export default function LoginScreen({ onLogin }) {
  const [email,        setEmail]        = useState('');
  const [pass,         setPass]         = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const { doLogin, error, loading } = useAuth();

  if (showRegister) {
    return (
      <RegisterScreen
        onSuccess={(role) => onLogin(role)}
        onBack={() => setShowRegister(false)}
      />
    );
  }

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

        {/* Google OAuth button */}
        <button
          type="button"
          onClick={loginWithGoogle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, width: '100%', padding: '10px 16px', borderRadius: 8,
            border: '1.5px solid #1e3a26', background: '#162d1e', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: '#e2f0e6', fontFamily: 'inherit',
            marginBottom: 16, transition: 'background 0.15s',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#1e3a26' }}></div>
          <span style={{ fontSize: 11, color: '#4b7a56' }}>or sign in with username</span>
          <div style={{ flex: 1, height: 1, background: '#1e3a26' }}></div>
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
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        {/* Register link */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#4b7a56' }}>Don't have an account? </span>
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            style={{
              background: 'none', border: 'none', color: '#22c55e', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Register
          </button>
        </div>

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
