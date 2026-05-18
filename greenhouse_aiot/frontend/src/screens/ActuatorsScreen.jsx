import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getActuators, getActuatorState, getActuatorHistory, issueActuatorCommand } from '../api';
import { Btn, Card, LoadingSpinner, ErrorBanner, PageHeader, Badge } from '../ui';
import { Icon } from '../ui/icons';

// ── Command metadata ──────────────────────────────────────────────────────────
// Maps CommandType values to display info
const COMMAND_META = {
  VENTILATION_OPEN:  { category: 'ventilation', action: 'open',  icon: 'ventilation', labelKey: 'actuators.open'  },
  VENTILATION_CLOSE: { category: 'ventilation', action: 'close', icon: 'ventilation', labelKey: 'actuators.close' },
  IRRIGATION_START:  { category: 'irrigation',  action: 'start', icon: 'irrigation',  labelKey: 'actuators.start' },
  IRRIGATION_STOP:   { category: 'irrigation',  action: 'stop',  icon: 'irrigation',  labelKey: 'actuators.stop'  },
  LIGHTS_ON:         { category: 'lights',      action: 'on',    icon: 'lights',      labelKey: 'actuators.on'    },
  LIGHTS_OFF:        { category: 'lights',      action: 'off',   icon: 'lights',      labelKey: 'actuators.off'   },
};

const CATEGORIES = [
  {
    key:    'ventilation',
    titleKey: 'actuators.ventilation',
    icon:   'ventilation',
    on:     'VENTILATION_OPEN',
    off:    'VENTILATION_CLOSE',
    onLabelKey:  'actuators.open',
    offLabelKey: 'actuators.close',
  },
  {
    key:    'irrigation',
    titleKey: 'actuators.irrigation',
    icon:   'irrigation',
    on:     'IRRIGATION_START',
    off:    'IRRIGATION_STOP',
    onLabelKey:  'actuators.start',
    offLabelKey: 'actuators.stop',
  },
  {
    key:    'lights',
    titleKey: 'actuators.lights',
    icon:   'lights',
    on:     'LIGHTS_ON',
    off:    'LIGHTS_OFF',
    onLabelKey:  'actuators.on',
    offLabelKey: 'actuators.off',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString(undefined, {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function getCommandCategory(commandType) {
  return COMMAND_META[commandType?.toUpperCase()]?.category ?? null;
}

function isActiveState(lastCommand, category) {
  if (!lastCommand?.command_type) return false;
  const ct = lastCommand.command_type.toUpperCase();
  const meta = COMMAND_META[ct];
  if (!meta || meta.category !== category) return false;
  return meta.action === 'open' || meta.action === 'start' || meta.action === 'on';
}

function StatusBadge({ status, t }) {
  const colors = {
    executed: '#22c55e',
    pending:  '#f59e0b',
    failed:   '#ef4444',
  };
  const labels = {
    executed: t('actuators.statusExecuted'),
    pending:  t('actuators.statusPending'),
    failed:   t('actuators.statusFailed'),
  };
  const s = (status ?? '').toLowerCase();
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      background: colors[s] ? `${colors[s]}22` : undefined,
      color: colors[s] ?? 'inherit',
    }}>
      {labels[s] ?? status}
    </span>
  );
}

// ── ActuatorCard ──────────────────────────────────────────────────────────────
function ActuatorCard({ device, t }) {
  const [lastCmd, setLastCmd]   = useState(null);
  const [history, setHistory]   = useState([]);
  const [sending, setSending]   = useState(null); // commandType being sent
  const [feedback, setFeedback] = useState(null); // { ok: bool, msg: string }
  const [showHistory, setShowHistory] = useState(false);

  // Load initial state + history
  useEffect(() => {
    getActuatorState(device.device_id ?? device.id)
      .then(data => { if (data) setLastCmd(data); })
      .catch(() => {});
    getActuatorHistory(device.device_id ?? device.id)
      .then(setHistory)
      .catch(() => {});
  }, [device]);

  const handleCommand = useCallback(async (commandType) => {
    const id = device.device_id ?? device.id;
    setSending(commandType);
    setFeedback(null);
    try {
      const cmd = await issueActuatorCommand(id, commandType);
      setLastCmd(cmd);
      setHistory(prev => [cmd, ...prev.slice(0, 19)]);
      setFeedback({ ok: true, msg: t('actuators.commandSent') });
    } catch {
      setFeedback({ ok: false, msg: t('actuators.commandError') });
    } finally {
      setSending(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  }, [device, t]);

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{device.name}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
            {device.zone?.name ?? '—'} · ID {device.device_id ?? device.id}
          </div>
          {lastCmd && (
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              {t('actuators.lastCommand')}:
              <Icon name={COMMAND_META[lastCmd.command_type?.toUpperCase()]?.icon} size={12} />
              {lastCmd.command_type?.toLowerCase().replace(/_/g, ' ')} — {formatDateTime(lastCmd.issued_at)}
            </div>
          )}
          {!lastCmd && (
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
              {t('actuators.noState')}
            </div>
          )}
        </div>
        <span style={{
          padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: device.status === 'online' ? '#22c55e22' : '#9ca3af22',
          color: device.status === 'online' ? '#22c55e' : '#9ca3af',
        }}>
          {device.status}
        </span>
      </div>

      {/* Control buttons — one row per category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CATEGORIES.map(cat => {
          const active = isActiveState(lastCmd, cat.key);
          const lastCmdIsThisCategory = getCommandCategory(lastCmd?.command_type) === cat.key;
          return (
            <div key={cat.key} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: active && lastCmdIsThisCategory ? 'rgba(34,197,94,0.08)' : 'var(--surface, rgba(0,0,0,0.03))',
              border: '1px solid var(--border, rgba(0,0,0,0.08))',
            }}>
              <span style={{ minWidth: 24, display: 'flex', alignItems: 'center' }}>
                <Icon name={cat.icon} size={18} />
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                {t(cat.titleKey)}
              </span>
              <Btn
                variant={active && lastCmdIsThisCategory ? 'primary' : 'secondary'}
                style={{ padding: '4px 14px', fontSize: 12 }}
                disabled={sending !== null}
                onClick={() => handleCommand(cat.on)}
              >
                {sending === cat.on ? '…' : t(cat.onLabelKey)}
              </Btn>
              <Btn
                variant={!active && lastCmdIsThisCategory ? 'primary' : 'ghost'}
                style={{ padding: '4px 14px', fontSize: 12 }}
                disabled={sending !== null}
                onClick={() => handleCommand(cat.off)}
              >
                {sending === cat.off ? '…' : t(cat.offLabelKey)}
              </Btn>
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
          background: feedback.ok ? '#22c55e22' : '#ef444422',
          color: feedback.ok ? '#22c55e' : '#ef4444',
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Command history toggle */}
      <div>
        <button
          onClick={() => setShowHistory(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, opacity: 0.7, padding: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Icon name={showHistory ? 'chevronUp' : 'chevronDown'} size={14} />
          {t('actuators.commandHistory')} ({history.length})
        </button>
        {showHistory && (
          <div style={{ marginTop: 8, overflowX: 'auto' }}>
            {history.length === 0
              ? <div style={{ fontSize: 12, opacity: 0.5, paddingLeft: 4 }}>{t('actuators.noHistory')}</div>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ opacity: 0.6, textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px' }}>{t('actuators.colTime')}</th>
                      <th style={{ padding: '4px 8px' }}>{t('actuators.colCommand')}</th>
                      <th style={{ padding: '4px 8px' }}>{t('actuators.colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 10).map((cmd, i) => (
                      <tr key={cmd.command_id ?? i} style={{ borderTop: '1px solid var(--border, rgba(0,0,0,0.06))' }}>
                        <td style={{ padding: '4px 8px', opacity: 0.7 }}>
                          {formatDateTime(cmd.issued_at)}
                        </td>
                        <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icon name={COMMAND_META[cmd.command_type?.toUpperCase()]?.icon} size={12} />
                            {cmd.command_type?.toLowerCase().replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <StatusBadge status={cmd.status} t={t} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ActuatorsScreen() {
  const { t } = useTranslation();
  const [actuators, setActuators] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    getActuators()
      .then(setActuators)
      .catch(e => setError(e?.response?.data?.error ?? e.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title={t('actuators.title')}
        subtitle={t('actuators.subtitle')}
      />

      {loading && <LoadingSpinner />}
      {error   && <ErrorBanner message={error} />}

      {!loading && !error && actuators.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name="bot" size={40} />
          </div>
          <div>{t('actuators.noActuators')}</div>
        </Card>
      )}

      {!loading && !error && actuators.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 20,
          marginTop: 20,
        }}>
          {actuators.map(device => (
            <ActuatorCard
              key={device.device_id ?? device.id}
              device={device}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
