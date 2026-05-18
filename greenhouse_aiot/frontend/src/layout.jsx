import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  { key: 'actuators',   labelKey: 'nav.actuators',    icon: 'actuators',   roles: ['admin','operator'] },
  { key: 'zones',       labelKey: 'nav.zones',        icon: 'zones',       roles: ['admin','operator'] },
  { key: 'users',       labelKey: 'nav.users',        icon: 'users',       roles: ['admin'] },
  { key: 'croptypes',   labelKey: 'nav.cropTypes',    icon: 'croptypes',   roles: ['admin'] },
  { key: 'simulator',   labelKey: 'nav.simulator',    icon: 'simulator',   roles: ['admin'] },
];

const MOBILE_BP   = 768;
const SIDEBAR_W   = 220;
const SIDEBAR_MINI_W = 60;

export function Shell({ children, screen, setScreen, zone, setZone, role, onLogout }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BP : false
  );
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < MOBILE_BP;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Swipe gesture to open/close mobile sidebar
  useEffect(() => {
    if (!isMobile) return;
    const onStart = e => { touchStartX.current = e.touches[0].clientX; };
    const onEnd   = e => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (!menuOpen && touchStartX.current < 40 && dx > 60) setMenuOpen(true);
      else if (menuOpen && dx < -60) setMenuOpen(false);
      touchStartX.current = null;
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend',   onEnd);
    };
  }, [isMobile, menuOpen]);

  // ⌘B / Ctrl+B — collapse desktop sidebar
  useEffect(() => {
    if (isMobile) return;
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setCollapsed(c => !c);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobile]);

  const handleNavClick = useCallback(key => {
    setScreen(key);
    if (isMobile) setMenuOpen(false);
  }, [isMobile, setScreen]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: '100vh',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {isMobile && (
        <MobileHeader screen={screen} onOpenMenu={() => setMenuOpen(true)} />
      )}

      {/* Backdrop with blur */}
      {isMobile && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 100,
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Sidebar wrapper */}
      <div style={isMobile ? {
        position: 'fixed', top: 0, bottom: 0,
        left: menuOpen ? 0 : -SIDEBAR_W,
        width: SIDEBAR_W, zIndex: 101,
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: menuOpen ? '6px 0 32px rgba(0,0,0,0.5)' : 'none',
      } : {
        width: collapsed ? SIDEBAR_MINI_W : SIDEBAR_W,
        flexShrink: 0,
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <Sidebar
          screen={screen}
          setScreen={handleNavClick}
          zone={zone} setZone={setZone}
          role={role}
          onLogout={onLogout}
          onClose={isMobile ? () => setMenuOpen(false) : null}
          collapsed={!isMobile && collapsed}
          onToggleCollapse={isMobile ? null : () => setCollapsed(c => !c)}
        />
      </div>

      <main style={{
        flex: 1, overflow: 'auto',
        background: 'var(--bg-page)',
        padding: isMobile
          ? '16px 16px calc(16px + env(safe-area-inset-bottom))'
          : '28px',
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  );
}

// ── Mobile header ──────────────────────────────────────────────
function MobileHeader({ screen, onOpenMenu }) {
  const { t } = useTranslation();
  const navItem = NAV.find(n => n.key === screen);
  const label   = navItem ? t(navItem.labelKey) : t('nav.settings');

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#08160d',
      padding: '0 16px',
      height: 52,
      flexShrink: 0,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Hamburger */}
      <button
        onClick={onOpenMenu}
        aria-label="Open navigation"
        style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.18)',
          borderRadius: 8,
          padding: '7px 8px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
      >
        <Icon name="menu" size={18} color="#86a08a" />
      </button>

      {/* Current page */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        {navItem && (
          <Icon name={navItem.icon} size={15} color="#22c55e" />
        )}
        <span style={{
          color: '#e2f0e6', fontSize: 14, fontWeight: 700,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      </div>

      {/* Brand — pushed to the right */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#22c55e', display: 'inline-block',
          animation: 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
          opacity: 0.8,
        }} />
        <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700, letterSpacing: -0.3 }}>
          GreenCore
        </span>
      </div>
    </header>
  );
}

// ── Sidebar ────────────────────────────────────────────────────
function Sidebar({ screen, setScreen, zone, setZone, role, onLogout, onClose, collapsed, onToggleCollapse }) {
  const { t } = useTranslation();
  const { data: openAlertsArr } = usePolling(getOpenAlerts, 30000);
  const { data: zones }         = useApi(getZones, []);
  const openAlerts  = Array.isArray(openAlertsArr) ? openAlertsArr.length : 0;
  const showZone    = ['dashboard', 'sensors', 'crops'].includes(screen);
  const visible     = NAV.filter(n => n.roles.includes(role));
  const zoneOptions = useMemo(() => Array.isArray(zones) ? zones : [], [zones]);

  const [hoveredKey, setHoveredKey] = useState(null);
  const [tooltip,    setTooltip]    = useState({ label: '', y: 0, visible: false });

  useEffect(() => {
    if (!zoneOptions.length) return;
    if (!zoneOptions.some(z => z.zone_id === zone)) setZone(zoneOptions[0].zone_id);
  }, [setZone, zone, zoneOptions]);

  const showTooltip = useCallback((e, label) => {
    if (!collapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, y: rect.top + rect.height / 2, visible: true });
  }, [collapsed]);

  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <nav style={{
      width: '100%', height: '100%',
      background: '#08160d',
      display: 'flex', flexDirection: 'column',
      padding: collapsed ? '20px 8px' : '20px 12px',
      gap: 2,
      overflowY: 'auto',
      overflowX: 'hidden',
      transition: 'padding 0.25s cubic-bezier(0.4,0,0.2,1)',
    }}>

      {/* Brand header */}
      <div style={{
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingLeft: collapsed ? 0 : 8,
        overflow: 'hidden',
        minHeight: 36,
      }}>
        {collapsed ? (
          <Icon name="leaf" size={22} color="#22c55e" />
        ) : (
          <>
            <div>
              <div style={{ color: '#22c55e', fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>
                GreenCore
              </div>
              <div style={{ color: '#4b7a56', fontSize: 10, marginTop: 1 }}>AIoT Management</div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, cursor: 'pointer', padding: '5px 6px',
                  display: 'flex', alignItems: 'center',
                  transition: 'background 0.15s',
                }}
              >
                <Icon name="x" size={16} color="#4b7a56" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav items */}
      {visible.map((item, idx) => {
        const active  = screen === item.key;
        const hovered = hoveredKey === item.key;
        return (
          <button
            key={item.key}
            className="nav-item"
            onClick={() => setScreen(item.key)}
            onMouseEnter={e => { setHoveredKey(item.key); showTooltip(e, t(item.labelKey)); }}
            onMouseLeave={() => { setHoveredKey(null); hideTooltip(); }}
            style={{
              '--nav-delay': `${idx * 0.03}s`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 9,
              padding: collapsed ? '10px 0' : '9px 10px',
              borderRadius: 9,
              border: 'none',
              background: active
                ? 'rgba(34,197,94,0.13)'
                : hovered
                  ? 'rgba(34,197,94,0.07)'
                  : 'transparent',
              color: active ? '#22c55e' : hovered ? '#b0ccb4' : '#86a08a',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              position: 'relative',
              transition: 'background 0.18s ease, color 0.18s ease, transform 0.12s ease',
              transform: hovered && !active ? 'translateX(3px)' : 'none',
              overflow: 'visible',
            }}
          >
            {/* Active left-border indicator */}
            <span style={{
              position: 'absolute',
              left: 0, top: '18%', bottom: '18%',
              width: 3,
              background: '#22c55e',
              borderRadius: '0 3px 3px 0',
              opacity: active ? 1 : 0,
              transform: active ? 'scaleY(1)' : 'scaleY(0.4)',
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }} />

            <Icon
              name={item.icon}
              size={16}
              color={active ? '#22c55e' : hovered ? '#b0ccb4' : '#86a08a'}
            />

            {/* Label — collapses with animation */}
            <span style={{
              overflow: 'hidden',
              maxWidth: collapsed ? 0 : 130,
              opacity: collapsed ? 0 : 1,
              whiteSpace: 'nowrap',
              transition: 'max-width 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              letterSpacing: active ? -0.1 : 0,
            }}>
              {t(item.labelKey)}
            </span>

            {/* Alert badge */}
            {item.key === 'alerts' && openAlerts > 0 && (
              <span style={{
                marginLeft: collapsed ? 0 : 'auto',
                background: '#ef4444',
                color: '#fff',
                borderRadius: 10,
                padding: '1px 6px',
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
                lineHeight: 1.6,
                ...(collapsed ? {
                  position: 'absolute', top: 3, right: 3,
                  padding: '1px 4px', fontSize: 9,
                } : {}),
              }}>
                {openAlerts}
              </span>
            )}
          </button>
        );
      })}

      {/* Zone selector */}
      {!collapsed && showZone && (
        <div style={{ marginTop: 14, paddingLeft: 4 }}>
          <div style={{
            color: '#3d6b45', fontSize: 9, letterSpacing: 1, marginBottom: 6,
            paddingLeft: 6, fontWeight: 600,
          }}>
            {t('nav.zones').toUpperCase()}
          </div>
          {zoneOptions.map(z => {
            const zActive = zone === z.zone_id;
            return (
              <button
                key={z.zone_id}
                onClick={() => setZone(z.zone_id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  width: '100%', textAlign: 'left',
                  padding: '6px 10px', borderRadius: 6, border: 'none',
                  background: zActive ? 'rgba(34,197,94,0.13)' : 'transparent',
                  color: zActive ? '#22c55e' : '#6b9b70',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <span style={{
                  width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                  background: zActive ? '#22c55e' : '#3d6b45',
                  transition: 'background 0.15s',
                }} />
                {z.description || z.name}
              </button>
            );
          })}
          {zoneOptions.length === 0 && (
            <div style={{ color: '#3d6b45', fontSize: 11, padding: '6px 10px' }}>
              No active zones
            </div>
          )}
        </div>
      )}

      {/* ── Bottom section ── */}
      <div style={{ marginTop: 'auto', paddingTop: 12 }}>

        {/* Role chip */}
        {!collapsed && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(34,197,94,0.07)',
            border: '1px solid rgba(34,197,94,0.12)',
            borderRadius: 6, padding: '3px 9px',
            marginBottom: 8, marginLeft: 4,
          }}>
            <span style={{
              width: 5, height: 5, background: '#22c55e',
              borderRadius: '50%', display: 'inline-block',
            }} />
            <span style={{ color: '#4b7a56', fontSize: 10, fontWeight: 600, letterSpacing: 0.8 }}>
              {role?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Settings */}
        <NavBottomBtn
          icon="settings"
          label={t('nav.settings')}
          active={screen === 'settings'}
          hovered={hoveredKey === 'settings'}
          collapsed={collapsed}
          onClick={() => setScreen('settings')}
          onMouseEnter={e => { setHoveredKey('settings'); showTooltip(e, t('nav.settings')); }}
          onMouseLeave={() => { setHoveredKey(null); hideTooltip(); }}
        />

        {/* Logout */}
        <button
          onClick={onLogout}
          onMouseEnter={() => setHoveredKey('logout')}
          onMouseLeave={() => setHoveredKey(null)}
          style={{
            width: '100%', marginTop: 6,
            background: hoveredKey === 'logout' ? 'rgba(239,68,68,0.1)' : 'transparent',
            border: `1px solid ${hoveredKey === 'logout' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 7,
            padding: collapsed ? '9px 8px' : '8px 12px',
            color: hoveredKey === 'logout' ? '#ef4444' : '#6b7a6e',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8,
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          }}
          title={collapsed ? t('nav.logout') : undefined}
        >
          <Icon name="logout" size={14} color={hoveredKey === 'logout' ? '#ef4444' : '#6b7a6e'} />
          <span style={{
            overflow: 'hidden',
            maxWidth: collapsed ? 0 : 120,
            opacity: collapsed ? 0 : 1,
            whiteSpace: 'nowrap',
            transition: 'max-width 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
          }}>
            {t('nav.logout')}
          </span>
        </button>

        {/* Collapse toggle (desktop only) */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            onMouseEnter={() => setHoveredKey('toggle')}
            onMouseLeave={() => setHoveredKey(null)}
            title={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
            style={{
              width: '100%', marginTop: 2,
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              padding: '10px 8px 4px',
              color: hoveredKey === 'toggle' ? '#6b9b70' : '#3d6b45',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              gap: 5, fontSize: 10,
              transition: 'color 0.15s',
            }}
          >
            <Icon
              name={collapsed ? 'chevronRight' : 'chevronLeft'}
              size={13}
              color={hoveredKey === 'toggle' ? '#6b9b70' : '#3d6b45'}
            />
            {!collapsed && (
              <span style={{ letterSpacing: 0.3 }}>⌘B</span>
            )}
          </button>
        )}
      </div>

      {/* Floating tooltip for collapsed mode */}
      {collapsed && tooltip.visible && (
        <div style={{
          position: 'fixed',
          left: SIDEBAR_MINI_W + 10,
          top: tooltip.y,
          transform: 'translateY(-50%)',
          background: '#1a2d1f',
          color: '#d4edd8',
          border: '1px solid #2a4a30',
          padding: '5px 12px',
          borderRadius: 7,
          fontSize: 12, fontWeight: 600,
          whiteSpace: 'nowrap',
          zIndex: 300,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
          animation: 'tooltipIn 0.15s ease forwards',
        }}>
          {tooltip.label}
        </div>
      )}
    </nav>
  );
}

// Small reusable component to avoid repeating settings/logout button styles
function NavBottomBtn({ icon, label, active, hovered, collapsed, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 9, width: '100%',
        padding: collapsed ? '10px 0' : '9px 10px',
        borderRadius: 9, border: 'none',
        background: active
          ? 'rgba(34,197,94,0.13)'
          : hovered
            ? 'rgba(34,197,94,0.07)'
            : 'transparent',
        color: active ? '#22c55e' : hovered ? '#b0ccb4' : '#86a08a',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        position: 'relative',
        transition: 'background 0.18s ease, color 0.18s ease',
      }}
    >
      <span style={{
        position: 'absolute', left: 0, top: '18%', bottom: '18%',
        width: 3, background: '#22c55e', borderRadius: '0 3px 3px 0',
        opacity: active ? 1 : 0,
        transform: active ? 'scaleY(1)' : 'scaleY(0.4)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }} />
      <Icon name={icon} size={16} color={active ? '#22c55e' : hovered ? '#b0ccb4' : '#86a08a'} />
      <span style={{
        overflow: 'hidden',
        maxWidth: collapsed ? 0 : 130,
        opacity: collapsed ? 0 : 1,
        whiteSpace: 'nowrap',
        transition: 'max-width 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
      }}>
        {label}
      </span>
    </button>
  );
}
