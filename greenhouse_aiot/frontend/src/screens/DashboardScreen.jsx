import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi, usePolling } from '../hooks/useApi';
import { Icon } from '../ui/icons';
import { getOpenAlerts, getDevices, getZones, getCrops, getDeviceReadings } from '../api';
import { Card, Badge, LineChart, PageHeader, STATUS_COLOR, SEV_COLOR } from '../ui';
import { ResponsiveGrid } from '../components/ResponsiveGrid.jsx';

// ── Constants ─────────────────────────────────────────────────────────────────
const METRICS = [
  { key: 'temp',  labelKey: 'sensors.temperature', unit: '°C',  color: '#f59e0b', icon: 'temp',     dataKey: 'temperature' },
  { key: 'hum',   labelKey: 'sensors.humidity',    unit: '%',   color: '#3b82f6', icon: 'humidity',  dataKey: 'humidity'    },
  { key: 'light', labelKey: 'sensors.light',       unit: 'lux', color: '#eab308', icon: 'light',     dataKey: 'light_lux'   },
  { key: 'co2',   labelKey: 'sensors.co2',         unit: 'ppm', color: '#8b5cf6', icon: 'co2',       dataKey: 'co2_ppm'     },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const s = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Inline SVG sparkline — no extra dependencies */
function Sparkline({ values, color }) {
  const pts = (values || []).filter(v => v != null);
  if (pts.length < 2) return <div style={{ width: 64, height: 32 }} />;
  const slice = pts.slice(-10);
  const min = Math.min(...slice), max = Math.max(...slice);
  const range = max - min || 1;
  const W = 64, H = 32;
  const coords = slice
    .map((v, i, arr) => {
      const x = (i / (arr.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const last = slice[slice.length - 1];
  const lx = W;
  const ly = H - ((last - min) / range) * (H - 6) - 3;
  return (
    <svg width={W} height={H} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline points={coords} fill="none" stroke={color}
        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
      <circle cx={lx} cy={ly} r={2.5} fill={color} />
    </svg>
  );
}

/** Single sensor metric card with sparkline and trend */
function MetricCard({ metric, value, prev, values, t }) {
  const trend = value != null && prev != null ? value - prev : null;
  const trendUp = trend > 0;
  const hasData = value != null;

  return (
    <Card
      data-testid="sensor-card"
      className="sensor-card"
      style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}
    >
      {/* Colored top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: metric.color, borderRadius: '12px 12px 0 0', opacity: 0.85,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Icon + label row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              background: metric.color + '1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name={metric.icon} size={13} color={metric.color} />
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: 0.7 }}>
              {t(metric.labelKey).toUpperCase()}
            </span>
          </div>

          {/* Value */}
          <div style={{ fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
            <span style={{
              fontSize: 28, fontWeight: 700,
              color: hasData ? 'var(--text-primary)' : 'var(--text-muted)',
            }}>
              {hasData ? Number(value).toFixed(1) : '—'}
            </span>
            {hasData && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>
                {metric.unit}
              </span>
            )}
          </div>

          {/* Trend */}
          {trend !== null && Math.abs(trend) > 0.05 && (
            <div style={{
              marginTop: 5, fontSize: 10, fontWeight: 600,
              color: trendUp ? '#f97316' : '#22c55e',
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              {trendUp ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}{metric.unit}
            </div>
          )}
        </div>

        {/* Sparkline */}
        <div style={{ paddingTop: 2 }}>
          <Sparkline values={values} color={metric.color} />
        </div>
      </div>
    </Card>
  );
}

/** Summary KPI chip */
function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: color + '1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={icon} size={15} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/** Individual crop progress card */
function CropCard({ crop: c, t }) {
  const statusColor = STATUS_COLOR[c.status] || '#6b7280';
  const pctColor    = c.pct >= 100 ? '#3b82f6' : '#22c55e';

  return (
    <div style={{
      background: 'var(--bg-card-alt)', borderRadius: 10,
      padding: '12px 14px', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, minWidth: 0 }}>
          {c.crop_type?.name || 'Unknown'}
        </div>
        <Badge label={c.status} color={statusColor} />
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
        {c.batch_code} · {c.quantity} {t('dashboard.units')}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: 'var(--text-muted)', marginBottom: 4,
        }}>
          <span style={{ fontWeight: 600 }}>{c.pct}%</span>
          <span>{c.daysLeft > 0 ? `${c.daysLeft}d left` : 'Complete'}</span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${c.pct}%`,
            background: `linear-gradient(90deg, ${pctColor}88, ${pctColor})`,
            borderRadius: 3, transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DashboardScreen({ zone }) {
  const { t } = useTranslation();
  const [chartMetric, setChartMetric] = useState('temp');

  const { data: zones }      = useApi(getZones, []);
  const { data: openAlerts } = usePolling(getOpenAlerts, 30000);
  const { data: devices }    = useApi(getDevices, []);

  const currentZone     = zones?.find(z => z.zone_id === zone) || zones?.[0];
  const currentZoneId   = currentZone?.zone_id;
  const deviceForZone   = devices?.find(d => d.zone?.zone_id === currentZoneId);
  const deviceIdForZone = deviceForZone?.device_id;
  const onlineDevices   = useMemo(
    () => (Array.isArray(devices) ? devices.filter(d => d.status === 'online') : []),
    [devices]
  );

  const { data: crops } = useApi(
    () => getCrops({ zone_id: currentZoneId }),
    [currentZoneId],
    { autoFetch: !!currentZoneId, initialData: [] }
  );

  const { data: srData } = useApi(
    () => getDeviceReadings(deviceIdForZone, { limit: 24 }),
    [deviceIdForZone],
    { autoFetch: !!deviceIdForZone }
  );
  const sr = useMemo(() => srData || [], [srData]);

  const latest = sr[0] || {};
  const prev   = sr[1] || {};

  const cs = {
    temp:  latest.temperature,
    hum:   latest.humidity,
    ph:    latest.ph,
    light: latest.light_lux,
    co2:   latest.co2_ppm,
  };
  const prevVals = {
    temp:  prev.temperature,
    hum:   prev.humidity,
    light: prev.light_lux,
    co2:   prev.co2_ppm,
  };

  const alertList = useMemo(() => Array.isArray(openAlerts) ? openAlerts : [], [openAlerts]);
  const cropList  = useMemo(() => Array.isArray(crops)      ? crops      : [], [crops]);
  const [now]     = useState(() => Date.now());

  const sparkValues = useMemo(() => ({
    temp:  sr.map(r => r.temperature),
    hum:   sr.map(r => r.humidity),
    light: sr.map(r => r.light_lux),
    co2:   sr.map(r => r.co2_ppm),
  }), [sr]);

  const cropsWithProgress = useMemo(() => cropList.map(c => {
    const daysElapsed = Math.floor((now - new Date(c.planted_at)) / 86400000);
    const growthDays  = c.crop_type?.growth_days || 60;
    const daysLeft    = Math.max(0, growthDays - daysElapsed);
    const pct         = Math.min(100, Math.round((daysElapsed / growthDays) * 100));
    return { ...c, daysElapsed, daysLeft, pct };
  }), [cropList, now]);

  const zoneLabel   = currentZone?.description || currentZone?.name
    || (currentZoneId != null ? `Zone ${currentZoneId}` : '—');
  const lastUpdated = latest.recorded_at ? timeAgo(latest.recorded_at) : null;
  const activeCrops = cropsWithProgress.filter(c => c.status !== 'harvested' && c.status !== 'failed');

  // Chart config
  const activeMetric   = METRICS.find(m => m.key === chartMetric);
  const chartLabels    = sr.map(r =>
    new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const chartDatasets  = [{
    label: t(activeMetric.labelKey),
    data:  sr.map(r => r[activeMetric.dataKey]),
    color: activeMetric.color,
  }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <PageHeader
        title={t('dashboard.title')}
        subtitle={lastUpdated
          ? `${zoneLabel} · Updated ${lastUpdated}`
          : `${zoneLabel} · ${t('dashboard.liveData')}`}
      >
        {deviceForZone && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: deviceForZone.status === 'online'
              ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
            border: `1px solid ${deviceForZone.status === 'online'
              ? 'rgba(34,197,94,0.22)' : 'rgba(107,114,128,0.2)'}`,
            borderRadius: 20, padding: '4px 12px',
            fontSize: 11, fontWeight: 600,
            color: deviceForZone.status === 'online' ? '#22c55e' : 'var(--text-muted)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: deviceForZone.status === 'online' ? '#22c55e' : '#6b7280',
              ...(deviceForZone.status === 'online'
                ? { animation: 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite' }
                : {}),
            }} />
            {deviceForZone.name || deviceForZone.serial_number}
          </div>
        )}
        {alertList.length > 0 && (
          <span style={{
            background: 'var(--danger-bg)', color: 'var(--danger-text)',
            border: '1px solid var(--danger-border)',
            borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
          }}>
            {alertList.length} {t('dashboard.openAlerts')}
          </span>
        )}
      </PageHeader>

      {/* ── KPI summary row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        <StatCard
          icon="devices"
          value={devices ? `${onlineDevices.length}/${devices.length}` : '—'}
          label="Devices online"
          color={
            !devices ? '#6b7280'
            : onlineDevices.length === devices.length ? '#22c55e'
            : onlineDevices.length > 0 ? '#f59e0b'
            : '#ef4444'
          }
        />
        <StatCard
          icon="sensors"
          value={lastUpdated || '—'}
          label="Last reading"
          color="#3b82f6"
        />
        <StatCard
          icon="crops"
          value={activeCrops.length}
          label="Active crops"
          color="#22c55e"
        />
        <StatCard
          icon="alerts"
          value={alertList.length}
          label="Open alerts"
          color={alertList.length > 0 ? '#ef4444' : '#22c55e'}
        />
      </div>

      {/* ── Metric cards with sparklines ── */}
      <ResponsiveGrid min={220} gap={14}>
        {METRICS.map(m => (
          <MetricCard
            key={m.key}
            metric={m}
            value={cs[m.key]}
            prev={prevVals[m.key]}
            values={sparkValues[m.key]}
            t={t}
          />
        ))}
      </ResponsiveGrid>

      {/* ── Chart + Alerts ── */}
      <div className="two-panel two-panel--asymmetric">

        {/* Chart with metric tabs */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: 8,
          }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
              {t('dashboard.sensorHistory')}
            </span>
            {/* Metric tabs */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexShrink: 1, paddingBottom: 2 }}>
              {METRICS.map(m => {
                const active = chartMetric === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setChartMetric(m.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 20, border: 'none',
                      background: active ? m.color + '20' : 'transparent',
                      color: active ? m.color : 'var(--text-muted)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit',
                      outline: active ? `1px solid ${m.color}44` : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon name={m.icon} size={11} color={active ? m.color : 'var(--text-muted)'} />
                    {t(m.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
          {sr.length > 0
            ? <LineChart labels={chartLabels} datasets={chartDatasets} height={210} />
            : (
              <div style={{
                color: 'var(--text-muted)', fontSize: 12, textAlign: 'center',
                padding: '60px 0', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8,
              }}>
                <Icon name="sensors" size={24} color="var(--text-muted)" />
                {t('dashboard.noReadings')}
              </div>
            )
          }
        </Card>

        {/* Alerts panel */}
        <Card>
          <div style={{
            fontWeight: 600, fontSize: 13, color: 'var(--text-primary)',
            marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>{t('dashboard.openAlerts')}</span>
            {alertList.length > 0 && (
              <span style={{
                background: '#ef444420', color: '#ef4444', border: '1px solid #ef444430',
                fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 7px',
              }}>
                {alertList.length}
              </span>
            )}
          </div>

          {alertList.length === 0 ? (
            <div style={{
              color: 'var(--text-muted)', fontSize: 12, textAlign: 'center',
              padding: '28px 0', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6,
            }}>
              <Icon name="checkCircle" size={22} color="#22c55e" />
              <span>{t('dashboard.noOpenAlerts')}</span>
            </div>
          ) : alertList.slice(0, 6).map((a, i) => (
            <div key={a.alert_id} style={{
              padding: '9px 0',
              borderBottom: i < Math.min(alertList.length, 6) - 1
                ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              {/* Severity dot */}
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: SEV_COLOR[a.severity] || '#6b7280', marginTop: 5,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {a.alert_type}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                  <Badge label={a.severity} color={SEV_COLOR[a.severity] || '#6b7280'} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {timeAgo(a.created_at)}
                  </span>
                </div>
                {a.measured_value != null && (
                  <div style={{
                    fontSize: 10, color: 'var(--text-secondary)', marginTop: 2,
                    fontFamily: "'DM Mono', monospace",
                  }}>
                    {Number(a.measured_value).toFixed(1)}
                    {a.threshold_value != null && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {' '}/ {Number(a.threshold_value).toFixed(1)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* ── Active crops ── */}
      <Card>
        <div style={{
          fontWeight: 600, fontSize: 13, color: 'var(--text-primary)',
          marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{t('dashboard.activeCrops')}</span>
          {cropList.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
              {activeCrops.length} active · {cropList.length} total
            </span>
          )}
        </div>

        {cropList.length === 0 ? (
          <div style={{
            color: 'var(--text-muted)', fontSize: 12, textAlign: 'center',
            padding: '20px 0', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 6,
          }}>
            <Icon name="crops" size={22} color="var(--text-muted)" />
            {t('dashboard.noCropsZone')}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 12,
          }}>
            {cropsWithProgress.map(c => (
              <CropCard key={c.crop_id} crop={c} t={t} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
