import { useApi, usePolling } from '../hooks/useApi';
import {
  getLatestReadings, getOpenAlerts, getDevices, getZones,
  getCrops, getDeviceReadings,
} from '../api';
import { Card, Badge, LineChart, STATUS_COLOR, SEV_COLOR } from '../ui';

function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const METRIC = [
  { key: 'temp',  label: 'Temperature', unit: '°C', color: '#f59e0b', icon: '🌡' },
  { key: 'hum',   label: 'Humidity',    unit: '%',  color: '#3b82f6', icon: '💧' },
  { key: 'light', label: 'Light',       unit: 'lux',color: '#eab308', icon: '☀' },
  { key: 'co2',   label: 'CO₂',         unit: 'ppm',color: '#8b5cf6', icon: '🌬' },
];

export default function DashboardScreen({ zone }) {
  const { data: zones }          = useApi(getZones, []);
  const { data: latestReadings } = usePolling(getLatestReadings, 30000);
  const { data: openAlerts }     = usePolling(getOpenAlerts, 30000);
  const { data: devices }        = useApi(getDevices, []);

  const currentZone = zones?.find(z => z.zone_id === zone) || zones?.[0];
  const currentZoneId = currentZone?.zone_id;
  const deviceForZone = devices?.find(d => d.zone_id === currentZoneId);
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

  const rawReading = latestReadings?.find(r => r.device?.zone_id === currentZoneId)?.reading || {};
  const cs = {
    temp:  rawReading.temperature,
    hum:   rawReading.humidity,
    ph:    rawReading.ph,
    light: rawReading.light_lux,
    co2:   rawReading.co2_ppm,
  };

  const alertList = Array.isArray(openAlerts) ? openAlerts : [];
  const cropList  = Array.isArray(crops) ? crops : [];
  const zoneLabel = currentZone?.description
    || currentZone?.name
    || (currentZoneId != null ? `Zone ${currentZoneId}` : 'Selected zone');

  const chartLabels = sr.map(r => new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const chartDatasets = [
    { label: 'Temp °C', data: sr.map(r => r.temperature), color: '#f59e0b' },
    { label: 'Humidity %', data: sr.map(r => r.humidity), color: '#3b82f6' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Dashboard</h1>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
            {zoneLabel} · Live data
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {alertList.length > 0 && (
            <span style={{
              background: '#fee2e2', color: '#b91c1c', borderRadius: 20,
              padding: '4px 12px', fontSize: 12, fontWeight: 600,
            }}>
              {alertList.length} open alert{alertList.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {METRIC.map(m => (
          <Card key={m.key} style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, letterSpacing: 0.5 }}>
                  {m.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                  {cs[m.key] != null ? Number(cs[m.key]).toFixed(1) : '—'}
                  <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 3 }}>{m.unit}</span>
                </div>
              </div>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Chart */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 14 }}>
            Sensor History (last 24 readings)
          </div>
          {sr.length > 0
            ? <LineChart labels={chartLabels} datasets={chartDatasets} height={200} />
            : <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
                No readings available
              </div>
          }
        </Card>

        {/* Alerts */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 12 }}>
            Open Alerts
          </div>
          {alertList.length === 0
            ? <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No open alerts</div>
            : alertList.slice(0, 5).map(a => (
                <div key={a.alert_id} style={{
                  padding: '8px 0', borderBottom: '1px solid #f0f4f1',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{a.alert_type}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{timeAgo(a.created_at)}</div>
                  </div>
                  <Badge label={a.severity} color={SEV_COLOR[a.severity] || '#6b7280'} />
                </div>
              ))
          }
        </Card>
      </div>

      {/* Crops */}
      <Card>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 12 }}>
          Active Crops
        </div>
        {cropList.length === 0
          ? <div style={{ color: '#9ca3af', fontSize: 12 }}>No crops in this zone</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {cropList.map(c => {
                const daysElapsed = Math.floor((Date.now() - new Date(c.planted_at)) / 86400000);
                const growthDays = c.crop_type?.growth_days || 60;
                const daysLeft = Math.max(0, growthDays - daysElapsed);
                const pct = Math.min(100, Math.round((daysElapsed / growthDays) * 100));
                return (
                  <div key={c.crop_id} style={{
                    background: '#f9fafb', borderRadius: 10, padding: '12px 14px',
                    border: '1px solid #e5f0e8',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        {c.crop_type?.name || 'Unknown'}
                      </div>
                      <Badge
                        label={c.status}
                        color={STATUS_COLOR[c.status] || '#6b7280'}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>
                      Batch: {c.batch_code} · {c.quantity} units
                    </div>
                    <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#22c55e', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                      {daysElapsed}d elapsed · {daysLeft}d left
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Card>
    </div>
  );
}
