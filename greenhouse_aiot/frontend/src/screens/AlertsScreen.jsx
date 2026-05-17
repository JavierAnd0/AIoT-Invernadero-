import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { getAlerts, acknowledgeAlert, resolveAlert } from '../api';
import { Badge, Btn, LoadingSpinner, ErrorBanner, PageHeader, SEV_COLOR } from '../ui';
import { Icon } from '../ui/icons';

// ── Maps ──────────────────────────────────────────────────────────────────────
const ALERT_META = {
  temperature:    { label: 'Temperatura',         icon: 'temp',     unit: '°C'   },
  humidity:       { label: 'Humedad aire',         icon: 'humidity', unit: '%'    },
  co2:            { label: 'CO₂',                 icon: 'co2',      unit: ' ppm' },
  light:          { label: 'Luz solar',            icon: 'light',    unit: ' lux' },
  soil_moisture:  { label: 'Humedad sustrato',     icon: 'humidity', unit: '%'    },
  ph:             { label: 'pH',                   icon: 'leaf',     unit: ''     },
  device_offline: { label: 'Dispositivo offline',  icon: 'devices',  unit: ''     },
};

const STATUS_META = {
  open:         { label: 'Abierta',     color: '#ef4444' },
  acknowledged: { label: 'Reconocida', color: '#f59e0b' },
  resolved:     { label: 'Resuelta',   color: '#22c55e' },
};

const SEV_META = {
  critical: { label: 'Crítica', color: '#ef4444', bg: 'rgba(239,68,68,0.06)'  },
  high:     { label: 'Alta',    color: '#f97316', bg: 'rgba(249,115,22,0.06)' },
  medium:   { label: 'Media',   color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
  low:      { label: 'Baja',    color: '#3b82f6', bg: 'rgba(59,130,246,0.06)' },
};

const STATUS_FILTERS = [
  { key: 'all',          label: 'Todas'      },
  { key: 'open',         label: 'Abiertas'   },
  { key: 'acknowledged', label: 'Reconocidas'},
  { key: 'resolved',     label: 'Resueltas'  },
];

const SEV_ORDER = ['critical', 'high', 'medium', 'low'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return 'ahora';
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr} h`;
  return `${Math.floor(hr / 24)} d`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Summary count chips by severity (open alerts only) */
function SeveritySummary({ alerts }) {
  const openAlerts = alerts.filter(a => a.status === 'open');
  if (!openAlerts.length) return null;

  const counts = SEV_ORDER.reduce((acc, sev) => {
    acc[sev] = openAlerts.filter(a => a.severity === sev).length;
    return acc;
  }, {});

  const active = Object.entries(counts).filter(([, n]) => n > 0);
  if (!active.length) return null;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {active.map(([sev, count]) => {
        const meta = SEV_META[sev] || {};
        return (
          <div key={sev} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: meta.bg, border: `1px solid ${meta.color}30`,
            borderRadius: 8, padding: '7px 12px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{count}</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{meta.label}</span>
          </div>
        );
      })}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '7px 12px',
      }}>
        <Icon name="alerts" size={12} color="var(--text-muted)" />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{openAlerts.length} abiertas</span>
      </div>
    </div>
  );
}

/** Individual alert row card */
function AlertCard({ alert: a, onAck, onResolve }) {
  const meta   = ALERT_META[a.alert_type] || { label: a.alert_type, icon: 'alertCircle', unit: '' };
  const sev    = SEV_META[a.severity]  || { color: '#6b7280', bg: 'transparent' };
  const status = STATUS_META[a.status] || { label: a.status,  color: '#6b7280'  };

  const hasValues = a.measured_value != null;
  const hasThresh = a.threshold_value != null;

  // Value-vs-threshold bar (capped 0-150% of threshold for visual)
  const barPct = hasValues && hasThresh
    ? Math.min(150, Math.round((a.measured_value / a.threshold_value) * 100))
    : null;
  const barColor = barPct == null ? sev.color
    : barPct > 120 ? '#ef4444'
    : barPct > 100 ? '#f97316'
    : '#22c55e';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${sev.color}`,
      borderRadius: 10,
      padding: '14px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 14,
      transition: 'box-shadow 0.15s',
    }}>
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: sev.color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        <Icon name={meta.icon} size={16} color={sev.color} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {meta.label}
          </span>
          {/* Severity badge */}
          <span style={{
            background: sev.color + '20', color: sev.color,
            border: `1px solid ${sev.color}40`,
            borderRadius: 20, padding: '1px 8px',
            fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
          }}>
            {sev.label || a.severity}
          </span>
          {/* Status badge */}
          <span style={{
            background: status.color + '18', color: status.color,
            border: `1px solid ${status.color}30`,
            borderRadius: 20, padding: '1px 8px',
            fontSize: 10, fontWeight: 600,
          }}>
            {status.label}
          </span>
          {/* Time */}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {timeAgo(a.created_at)}
          </span>
        </div>

        {/* Message */}
        {a.message && (
          <div style={{
            fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8,
            lineHeight: 1.4,
          }}>
            {a.message}
          </div>
        )}

        {/* Value vs threshold */}
        {hasValues && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.5 }}>VALOR</span>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 13, fontWeight: 700, color: sev.color,
              }}>
                {Number(a.measured_value).toFixed(1)}{meta.unit}
              </span>
            </div>
            {hasThresh && (
              <>
                <span style={{ color: 'var(--border)', fontSize: 14 }}>→</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.5 }}>UMBRAL</span>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
                  }}>
                    {Number(a.threshold_value).toFixed(1)}{meta.unit}
                  </span>
                </div>
                {/* Mini bar */}
                <div style={{ flex: 1, minWidth: 60, maxWidth: 100 }}>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, barPct ?? 0)}%`,
                      background: barColor,
                      borderRadius: 2, transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {(a.status === 'open' || a.status === 'acknowledged') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          {a.status === 'open' && (
            <Btn
              variant="ghost"
              onClick={() => onAck(a.alert_id)}
              style={{ fontSize: 11, padding: '5px 12px', whiteSpace: 'nowrap' }}
            >
              Reconocer
            </Btn>
          )}
          <Btn
            variant="secondary"
            onClick={() => onResolve(a.alert_id)}
            style={{ fontSize: 11, padding: '5px 12px', whiteSpace: 'nowrap' }}
          >
            Resolver
          </Btn>
        </div>
      )}

      {a.status === 'resolved' && (
        <div style={{ flexShrink: 0, paddingTop: 2 }}>
          <Icon name="checkCircle" size={18} color="#22c55e" />
        </div>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AlertsScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  const { data: alertsData, loading, error, refetch } = useApi(
    () => getAlerts(filter !== 'all' ? { status: filter } : undefined),
    [filter]
  );

  const alerts = useMemo(() => {
    const list = alertsData?.alerts || alertsData;
    if (Array.isArray(list)) return list;
    if (list) return [list];
    return [];
  }, [alertsData]);

  // Sort: open first, then by severity, then by date
  const sorted = useMemo(() => {
    const statusOrder = { open: 0, acknowledged: 1, resolved: 2 };
    return [...alerts].sort((a, b) => {
      const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (so !== 0) return so;
      const ao = SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity);
      if (ao !== 0) return ao;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [alerts]);

  async function ack(id)     { await acknowledgeAlert(id); refetch(); }
  async function resolve(id) { await resolveAlert(id);     refetch(); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <PageHeader
        title={t('alerts.title')}
        subtitle={`${alerts.length} ${t('alerts.title').toLowerCase()}`}
      >
        <div className="filter-tabs">
          {STATUS_FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: active ? '#22c55e' : 'var(--bg-card)',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  outline: active ? 'none' : '1px solid var(--border)',
                  fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PageHeader>

      <ErrorBanner message={error} />
      {loading && <LoadingSpinner />}

      {/* ── Severity summary (open alerts only) ── */}
      {!loading && <SeveritySummary alerts={alerts} />}

      {/* ── Alert list ── */}
      {!loading && (
        sorted.length === 0
          ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '60px 0', color: 'var(--text-muted)', fontSize: 13,
            }}>
              <Icon name="checkCircle" size={28} color="#22c55e" />
              <span>No hay alertas{filter !== 'all' ? ` ${STATUS_FILTERS.find(f => f.key === filter)?.label.toLowerCase()}` : ''}</span>
            </div>
          )
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map(a => (
                <AlertCard key={a.alert_id} alert={a} onAck={ack} onResolve={resolve} />
              ))}
            </div>
          )
      )}
    </div>
  );
}
