import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Card, Badge } from '../ui';
import { Icon } from '../ui/icons';

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

function PreferencesSection({ user }) {
  const { t, i18n } = useTranslation();
  const { setTheme } = useTheme();
  const [form, setForm] = useState({
    language: user.language || 'en',
    theme: user.theme || 'system',
  });

  // Auto-save on selection changes: language and theme are persisted on change
  // to avoid the need for a separate Save button.
  const themeOptions = [
    { value: 'system', icon: 'system', labelKey: 'settings.system' },
    { value: 'light',  icon: 'sun',    labelKey: 'settings.light' },
    { value: 'dark',   icon: 'moon',   labelKey: 'settings.dark' },
  ];

  // Handlers for immediate persistence
  function changeLanguage(lang) {
    if (form.language === lang) return;
    setForm(p => ({ ...p, language: lang }));
    // Persist to i18n and localStorage for future sessions
    if (i18n.language !== lang) i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  }

  function changeThemeValue(val) {
    if (form.theme === val) return;
    setForm(p => ({ ...p, theme: val }));
    setTheme(val);
  }

  return (
    <Card>
      <SectionTitle>{t('settings.language')} & {t('settings.theme')}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
            {t('settings.language')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['en', 'es'].map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => changeLanguage(lang)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8, border: '2px solid',
                  borderColor: form.language === lang ? '#22c55e' : '#e5e7eb',
                  background: form.language === lang ? '#f0fdf4' : '#fff',
                  color: form.language === lang ? '#15803d' : '#6b7280',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {lang === 'en' ? '🇺🇸 ' + t('settings.english') : '🇪🇸 ' + t('settings.spanish')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
            {t('settings.theme')}
          </div>
          <div style={{
            display: 'inline-flex', gap: 4,
            background: 'var(--bg-card-alt)', borderRadius: 999, padding: 4,
            border: '1px solid var(--border)',
          }}>
            {themeOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => changeThemeValue(opt.value)}
                title={t(opt.labelKey)}
                style={{
                  width: 40, height: 40, borderRadius: 999, border: 'none',
                  background: form.theme === opt.value ? 'var(--bg-card)' : 'transparent',
                  boxShadow: form.theme === opt.value ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <Icon
                  name={opt.icon}
                  size={18}
                  color={form.theme === opt.value ? 'var(--text-primary)' : 'var(--text-muted)'}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
      </Card>
  );
}



function AccountSection({ user, tenants, currentTenantId, currentRole }) {
  const { t } = useTranslation();
  const currentTenant = tenants?.find(t => t.tenant_id === currentTenantId);

  return (
    <Card>
      <SectionTitle>{t('settings.accountDetails')}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <InfoRow label={t('settings.member_since')} value={formatDate(user.created_at)} />
        <InfoRow label={t('settings.last_updated')} value={formatDate(user.updated_at)} />
        <InfoRow
          label={t('settings.authentication')}
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
            label={t('settings.currentOrganisation')}
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
        {/* tenants?.length > 1 && (
          ...
        ) */}
      </div>
    </Card>
  );
}

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

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user: authUser, tenants, currentTenantId, currentRole, setSession, token } = useAuth();

  const [user, setUser] = useState(authUser);

  function handleProfileSaved(updatedUser) {
    setUser(updatedUser);
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
      <PreferencesSection user={user} />
      {/* <ProfileSection user={user} onSaved={handleProfileSaved} />
      <PasswordSection user={user} /> */}
      <AccountSection
        user={user}
        tenants={tenants}
        currentTenantId={currentTenantId}
        currentRole={currentRole}
      />
    </div>
  );
}
