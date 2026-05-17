import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi, usePolling } from '../hooks/useApi';

function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} days ago`;
}
import { Icon } from '../ui/icons';
import {
  getOpenAlerts, getDevices, getZones,
  getCrops, getDeviceReadings,
} from '../api';
import { Card, Badge, LineChart, STATUS_COLOR, SEV_COLOR } from '../ui';
import { ResponsiveGrid } from '../components/ResponsiveGrid.jsx';

const METRIC = [
  { key: 'temp',  labelKey: 'sensors.temperature', unit: '°C', color: '#f59e0b', icon: 'temp' },
  { key: 'hum',   labelKey: 'sensors.humidity',   unit: '%',  color: '#3b82f6', icon: 'humidity' },
  { key: 'light', labelKey: 'sensors.light',     unit: 'lux',color: '#eab308', icon: 'light' },
  { key: 'co2',  labelKey: 'sensors.co2',       unit: 'ppm',color: '#8b5cf6', icon: 'co2' },
];

export default function DashboardScreen({ zone }) {
  const { t } = useTranslation();
  // Simple responsive behavior based on window width
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const { data: zones }          = useApi(getZones, []);
  const { data: openAlerts }     = usePolling(getOpenAlerts, 30000);
  const { data: devices }        = useApi(getDevices, []);

  const currentZone = zones?.find(z => z.zone_id === zone) || zones?.[0];
  const currentZoneId = currentZone?.zone_id;
  const deviceForZone = devices?.find(d => d.zone?.zone_id === currentZoneId);
  const deviceIdForZone = deviceForZone?.device_id;

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
  const sr = srData || [];

  const rawReading = sr[0] || {};
  const cs = {
    temp:  rawReading.temperature,
    hum:   rawReading.humidity,
    ph:    rawReading.ph,
    light: rawReading.light_lux,
    co2:   rawReading.co2_ppm,
  };

  const alertList = Array.isArray(openAlerts) ? openAlerts : [];
  const cropList  = useMemo(() => Array.isArray(crops) ? crops : [], [crops]);
  const zoneLabel = currentZone?.description
    || currentZone?.name
    || (currentZoneId != null ? `Zone ${currentZoneId}` : 'Selected zone');

  const chartLabels = sr.map(r => new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const chartDatasets = [
    { label: t('sensors.colTemp'), data: sr.map(r => r.temperature), color: '#f59e0b' },
    { label: t('sensors.colHumidity'), data: sr.map(r => r.humidity), color: '#3b82f6' },
  ];
  const [now] = useState(() => Date.now());

  const cropListWithProgress = useMemo(() => {
    return cropList.map(c => {
      const daysElapsed = Math.floor((now - new Date(c.planted_at)) / 86400000);
      const growthDays = c.crop_type?.growth_days || 60;
      const daysLeft = Math.max(0, growthDays - daysElapsed);
      const pct = Math.min(100, Math.round((daysElapsed / growthDays) * 100));
      return { ...c, daysElapsed, daysLeft, pct };
    });
  }, [cropList, now]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.title')}</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
            {zoneLabel} · {t('dashboard.liveData')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {alertList.length > 0 && (
            <span style={{
              background: 'var(--danger-bg)', color: 'var(--danger-text)',
              border: '1px solid var(--danger-border)',
              borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
            }}>
              {alertList.length} {alertList.length > 1 ? t('dashboard.openAlerts') : t('dashboard.openAlerts')}
            </span>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <ResponsiveGrid min={240} gap={14}>
        {METRIC.map(m => (
          <Card key={m.key} style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5 }}>
                  {t(m.labelKey).toUpperCase()}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                  {cs[m.key] != null ? Number(cs[m.key]).toFixed(1) : '—'}
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 3 }}>{m.unit}</span>
                </div>
              </div>
              <Icon name={m.icon} size={24} color={m.color} />
            </div>
          </Card>
        ))}
      </ResponsiveGrid>

      <div style={{ display: 'grid', gridTemplateColumns: width < 900 ? '1fr' : '2fr 1fr', gap: 16 }}>
        {/* Chart */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 14 }}>
            {t('dashboard.sensorHistory')}
          </div>
          {sr.length > 0
            ? <LineChart labels={chartLabels} datasets={chartDatasets} height={200} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
                {t('dashboard.noReadings')}
              </div>
          }
        </Card>

        {/* Alerts */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>
            {t('dashboard.openAlerts')}
          </div>
          {alertList.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>{t('dashboard.noOpenAlerts')}</div>
            : alertList.slice(0, 5).map(a => (
                <div key={a.alert_id} style={{
                  padding: '8px 0', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{a.alert_type}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(a.created_at)}</div>
                  </div>
                  <Badge label={a.severity} color={SEV_COLOR[a.severity] || '#6b7280'} />
                </div>
              ))
          }
        </Card>
      </div>

      {/* Crops */}
      <Card>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>
          {t('dashboard.activeCrops')}
        </div>
        {cropList.length === 0
          ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('dashboard.noCropsZone')}</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {cropListWithProgress.map(c => (
                <div key={c.crop_id} style={{
                  background: 'var(--bg-card-alt)', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.crop_type?.name || 'Unknown'}
                    </div>
                    <Badge
                      label={c.status}
                      color={STATUS_COLOR[c.status] || '#6b7280'}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {t('dashboard.batch')}: {c.batch_code} · {c.quantity} {t('dashboard.units')}
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${c.pct}%`, background: '#22c55e', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    {c.daysElapsed}d {t('dashboard.elapsed')} · {c.daysLeft}d {t('dashboard.left')}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Card>
    </div>
  );
}
