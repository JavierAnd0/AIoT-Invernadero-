import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { getDevices, getDeviceReadings } from '../api';
import { Card, Select, LineChart, LoadingSpinner, ErrorBanner } from '../ui';

export default function SensorsScreen({ zone }) {
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

  if (dLoading) return <LoadingSpinner text="Loading devices…" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Sensors</h1>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Historical readings</div>
        </div>
        <Select
          label=""
          value={deviceId || ''}
          onChange={e => setDeviceId(Number(e.target.value))}
          options={deviceList.map(d => ({ value: d.device_id, label: d.name || d.serial_number }))}
        />
      </div>

      <ErrorBanner message={rError} />
      {rLoading && <LoadingSpinner text="Loading readings…" />}
      {!dLoading && deviceList.length === 0 && (
        <ErrorBanner message="No devices available for the selected zone." />
      )}

      {!rLoading && deviceList.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 12 }}>Temperature (°C)</div>
              <LineChart labels={labels} datasets={[{ label: 'Temp', data: sr.map(r => r.temperature), color: '#f59e0b' }]} />
            </Card>
            <Card>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 12 }}>Humidity (%)</div>
              <LineChart labels={labels} datasets={[{ label: 'Humidity', data: sr.map(r => r.humidity), color: '#3b82f6' }]} />
            </Card>
            <Card>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 12 }}>Light (lux)</div>
              <LineChart labels={labels} datasets={[{ label: 'Light', data: sr.map(r => r.light_lux), color: '#eab308' }]} />
            </Card>
            <Card>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 12 }}>CO₂ (ppm)</div>
              <LineChart labels={labels} datasets={[{ label: 'CO₂', data: sr.map(r => r.co2_ppm), color: '#8b5cf6' }]} />
            </Card>
          </div>

          <Card>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 12 }}>
              Raw Readings ({sr.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Timestamp', 'Temp °C', 'Humidity %', 'Light lux', 'CO₂ ppm', 'Soil %', 'pH'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sr.slice(0, 50).map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f0f4f1' }}>
                      <td style={{ padding: '7px 12px', fontFamily: "'DM Mono', monospace", color: '#6b7280', fontSize: 11 }}>
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
        </>
      )}
    </div>
  );
}
