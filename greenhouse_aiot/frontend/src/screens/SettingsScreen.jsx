import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { updateProfile, changePassword } from '../api';
import { Card, Btn, Input, Badge, ErrorBanner } from '../ui';

// ── helpers ───────────────────────────────────────────────────────────────────

const ROLE_COLOR = { admin: '#8b5cf6', operator: '#3b82f6', viewer: '#6b7280' };
const PROVIDER_LABEL = { local: 'Password', google: 'Google' };

function initials(fullName = '') {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
      color: '#6b7280', textTransform: 'uppercase', marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f4f1' }}>
      <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function SaveBanner({ saved }) {
  const { t } = useTranslation();
  if (!saved) return null;
  return (
    <div style={{
      background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
      padding: '10px 14px', fontSize: 13, color: '#15803d', fontWeight: 500,
    }}>
      ✓ {t('settings.saved')}
    </div>
  );
}

// ── PreferencesSection ───────────────────────────────────────────────────────

function PreferencesSection() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  // Read current values from i18n / ThemeProvider (source of truth is localStorage)
  const [form, setForm] = useState({
    language: i18n.language || localStorage.getItem('language') || 'en',
    theme: theme || localStorage.getItem('theme') || 'system',
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      // Preferences are client-side only — no backend call needed.
      if (form.language !== i18n.language) {
        i18n.changeLanguage(form.language);
        localStorage.setItem('language', form.language);
      }
      if (form.theme !== theme) {
        setTheme(form.theme); // ThemeProvider already persists to localStorage
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Could not update preferences');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <SectionTitle>{t('settings.language')} & {t('settings.theme')}</SectionTitle>
      <ErrorBanner message={error} />
      <SaveBanner saved={saved} />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: error || saved ? 14 : 0 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
            {t('settings.language')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['en', 'es'].map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setForm(p => ({ ...p, language: lang }))}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8, border: '2px solid',
                  borderColor: form.language === lang ? '#22c55e' : '#e5e7eb',
                  background: form.language === lang ? '#f0fdf4' : '#fff',
                  color: form.language === lang ? '#15803d' : '#6b7280',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {lang === 'en' ? t('settings.english') : t('settings.spanish')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
            {t('settings.theme')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['light', 'dark', 'system'].map(th => (
              <button
                key={th}
                type="button"
                onClick={() => setForm(p => ({ ...p, theme: th }))}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8, border: '2px solid',
                  borderColor: form.theme === th ? '#22c55e' : '#e5e7eb',
                  background: form.theme === th ? '#f0fdf4' : '#fff',
                  color: form.theme === th ? '#15803d' : '#6b7280',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {th === 'light' ? '☀️ ' + t('settings.light') :
                 th === 'dark' ? '🌙 ' + t('settings.dark') :
                 '💻 ' + t('settings.system')}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn type="submit" disabled={saving}>
            {saving ? t('common.loading') : t('settings.saveChanges')}
          </Btn>
        </div>
      </form>
    </Card>
  );
}

// ── ProfileSection ─────────────────────────────────────────────────────────────

function ProfileSection({ user, onSaved }) {
  const [form,    setForm]    = useState({ full_name: user.full_name || '', email: user.email || '' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [saved,   setSaved]   = useState(false);

  const dirty = form.full_name !== (user.full_name || '') || form.email !== (user.email || '');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaved(false); setSaving(true);
    try {
      const res = await updateProfile(form);
      onSaved(res.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Profile information</SectionTitle>
      <ErrorBanner message={error} />
      <SaveBanner saved={saved} />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: error || saved ? 14 : 0 }}>
        <Input
          label="Full Name"
          value={form.full_name}
          onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          required
        />
        {/* Username is immutable — shown read-only */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
            Username
          </div>
          <div style={{
            padding: '9px 12px', background: '#f9fafb', border: '1px solid #e5e7eb',
            borderRadius: 8, fontSize: 13, color: '#9ca3af',
            fontFamily: "'DM Mono', monospace",
          }}>
            {user.username}
            <span style={{ marginLeft: 8, fontSize: 10, color: '#d1d5db' }}>cannot be changed</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn type="submit" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </Btn>
        </div>
      </form>
    </Card>
  );
}

// ── PasswordSection ────────────────────────────────────────────────────────────

function PasswordSection({ user }) {
  const isGoogle = user.auth_provider === 'google' && !user.password_hash;

  const [form,    setForm]    = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [saved,   setSaved]   = useState(false);
  const [show,    setShow]    = useState({ current: false, next: false, confirm: false });

  function toggleShow(field) {
    setShow(p => ({ ...p, [field]: !p[field] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaved(false);

    if (form.new_password !== form.confirm) {
      setError('New passwords do not match'); return;
    }
    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters'); return;
    }

    setSaving(true);
    try {
      await changePassword({
        current_password: form.current_password,
        new_password:     form.new_password,
      });
      setForm({ current_password: '', new_password: '', confirm: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change password');
    } finally {
      setSaving(false);
    }
  }

  if (isGoogle) {
    return (
      <Card>
        <SectionTitle>Security</SectionTitle>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', background: '#f9fafb',
          border: '1px solid #e5e7eb', borderRadius: 10,
        }}>
          <span style={{ fontSize: 22 }}>🔒</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              Managed by Google
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Your account uses Google Sign-In. Password management is handled by Google.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Change password</SectionTitle>
      <ErrorBanner message={error} />
      <SaveBanner saved={saved} />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: error || saved ? 14 : 0 }}>
        <PasswordInput
          label="Current password"
          value={form.current_password}
          show={show.current}
          onToggle={() => toggleShow('current')}
          onChange={e => setForm(p => ({ ...p, current_password: e.target.value }))}
        />
        <PasswordInput
          label="New password (min 8 chars)"
          value={form.new_password}
          show={show.next}
          onToggle={() => toggleShow('next')}
          onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
        />
        <PasswordInput
          label="Confirm new password"
          value={form.confirm}
          show={show.confirm}
          onToggle={() => toggleShow('confirm')}
          onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
        />

        {/* Password strength indicator */}
        {form.new_password && (
          <PasswordStrength password={form.new_password} />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn type="submit" disabled={saving || !form.current_password || !form.new_password || !form.confirm}>
            {saving ? 'Updating…' : 'Update password'}
          </Btn>
        </div>
      </form>
    </Card>
  );
}

function PasswordInput({ label, value, show, onToggle, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '9px 40px 9px 12px',
            border: '1px solid #d1d5db', borderRadius: 8,
            fontSize: 13, fontFamily: 'inherit', outline: 'none',
            background: '#fff',
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', fontSize: 14, padding: 0,
          }}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters',          ok: password.length >= 8 },
    { label: 'Uppercase letter',        ok: /[A-Z]/.test(password) },
    { label: 'Number',                  ok: /\d/.test(password) },
    { label: 'Special character',       ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#22c55e', '#22c55e'];
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < score ? colors[score] : '#e5e7eb',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: colors[score], fontWeight: 600 }}>{labels[score]}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {checks.map(c => (
            <span key={c.label} style={{ color: c.ok ? '#22c55e' : '#d1d5db' }}>
              {c.ok ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AccountSection ─────────────────────────────────────────────────────────────

function AccountSection({ user, tenants, currentTenantId, currentRole }) {
  const currentTenant = tenants?.find(t => t.tenant_id === currentTenantId);

  return (
    <Card>
      <SectionTitle>Account details</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <InfoRow label="Member since" value={formatDate(user.created_at)} />
        <InfoRow label="Last updated"  value={formatDate(user.updated_at)} />
        <InfoRow
          label="Authentication"
          value={
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                background: user.auth_provider === 'google' ? '#fef3c7' : '#ede9fe',
                color:      user.auth_provider === 'google' ? '#92400e' : '#5b21b6',
              }}>
                {PROVIDER_LABEL[user.auth_provider] || user.auth_provider}
              </span>
              {user.auth_provider === 'local' && user.google_id && (
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                  background: '#fef3c7', color: '#92400e',
                }}>
                  + Google linked
                </span>
              )}
            </div>
          }
        />
        {currentTenant && (
          <InfoRow
            label="Current organisation"
            value={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#111827' }}>{currentTenant.name}</span>
                <Badge
                  label={currentRole}
                  color={ROLE_COLOR[currentRole] || '#6b7280'}
                />
              </div>
            }
          />
        )}
        {tenants?.length > 1 && (
          <div style={{ marginTop: 12, padding: '10px 0' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
              All organisations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tenants.map(t => (
                <div key={t.tenant_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 10px', background: t.tenant_id === currentTenantId ? '#f0fdf4' : '#f9fafb',
                  borderRadius: 8, border: `1px solid ${t.tenant_id === currentTenantId ? '#bbf7d0' : '#f0f0f0'}`,
                }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>{t.name}</span>
                  <Badge label={t.role} color={ROLE_COLOR[t.role] || '#6b7280'} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── AvatarCard ─────────────────────────────────────────────────────────────────

function AvatarCard({ user, currentRole }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
          />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {initials(user.full_name)}
          </div>
        )}
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {user.full_name}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            @{user.username}
          </div>
          <div style={{ marginTop: 6 }}>
            <Badge label={currentRole} color={ROLE_COLOR[currentRole] || '#6b7280'} />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user: authUser, tenants, currentTenantId, currentRole, setSession, token } = useAuth();

  // Keep a local copy of user so profile updates reflect immediately
  const [user, setUser] = useState(authUser);

  function handleProfileSaved(updatedUser) {
    setUser(updatedUser);
    // Also sync back to AuthContext so navbar / other screens see the update
    setSession({
      token,
      user:     updatedUser,
      tenants,
      tenantId: currentTenantId,
      role:     currentRole,
    });
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{t('settings.title')}</h1>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
          {t('settings.profileDesc')}
        </div>
      </div>

      <AvatarCard user={user} currentRole={currentRole} />
      <PreferencesSection />
      <ProfileSection user={user} onSaved={handleProfileSaved} />
      <PasswordSection user={user} />
      <AccountSection
        user={user}
        tenants={tenants}
        currentTenantId={currentTenantId}
        currentRole={currentRole}
      />
    </div>
  );
}
