import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getOpenAlerts, getZones } from './api';
import { useApi, usePolling } from './hooks/useApi';
import { ICONS, Icon } from './ui/icons';

const NAV = [
  { key: 'dashboard',   labelKey: 'nav.dashboard',   icon: '◈', roles: ['admin','operator','viewer'] },
  { key: 'sensors',     labelKey: 'nav.sensors',      icon: '⊡', roles: ['admin','operator','viewer'] },
  { key: 'crops',       labelKey: 'nav.crops',        icon: '✿', roles: ['admin','operator','viewer'] },
  { key: 'alerts',      labelKey: 'nav.alerts',       icon: '⚠', roles: ['admin','operator','viewer'] },
  { key: 'predict',     labelKey: 'nav.predict',      icon: '◉', roles: ['admin','operator'] },
  { key: 'predictions', labelKey: 'nav.predictions',  icon: '⊙', roles: ['admin','operator'] },
  { key: 'devices',     labelKey: 'nav.devices',      icon: '⊞', roles: ['admin','operator'] },
  { key: 'zones',       labelKey: 'nav.zones',        icon: '⊟', roles: ['admin','operator'] },
  { key: 'users',       labelKey: 'nav.users',        icon: '⊕', roles: ['admin'] },
  { key: 'croptypes',   labelKey: 'nav.cropTypes',    icon: '⊗', roles: ['admin'] },
  { key: 'simulator',   labelKey: 'nav.simulator',    icon: '▷', roles: ['admin'] },
];

export function Shell({ children, screen, setScreen, zone, setZone, role, onLogout }) {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Sidebar
        screen={screen} setScreen={setScreen}
        zone={zone} setZone={setZone}
        role={role}
        onLogout={onLogout}
      />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-page)', padding: 28 }}>
        {children}
      </main>
    </div>
  );
}

function Sidebar({ screen, setScreen, zone, setZone, role, onLogout }) {
  const { t } = useTranslation();
  const { data: openAlertsArr } = usePolling(getOpenAlerts, 30000);
  const { data: zones } = useApi(getZones, []);
  const openAlerts = Array.isArray(openAlertsArr) ? openAlertsArr.length : 0;
  const showZone = ['dashboard', 'sensors', 'crops'].includes(screen);
  const visible = NAV.filter(n => n.roles.includes(role));
  const zoneOptions = Array.isArray(zones) ? zones : [];

  useEffect(() => {
    if (!zoneOptions.length) return;
    if (!zoneOptions.some(z => z.zone_id === zone)) {
      setZone(zoneOptions[0].zone_id);
    }
  }, [setZone, zone, zoneOptions]);

  return (
    <nav style={{
      width: 210, background: '#08160d', display: 'flex', flexDirection: 'column',
      padding: '20px 12px', gap: 2, flexShrink: 0, overflowY: 'auto',
    }}>
      <div style={{ marginBottom: 20, paddingLeft: 8 }}>
        <div style={{ color: '#22c55e', fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>
          GreenCore
        </div>
        <div style={{ color: '#4b7a56', fontSize: 10, marginTop: 2 }}>AIoT Management</div>
      </div>

      {visible.map(item => {
        const active = screen === item.key;
        return (
          <button key={item.key}
            onClick={() => setScreen(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 8, border: 'none',
              background: active ? '#22c55e18' : 'transparent',
              color: active ? '#22c55e' : '#86a08a',
              fontSize: 12, fontWeight: active ? 600 : 400,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              position: 'relative',
            }}
          >
            <Icon name={item.icon} size={16} color={active ? '#22c55e' : '#86a08a'} />
            {t(item.labelKey)}
            {item.key === 'alerts' && openAlerts > 0 && (
              <span style={{
                marginLeft: 'auto', background: '#ef4444', color: '#fff',
                borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700,
              }}>
                {openAlerts}
              </span>
            )}
          </button>
        );
      })}

      {showZone && (
        <div style={{ marginTop: 16, paddingLeft: 4 }}>
          <div style={{ color: '#4b7a56', fontSize: 10, letterSpacing: 0.8, marginBottom: 6, paddingLeft: 6 }}>
            {t('nav.zones').toUpperCase()}
          </div>
          {zoneOptions.map(z => (
            <button key={z.zone_id}
              onClick={() => setZone(z.zone_id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 10px', borderRadius: 6, border: 'none',
                background: zone === z.zone_id ? '#22c55e22' : 'transparent',
                color: zone === z.zone_id ? '#22c55e' : '#6b9b70',
                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {z.description || z.name}
            </button>
          ))}
          {zoneOptions.length === 0 && (
            <div style={{ color: '#4b7a56', fontSize: 11, padding: '6px 10px' }}>
              No active zones
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <div style={{ color: '#4b7a56', fontSize: 10, paddingLeft: 6, marginBottom: 6 }}>
          {role?.toUpperCase()}
        </div>
        {/* Settings — accessible to all roles */}
        <button
          onClick={() => setScreen('settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 9, width: '100%',
            padding: '8px 10px', borderRadius: 8, border: 'none',
            background: screen === 'settings' ? '#22c55e18' : 'transparent',
            color: screen === 'settings' ? '#22c55e' : '#86a08a',
            fontSize: 12, fontWeight: screen === 'settings' ? 600 : 400,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <Icon name="settings" size={16} color={screen === 'settings' ? '#22c55e' : '#86a08a'} />
          {t('nav.settings')}
        </button>
        <button
          onClick={onLogout}
          style={{
            width: '100%', background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '7px 12px', color: '#86a08a',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8,
          }}
        >
          <Icon name="logout" size={14} color="#86a08a" />
          {t('nav.logout')}
        </button>
      </div>
    </nav>
  );
}
