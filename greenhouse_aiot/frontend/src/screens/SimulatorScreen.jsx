import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { data: status, loading, error, refetch: refetchStatus } = usePolling(getSimulatorStatus, 5000);
  const [interval, setInterval_] = useState(30);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');

  const running = status?.running || false;

  async function handleStart() {
    setActionError('');
    setActing(true);
    try { await startSimulator(interval); refetchStatus(); }
    catch (err) { setActionError(err.response?.data?.error || t('simulator.couldNotStart')); }
    finally { setActing(false); }
  }
  async function handleStop() {
    setActionError('');
    setActing(true);
    try { await stopSimulator(); refetchStatus(); }
    catch (err) { setActionError(err.response?.data?.error || t('simulator.couldNotStop')); }
    finally { setActing(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('simulator.title')}</h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
          {t('simulator.subtitle')}
        </div>
      </div>

      <ErrorBanner message={error} />
      <ErrorBanner message={actionError} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16, color: 'var(--text-primary)' }}>{t('simulator.control')}</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: running ? '#22c55e' : '#6b7280',
              boxShadow: running ? '0 0 8px #22c55e' : 'none',
            }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {running ? t('simulator.running') : t('simulator.stopped')}
            </span>
            {running && <Badge label="Live" color="#22c55e" />}
          </div>

          {!running && (
            <Input
              label={t('simulator.interval')}
              type="number"
              value={interval}
              onChange={e => setInterval_(Number(e.target.value))}
              style={{ marginBottom: 14 }}
            />
          )}

          {running
            ? <Btn variant="danger" onClick={handleStop} disabled={acting} style={{ width: '100%' }}>
                {acting ? t('simulator.stopping') : t('simulator.stop')}
              </Btn>
            : <Btn onClick={handleStart} disabled={acting} style={{ width: '100%' }}>
                {acting ? t('simulator.starting') : t('simulator.start')}
              </Btn>
          }
        </Card>

        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16, color: 'var(--text-primary)' }}>{t('simulator.statistics')}</div>
          {loading
            ? <LoadingSpinner text={t('simulator.fetchingStatus')} />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  [t('simulator.readingsGenerated'), status?.readings_generated ?? '—'],
                  [t('simulator.intervalSec'),       status?.interval_seconds ? `${status.interval_seconds}s` : '—'],
                  [t('simulator.lastReading'),        timeAgo(status?.last_reading_at)],
                  [t('simulator.activeDevices'),      status?.active_devices ?? '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
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
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--text-primary)' }}>{t('simulator.about')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {t('simulator.aboutText')}
        </div>
      </Card>
    </div>
  );
}
