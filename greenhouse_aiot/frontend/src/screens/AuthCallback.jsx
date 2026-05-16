import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Landing page for the Google OAuth2 callback.
 *
 * The backend redirects here with:
 *   /auth/callback?token=JWT&requires_tenant_selection=false|true
 * or on error:
 *   /auth/callback?error=<reason>
 *
 * We call restoreFromOAuth() (which reads tenant_id from the JWT payload and
 * saves the minimal session) then hand off to onLogin() so App.jsx can
 * clear the /auth/callback path and render the main app.
 */
export default function AuthCallback({ onLogin }) {
  const { restoreFromOAuth } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const error  = params.get('error');

    if (error) {
      window.location.href = '/?oauth_error=' + encodeURIComponent(error);
      return;
    }

    if (token) {
      try {
        restoreFromOAuth(token);
        // onLogin() — no role needed; App.jsx reads currentRole from context
        onLogin();
      } catch {
        window.location.href = '/?oauth_error=invalid_token';
      }
    } else {
      window.location.href = '/';
    }
  }, [onLogin, restoreFromOAuth]);

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
