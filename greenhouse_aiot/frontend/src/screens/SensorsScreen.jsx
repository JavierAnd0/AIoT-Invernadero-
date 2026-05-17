import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { getDevices, getDeviceReadings } from '../api';
import { Card, Select, LineChart, LoadingSpinner, ErrorBanner, PageHeader } from '../ui';
import { Icon } from '../ui/icons';

// ── Constants ─────────────────────────────────────────────────────────────────
const METRICS = [
  { key: 'temperature', labelKey: 'sensors.temperature', unit: '°C',   color: '#f59e0b', icon: 'temp',     label: 'Temp' },
  { key: 'humidity',    labelKey: 'sensors.humidity',    unit: '%',    color: '#3b82f6', icon: 'humidity', label: 'Humedad' },
  { key: 'light_lux',  labelKey: 'sensors.light',       unit: ' lux', color: '#eab308', icon: 'light',    label: 'Luz' },
  { key: 'co2_ppm',    labelKey: 'sensors.co2',         unit: ' ppm', color: '#8b5cf6', icon: 'co2',      label: 'CO₂' },
];

const LIMIT_OPTIONS = [
  { label: '30', value: 30 },
  { label: '60', value: 60 },
  { label: '100', value: 100 },
];

const TABLE_COLS = [
  { key: 'timestamp',     label: 'Timestamp',  mono: true, dim: true },
  { key: 'temperature',   label: 'Temp °C',    color: '#f59e0b' },
  { key: 'humidity',      label: 'Hum %',      color: '#3b82f6' },
  { key: 'light_lux',     label: 'Luz lux',    color: '#eab308' },
  { key: 'co2_ppm',       label: 'CO₂ ppm',    color: '#8b5cf6' },
  { key: 'soil_moisture', label: 'Suelo %',    color: '#22c55e' },
  { key: 'ph',            label: 'pH',          color: '#ec4899' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

/** Summary stat chip: current value + min/max for the period */
function MetricStat({ metric, readings }) {
  const vals = readings.map(r => r[metric.key]).filter(v => v != null);
  const current = vals[0] ?? null;
  const min = vals.length ? Math.min(...vals) : null;
  const max = vals.length ? Math.max(...vals) : null;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderTop: `3px solid ${metric.color}`,
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 6,
      flex: 1, minWidth: 140,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: metric.color + '1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={metric.icon} size={12} color={metric.color} />
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.7,
        }}>
          {metric.label.toUpperCase()}
        </span>
      </div>

      <div style={{ fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
        <span style={{
          fontSize: 26, fontWeight: 700,
          color: current != null ? 'var(--text-primary)' : 'var(--text-muted)',
        }}>
          {current != null ? Number(current).toFixed(1) : '—'}
        </span>
        {current != null && (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 3 }}>
            {metric.unit}
          </span>
        )}
      </div>

      {min != null && (
        <div style={{
          display: 'flex', gap: 10, fontSize: 10,
          color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace",
        }}>
          <span style={{ color: '#3b82f6' }}>↓ {Number(min).toFixed(1)}</span>
          <span style={{ color: '#f59e0b' }}>↑ {Number(max).toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

/** Chart card with colored accent border and current value in header */
function ChartCard({ metric, labels, readings }) {
  const vals = readings.map(r => r[metric.key]).filter(v => v != null);
  const current = vals[0] ?? null;
  const min = vals.length ? Math.min(...vals) : null;
  const max = vals.length ? Math.max(...vals) : null;

  return (
    <Card style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Card header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: metric.color + '1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name={metric.icon} size={14} color={metric.color} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              {metric.label} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>{metric.unit}</span>
            </div>
            {min != null && (
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", marginTop: 1 }}>
                <span style={{ color: '#3b82f6' }}>↓{Number(min).toFixed(1)}</span>
                {' '}
                <span style={{ color: '#f59e0b' }}>↑{Number(max).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Current value badge */}
        {current != null && (
          <div style={{
            background: metric.color + '15',
            border: `1px solid ${metric.color}30`,
            borderRadius: 8, padding: '3px 10px',
            fontFamily: "'DM Mono', monospace",
            fontSize: 13, fontWeight: 700, color: metric.color,
          }}>
            {Number(current).toFixed(1)}{metric.unit}
          </div>
        )}
      </div>

      {/* Chart */}
      <LineChart
        labels={labels}
        datasets={[{
          label: metric.label,
          data: readings.map(r => r[metric.key]),
          color: metric.color,
        }]}
        height={160}
        pointRadius={0}
        tension={0.35}
        fill
      />
    </Card>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SensorsScreen({ zone }) {
  const { t } = useTranslation();
  const [limit, setLimit] = useState(60);

  const { data: devices, loading: dLoading } = useApi(
    () => getDevices(zone ? { zone_id: zone } : {}),
    [zone]
  );
  const [selectedDevice, setSelectedDevice] = useState(null);
  const deviceList = useMemo(() => Array.isArray(devices) ? devices : [], [devices]);
  const deviceId = useMemo(() => {
    if (!deviceList.length) return null;
    if (deviceList.some(d => d.device_id === selectedDevice)) return selectedDevice;
    return deviceList[0]?.device_id ?? null;
  }, [selectedDevice, deviceList]);

  const { data: readings, loading: rLoading, error: rError } = useApi(
    () => getDeviceReadings(deviceId, { limit }),
    [deviceId, limit],
    { autoFetch: !!deviceId }
  );
  const sr = useMemo(() => Array.isArray(readings) ? readings : [], [readings]);

  const labels = useMemo(
    () => sr.map(r =>
      new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ),
    [sr]
  );

  const currentDevice = deviceList.find(d => d.device_id === deviceId);

  if (dLoading) return <LoadingSpinner text={t('sensors.loadingDevices')} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <PageHeader
        title={t('sensors.title')}
        subtitle={t('sensors.historicalReadings')}
      >
        {/* Limit filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {LIMIT_OPTIONS.map(o => {
            const active = limit === o.value;
            return (
              <button
                key={o.value}
                onClick={() => setLimit(o.value)}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: active ? '#22c55e20' : 'var(--bg-card)',
                  color: active ? '#22c55e' : 'var(--text-secondary)',
                  outline: active ? '1px solid #22c55e44' : '1px solid var(--border)',
                  fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
              >
                {o.label} pts
              </button>
            );
          })}
        </div>

        {/* Device selector */}
        <Select
          label=""
          value={deviceId || ''}
          options={deviceList.map(d => ({ value: d.device_id, label: d.name || d.serial_number }))}
          onChange={e => setSelectedDevice(Number(e.target.value))}
        />
      </PageHeader>

      <ErrorBanner message={rError} />
      {!dLoading && deviceList.length === 0 && <ErrorBanner message={t('sensors.noDevicesMsg')} />}

      {deviceList.length > 0 && (
        <>
          {/* ── Device status badge ── */}
          {currentDevice && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: currentDevice.status === 'online' ? 'rgba(34,197,94,0.08)' : 'rgba(107,114,128,0.08)',
                border: `1px solid ${currentDevice.status === 'online' ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.18)'}`,
                borderRadius: 20, padding: '4px 12px',
                fontSize: 11, fontWeight: 600,
                color: currentDevice.status === 'online' ? '#22c55e' : 'var(--text-muted)',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: currentDevice.status === 'online' ? '#22c55e' : '#6b7280',
                  ...(currentDevice.status === 'online'
                    ? { animation: 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite' }
                    : {}),
                }} />
                {currentDevice.name || currentDevice.serial_number}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>·</span>
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>
                  {sr.length} lecturas
                </span>
              </div>
            </div>
          )}

          {/* ── Metric summary row ── */}
          {!rLoading && sr.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {METRICS.map(m => (
                <MetricStat key={m.key} metric={m} readings={sr} />
              ))}
            </div>
          )}

          {/* ── Charts 2×2 ── */}
          {rLoading ? (
            <LoadingSpinner text={t('sensors.loadingReadings')} />
          ) : sr.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 16,
            }}>
              {METRICS.map(m => (
                <ChartCard key={m.key} metric={m} labels={labels} readings={sr} />
              ))}
            </div>
          ) : (
            <Card>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 8, padding: '40px 0', color: 'var(--text-muted)', fontSize: 13,
              }}>
                <Icon name="sensors" size={28} color="var(--text-muted)" />
                {t('sensors.noReadings', 'Sin lecturas para este dispositivo')}
              </div>
            </Card>
          )}

          {/* ── Raw readings table (full-width) ── */}
          {!rLoading && sr.length > 0 && (
            <Card style={{ padding: '18px 20px' }}>
              <div style={{
                fontWeight: 600, fontSize: 13, color: 'var(--text-primary)',
                marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{t('sensors.rawReadings')}</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
                  {sr.length} registros
                </span>
              </div>

              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card-alt)' }}>
                      {TABLE_COLS.map(col => (
                        <th key={col.key} style={{
                          padding: '8px 14px', textAlign: 'left',
                          color: col.color || 'var(--text-secondary)',
                          fontWeight: 700, fontSize: 10, letterSpacing: 0.5,
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sr.map((r, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Timestamp */}
                        <td style={{
                          padding: '7px 14px',
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 11, color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                        }}>
                          {new Date(r.recorded_at).toLocaleString([], {
                            month: 'numeric', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          })}
                        </td>
                        {/* Metric values */}
                        {[r.temperature, r.humidity, r.light_lux, r.co2_ppm, r.soil_moisture, r.ph].map((v, j) => {
                          const col = TABLE_COLS[j + 1];
                          return (
                            <td key={j} style={{
                              padding: '7px 14px',
                              fontFamily: "'DM Mono', monospace",
                              fontSize: 12,
                              color: v != null ? (col.color || 'var(--text-primary)') : 'var(--text-muted)',
                              fontWeight: v != null ? 600 : 400,
                            }}>
                              {v != null ? Number(v).toFixed(1) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
