import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Card, Badge } from '../ui';
import { Icon } from '../ui/icons';

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLE_COLOR = { admin: '#8b5cf6', operator: '#3b82f6', viewer: '#6b7280' };
const PROVIDER_META = {
  local: { label: 'Contraseña', bg: '#ede9fe', color: '#5b21b6' },
  google: { label: 'Google', bg: '#fef3c7', color: '#92400e' },
};

const LANG_OPTIONS = [
  { value: 'en', label: 'Inglés' },
  { value: 'es', label: 'Español' },
];

const THEME_OPTIONS = [
  { value: 'system', icon: 'system', label: 'Sistema' },
  { value: 'light', icon: 'sun', label: 'Claro' },
  { value: 'dark', icon: 'moon', label: 'Oscuro' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(fullName = '') {
  return fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 1,
      color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 18,
    }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, last = false }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/** Reusable segmented pill control */
function SegmentedControl({ options, value, onChange, renderOption }) {
  return (
    <div style={{
      display: 'inline-flex', gap: 3,
      background: 'var(--bg-card-alt)', borderRadius: 999, padding: 4,
      border: '1px solid var(--border)',
    }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              borderRadius: 999, border: 'none',
              background: active ? 'var(--bg-card)' : 'transparent',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              color: active ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s ease',
              padding: '6px 14px',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: active ? 600 : 400,
            }}
          >
            {renderOption(opt, active)}
          </button>
        );
      })}
    </div>
  );
}

function PreferencesSection({ user }) {
  const { t, i18n } = useTranslation();
  const { setTheme } = useTheme();
  const [lang, setLang] = useState(user.language || i18n.language || 'en');
  const [theme, setThemeVal] = useState(user.theme || 'system');

  function changeLanguage(val) {
    if (lang === val) return;
    setLang(val);
    if (i18n.language !== val) i18n.changeLanguage(val);
    localStorage.setItem('language', val);
  }

  function changeTheme(val) {
    if (theme === val) return;
    setThemeVal(val);
    setTheme(val);
  }

  return (
    <Card>
      <SectionTitle>{t('settings.language')} & {t('settings.theme')}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Language */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              {t('settings.language')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Idioma de la interfaz</div>
          </div>
          <SegmentedControl
            options={LANG_OPTIONS}
            value={lang}
            onChange={changeLanguage}
            renderOption={(opt, active) => (
              <>
                <span style={{ fontSize: 15 }}>{opt.flag}</span>
                <span style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {opt.label}
                </span>
              </>
            )}
          />
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Theme */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              {t('settings.theme')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Apariencia de la app</div>
          </div>
          <div style={{
            display: 'inline-flex', gap: 3,
            background: 'var(--bg-card-alt)', borderRadius: 999, padding: 4,
            border: '1px solid var(--border)',
          }}>
            {THEME_OPTIONS.map(opt => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => changeTheme(opt.value)}
                  title={opt.label}
                  style={{
                    width: 40, height: 40, borderRadius: 999, border: 'none',
                    background: active ? 'var(--bg-card)' : 'transparent',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon name={opt.icon} size={18} color={active ? 'var(--text-primary)' : 'var(--text-muted)'} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function AccountSection({ user, tenants, currentTenantId, currentRole }) {
  const { t } = useTranslation();
  const currentTenant = tenants?.find(ten => ten.tenant_id === currentTenantId);
  const provMeta = PROVIDER_META[user.auth_provider] || { label: user.auth_provider, bg: 'var(--bg-card-alt)', color: 'var(--text-secondary)' };

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
                fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 600,
                background: provMeta.bg, color: provMeta.color,
              }}>
                {provMeta.label}
              </span>
              {user.auth_provider === 'local' && user.google_id && (
                <span style={{
                  fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 600,
                  background: PROVIDER_META.google.bg, color: PROVIDER_META.google.color,
                }}>
                  + Google
                </span>
              )}
            </div>
          }
        />
        {currentTenant && (
          <InfoRow
            last
            label={t('settings.currentOrganisation')}
            value={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{currentTenant.name}</span>
                <Badge label={currentRole} color={ROLE_COLOR[currentRole] || '#6b7280'} />
              </div>
            }
          />
        )}
      </div>
    </Card>
  );
}

function AvatarCard({ user, currentRole }) {
  return (
    <Card style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            style={{
              width: 68, height: 68, borderRadius: '50%',
              objectFit: 'cover', border: '2px solid var(--border)',
            }}
          />
        ) : (
          <div style={{
            width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff',
          }}>
            {initials(user.full_name)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {user.full_name}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--text-muted)',
            fontFamily: "'DM Mono', monospace", marginTop: 3,
          }}>
            @{user.username}
          </div>
          {user.email && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {user.email}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <Badge label={currentRole} color={ROLE_COLOR[currentRole] || '#6b7280'} />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user: authUser, tenants, currentTenantId, currentRole } = useAuth();
  const [user] = useState(authUser);
  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {t('settings.title')}
        </h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
          {t('settings.profileDesc')}
        </div>
      </div>

      <AvatarCard user={user} currentRole={currentRole} />
      <PreferencesSection user={user} />
      <AccountSection
        user={user}
        tenants={tenants}
        currentTenantId={currentTenantId}
        currentRole={currentRole}
      />
    </div>
  );
}
