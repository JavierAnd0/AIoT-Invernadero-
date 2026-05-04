import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AuthCallback({ onLogin }) {
  const { setSession } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const error  = params.get('error');

    if (error) {
      window.location.href = '/?oauth_error=' + error;
      return;
    }

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const user = { role: payload.role, user_id: parseInt(payload.sub) };
        setSession(token, user);
        onLogin(user.role);
      } catch {
        window.location.href = '/?oauth_error=invalid_token';
      }
    } else {
      window.location.href = '/';
    }
  }, [onLogin, setSession]);

  return (
    <div style={{
      minHeight: '100vh', background: '#08160d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(34,197,94,0.3)',
        borderTop: '3px solid #22c55e',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#86a08a', fontSize: 14, margin: 0 }}>
        Completing sign in…
      </p>
    </div>
  );
}
