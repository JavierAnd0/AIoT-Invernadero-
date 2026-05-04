import { useState } from 'react';
import { register, loginWithGoogle } from '../api';
import { useAuth } from '../hooks/useAuth';

export default function RegisterScreen({ onSuccess, onBack }) {
  const { setSession } = useAuth();
  const [form, setForm] = useState({
    full_name: '', username: '', email: '', password: '', confirm: '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        username:  form.username,
        email:     form.email,
        password:  form.password,
        full_name: form.full_name,
      });
      setSession(data.token, data.user);
      onSuccess(data.user.role);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    background: '#162d1e', border: '1px solid #1e3a26',
    color: '#e2f0e6', fontSize: 13, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', color: '#6b9b70', fontSize: 11, marginBottom: 5, fontWeight: 600,
  };

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
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div>
          <div style={{ color: '#22c55e', fontSize: 22, fontWeight: 700 }}>GreenCore</div>
          <div style={{ color: '#4b7a56', fontSize: 12, marginTop: 4 }}>Create your account</div>
        </div>

        {/* Google sign-up */}
        <button
          type="button"
          onClick={loginWithGoogle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, width: '100%', padding: '10px 16px', borderRadius: 8,
            border: '1.5px solid #1e3a26', background: '#162d1e', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: '#e2f0e6', fontFamily: 'inherit',
            marginBottom: 16,
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign up with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#1e3a26' }}></div>
          <span style={{ fontSize: 11, color: '#4b7a56' }}>or create account with email</span>
          <div style={{ flex: 1, height: 1, background: '#1e3a26' }}></div>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>FULL NAME</label>
            <input value={form.full_name} onChange={update('full_name')}
              placeholder="María García" autoComplete="name" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>USERNAME</label>
            <input value={form.username} onChange={update('username')}
              placeholder="mgarcia" autoComplete="username" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input value={form.email} onChange={update('email')}
              type="email" placeholder="maria@example.com" autoComplete="email" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>PASSWORD</label>
            <input value={form.password} onChange={update('password')}
              type="password" placeholder="••••••••" autoComplete="new-password" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>CONFIRM PASSWORD</label>
            <input value={form.confirm} onChange={update('confirm')}
              type="password" placeholder="••••••••" autoComplete="new-password" style={inputStyle} />
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
              opacity: loading ? 0.8 : 1, marginTop: 4,
            }}
          >
            {loading && (
              <div style={{
                width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid #fff', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            )}
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#4b7a56' }}>Already have an account? </span>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none', border: 'none', color: '#22c55e', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
