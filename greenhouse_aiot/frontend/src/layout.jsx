import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getOpenAlerts, getZones } from './api';
import { useApi, usePolling } from './hooks/useApi';
import { Icon } from './ui/icons';

const NAV = [
  { key: 'dashboard',   labelKey: 'nav.dashboard',   icon: 'dashboard',   roles: ['admin','operator','viewer'] },
  { key: 'sensors',     labelKey: 'nav.sensors',      icon: 'sensors',     roles: ['admin','operator','viewer'] },
  { key: 'crops',       labelKey: 'nav.crops',        icon: 'crops',       roles: ['admin','operator','viewer'] },
  { key: 'alerts',      labelKey: 'nav.alerts',       icon: 'alerts',      roles: ['admin','operator','viewer'] },
  { key: 'predict',     labelKey: 'nav.predict',      icon: 'predict',     roles: ['admin','operator'] },
  { key: 'predictions', labelKey: 'nav.predictions',  icon: 'predictions', roles: ['admin','operator'] },
  { key: 'devices',     labelKey: 'nav.devices',      icon: 'devices',     roles: ['admin','operator'] },
  { key: 'zones',       labelKey: 'nav.zones',        icon: 'zones',       roles: ['admin','operator'] },
  { key: 'users',       labelKey: 'nav.users',        icon: 'users',       roles: ['admin'] },
  { key: 'croptypes',   labelKey: 'nav.cropTypes',    icon: 'croptypes',   roles: ['admin'] },
  { key: 'simulator',   labelKey: 'nav.simulator',    icon: 'simulator',   roles: ['admin'] },
];

const MOBILE_BREAKPOINT = 768;

export function Shell({ children, screen, setScreen, zone, setZone, role, onLogout }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function handleNavClick(key) {
    setScreen(key);
    if (isMobile) setMenuOpen(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {isMobile && (
        <MobileHeader
          screen={screen}
          onOpenMenu={() => setMenuOpen(true)}
        />
      )}

      {/* Backdrop */}
      {isMobile && menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 100,
          }}
        />
      )}

      {/* Sidebar — always on desktop, drawer on mobile */}
      <div style={isMobile ? {
        position: 'fixed', top: 0, left: menuOpen ? 0 : -220, bottom: 0,
        width: 220, zIndex: 101,
        transition: 'left 0.25s ease',
      } : {}}>
        <Sidebar
          screen={screen}
          setScreen={handleNavClick}
          zone={zone} setZone={setZone}
          role={role}
          onLogout={onLogout}
          onClose={isMobile ? () => setMenuOpen(false) : null}
        />
      </div>

      <main style={{
        flex: 1, overflow: 'auto',
        background: 'var(--bg-page)',
        padding: isMobile ? '16px' : '28px',
        marginLeft: isMobile ? 0 : undefined,
      }}>
        {children}
      </main>
    </div>
  );
}

function MobileHeader({ screen, onOpenMenu }) {
  const { t } = useTranslation();
  const navItem = NAV.find(n => n.key === screen);
  const label = navItem ? t(navItem.labelKey) : t('nav.settings');

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#08160d', padding: '12px 16px',
      flexShrink: 0,
    }}>
      <button
        onClick={onOpenMenu}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 4, display: 'flex', alignItems: 'center',
        }}
      >
        <Icon name="menu" size={22} color="#86a08a" />
      </button>
      <div>
        <div style={{ color: '#22c55e', fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>
          GreenCore
        </div>
        <div style={{ color: '#4b7a56', fontSize: 10 }}>{label}</div>
      </div>
    </header>
  );
}

function Sidebar({ screen, setScreen, zone, setZone, role, onLogout, onClose }) {
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
      height: '100%',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingLeft: 8 }}>
        <div>
          <div style={{ color: '#22c55e', fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>
            GreenCore
          </div>
          <div style={{ color: '#4b7a56', fontSize: 10, marginTop: 2 }}>AIoT Management</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginRight: -4 }}
          >
            <Icon name="x" size={18} color="#4b7a56" />
          </button>
        )}
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
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <Icon name="logout" size={14} color="#86a08a" />
          {t('nav.logout')}
        </button>
      </div>
    </nav>
  );
}
