import { useState } from 'react';
import { usePolling } from '../hooks/useApi';
import { getSimulatorStatus, startSimulator, stopSimulator } from '../api';
import { Card, Btn, Input, Badge, LoadingSpinner, ErrorBanner } from '../ui';

function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} days ago`;
}

export default function SimulatorScreen() {
  const { data: status, loading, error, refetch: refetchStatus } = usePolling(getSimulatorStatus, 5000);
  const [interval, setInterval_] = useState(30);
  const [acting, setActing] = useState(false);

  const running = status?.running || false;

  async function handleStart() {
    setActing(true);
    try { await startSimulator(interval); refetchStatus(); }
    finally { setActing(false); }
  }
  async function handleStop() {
    setActing(true);
    try { await stopSimulator(); refetchStatus(); }
    finally { setActing(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>IoT Simulator</h1>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
          Generate synthetic sensor readings for testing
        </div>
      </div>

      <ErrorBanner message={error} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Simulator Control</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: running ? '#22c55e' : '#6b7280',
              boxShadow: running ? '0 0 8px #22c55e' : 'none',
            }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {running ? 'Running' : 'Stopped'}
            </span>
            {running && <Badge label="Live" color="#22c55e" />}
          </div>

          {!running && (
            <Input
              label="Interval (seconds)"
              type="number"
              value={interval}
              onChange={e => setInterval_(Number(e.target.value))}
              style={{ marginBottom: 14 }}
            />
          )}

          {running
            ? <Btn variant="danger" onClick={handleStop} disabled={acting} style={{ width: '100%' }}>
                {acting ? 'Stopping…' : '⏹ Stop Simulator'}
              </Btn>
            : <Btn onClick={handleStart} disabled={acting} style={{ width: '100%' }}>
                {acting ? 'Starting…' : '▶ Start Simulator'}
              </Btn>
          }
        </Card>

        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Statistics</div>
          {loading
            ? <LoadingSpinner text="Fetching status…" />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  ['Readings Generated', status?.readings_generated ?? '—'],
                  ['Interval',           status?.interval_seconds ? `${status.interval_seconds}s` : '—'],
                  ['Last Reading',       timeAgo(status?.last_reading_at)],
                  ['Active Devices',     status?.active_devices ?? '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: '#111827' }}>
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </Card>
      </div>

      <Card>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>About the Simulator</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
          The IoT simulator generates synthetic sensor readings for all active devices at the configured interval.
          It simulates realistic sensor noise and drift patterns to mimic real greenhouse hardware.
          Use it to test the alert system, AI prediction pipeline, and dashboard charts without physical sensors.
        </div>
      </Card>
    </div>
  );
}
