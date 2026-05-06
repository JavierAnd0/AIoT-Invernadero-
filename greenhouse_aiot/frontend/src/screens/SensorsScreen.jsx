import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { getDevices, getDeviceReadings } from '../api';
import { Card, Select, LineChart, LoadingSpinner, ErrorBanner } from '../ui';
import { ResponsiveGrid } from '../components/ResponsiveGrid.jsx';

export default function SensorsScreen({ zone }) {
  const { t } = useTranslation();
  const { data: devices, loading: dLoading } = useApi(() => getDevices(zone ? { zone_id: zone } : {}), [zone]);
  const [deviceId, setDeviceId] = useState(null);
  const deviceList = Array.isArray(devices) ? devices : [];

  useEffect(() => {
    if (!deviceList.length) {
      setDeviceId(null);
      return;
    }
    if (!deviceList.some(d => d.device_id === deviceId)) {
      setDeviceId(deviceList[0].device_id);
    }
  }, [deviceId, deviceList]);

  const { data: readings, loading: rLoading, error: rError } = useApi(
    () => getDeviceReadings(deviceId, { limit: 100 }),
    [deviceId],
    { autoFetch: !!deviceId }
  );
  const sr = readings || [];

  const labels = sr.map(r => new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  if (dLoading) return <LoadingSpinner text={t('sensors.loadingDevices')} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('sensors.title')}</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{t('sensors.historicalReadings')}</div>
        </div>
        <Select
          label=""
          value={deviceId || ''}
          onChange={e => setDeviceId(Number(e.target.value))}
          options={deviceList.map(d => ({ value: d.device_id, label: d.name || d.serial_number }))}
        />
      </div>

      <ErrorBanner message={rError} />
      {rLoading && <LoadingSpinner text={t('sensors.loadingReadings')} />}
      {!dLoading && deviceList.length === 0 && (
        <ErrorBanner message={t('sensors.noDevicesMsg')} />
      )}

      {!rLoading && deviceList.length > 0 && (
        <>
          <ResponsiveGrid min={240} gap={16}>
            <Card>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 12 }}>{t('sensors.colTemp')}</div>
              <LineChart labels={labels} datasets={[{ label: t('sensors.temperature'), data: sr.map(r => r.temperature), color: '#f59e0b' }]} />
            </Card>
            <Card>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 12 }}>{t('sensors.colHumidity')}</div>
              <LineChart labels={labels} datasets={[{ label: t('sensors.humidity'), data: sr.map(r => r.humidity), color: '#3b82f6' }]} />
            </Card>
            <Card>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 12 }}>{t('sensors.colLight')}</div>
              <LineChart labels={labels} datasets={[{ label: t('sensors.light'), data: sr.map(r => r.light_lux), color: '#eab308' }]} />
            </Card>
            <Card>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 12 }}>{t('sensors.colCo2')}</div>
              <LineChart labels={labels} datasets={[{ label: t('sensors.co2'), data: sr.map(r => r.co2_ppm), color: '#8b5cf6' }]} />
            </Card>
            <Card>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 12 }}>{t('sensors.rawReadings')}</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card-alt)' }}>
                      {[t('sensors.colTimestamp'), t('sensors.colTemp'), t('sensors.colHumidity'), t('sensors.colLight'), t('sensors.colCo2'), t('sensors.colSoil'), t('sensors.colPh')].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sr.slice(0, 50).map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 12px', fontFamily: "'DM Mono', monospace", color: 'var(--text-secondary)', fontSize: 11 }}>
                          {new Date(r.recorded_at).toLocaleString()}
                        </td>
                        {[r.temperature, r.humidity, r.light_lux, r.co2_ppm, r.soil_moisture, r.ph].map((v, j) => (
                          <td key={j} style={{ padding: '7px 12px', fontFamily: "'DM Mono', monospace" }}>
                            {v != null ? Number(v).toFixed(1) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </ResponsiveGrid>
        </>
      )}
    </div>
  );
}
