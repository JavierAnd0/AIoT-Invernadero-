import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { getAlerts, acknowledgeAlert, resolveAlert } from '../api';
import { Card, Badge, Btn, LoadingSpinner, ErrorBanner, SEV_COLOR } from '../ui';

function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} days ago`;
}

const STATUS_FILTER = ['all', 'open', 'acknowledged', 'resolved'];

export default function AlertsScreen() {
  const [filter, setFilter] = useState('all');
  const { data: alertsData, loading, error, refetch } = useApi(
    () => getAlerts(filter !== 'all' ? { status: filter } : undefined),
    [filter]
  );
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const list = alertsData?.alerts || alertsData;
    if (Array.isArray(list)) setAlerts(list);
    else if (list) setAlerts([list]);
  }, [alertsData]);

  async function ack(id) {
    await acknowledgeAlert(id);
    refetch();
  }
  async function resolve(id) {
    await resolveAlert(id);
    refetch();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Alerts</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{alerts.length} alerts</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_FILTER.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)',
                background: filter === s ? '#22c55e' : 'var(--bg-card-alt)',
                color: filter === s ? '#fff' : 'var(--text-primary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />
      {loading && <LoadingSpinner />}

      {!loading && (
        <Card>
          {alerts.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No alerts found</div>
            : alerts.map(a => (
                <div key={a.alert_id} style={{
                  padding: '14px 0', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: SEV_COLOR[a.severity] || '#6b7280',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {a.alert_type}
                      </span>
                      <Badge label={a.severity} color={SEV_COLOR[a.severity] || '#6b7280'} />
                      <Badge
                        label={a.status}
                        color={a.status === 'open' ? '#ef4444' : a.status === 'acknowledged' ? '#f59e0b' : '#22c55e'}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Value: <span style={{ fontFamily: "'DM Mono', monospace" }}>
                        {a.measured_value != null ? Number(a.measured_value).toFixed(2) : '—'}
                      </span>
                      {a.threshold_value != null && (
                        <> · Threshold: <span style={{ fontFamily: "'DM Mono', monospace" }}>
                          {Number(a.threshold_value).toFixed(2)}
                        </span></>
                      )}
                      <span style={{ marginLeft: 8 }}>{timeAgo(a.created_at)}</span>
                    </div>
                    {a.message && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.message}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {a.status === 'open' && (
                      <Btn variant="ghost" onClick={() => ack(a.alert_id)} style={{ fontSize: 11, padding: '5px 10px' }}>
                        Acknowledge
                      </Btn>
                    )}
                    {(a.status === 'open' || a.status === 'acknowledged') && (
                      <Btn variant="secondary" onClick={() => resolve(a.alert_id)} style={{ fontSize: 11, padding: '5px 10px' }}>
                        Resolve
                      </Btn>
                    )}
                  </div>
                </div>
              ))
          }
        </Card>
      )}
    </div>
  );
}
