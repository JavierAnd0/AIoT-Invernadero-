import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getMeWithToken } from '../api';

/**
 * Landing page for the Google OAuth2 callback.
 *
 * Flow:
 *  1. Backend redirects here with /auth/callback?token=JWT
 *  2. We call /auth/me with that token to verify it works and fetch user data
 *  3. Only if that succeeds do we commit the session and navigate to the dashboard
 *
 * Doing the verification here (rather than relying on the useEffect in AuthProvider)
 * prevents silent redirect-to-login when getMe() fails after setToken().
 */
export default function AuthCallback({ onLogin }) {
  const { restoreFromOAuth } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const error  = params.get('error');

    if (error) {
      setErrorMsg(`Google devolvió un error: ${decodeURIComponent(error)}`);
      return;
    }

    if (!token) {
      setErrorMsg('No se recibió ningún token del servidor. Verifica la configuración de FRONTEND_URL en el backend.');
      return;
    }

    getMeWithToken(token)
      .then(userData => {
        restoreFromOAuth(token, userData);
        onLogin();
      })
      .catch(err => {
        const detail = err.response?.data?.error || err.message || 'Error desconocido';
        const status = err.response?.status;
        setErrorMsg(
          status === 401
            ? `Token inválido (401). El JWT generado no pasa la validación del backend. Detalle: ${detail}`
            : `Error al verificar sesión (${status ?? 'sin respuesta'}): ${detail}`
        );
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (errorMsg) {
    return (
      <div style={{
        minHeight: '100vh', background: '#08160d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, padding: 24,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{
          background: '#3b0a0a', border: '1px solid #7f1d1d',
          borderRadius: 12, padding: '24px 28px', maxWidth: 480, width: '100%',
        }}>
          <div style={{ color: '#f87171', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
            Error al iniciar sesión con Google
          </div>
          <div style={{ color: '#fca5a5', fontSize: 13, lineHeight: 1.6 }}>{errorMsg}</div>
          <button
            onClick={() => window.location.replace('/')}
            style={{
              marginTop: 20, padding: '9px 18px', borderRadius: 8,
              background: '#22c55e', border: 'none', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

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
        Verificando sesión…
      </p>
    </div>
  );
}
