import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { getDevices, getDeviceReadings, predict } from '../api';
import { Card, Select, Btn, Input, SemiGauge, ErrorBanner, LoadingSpinner } from '../ui';
import { Icon } from '../ui/icons';

const CLS_COLOR = { optimal: '#22c55e', warning: '#f59e0b', critical: '#ef4444' };
const CLS_ICON  = { optimal: 'checkCircle', warning: 'alertCircle', critical: 'xCircle' };

export default function PredictScreen() {
  const { t } = useTranslation();
  const { currentRole: role } = useAuth();
  const canPredict = role === 'admin' || role === 'operator';
  const { data: devices } = useApi(getDevices, []);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [form,           setForm]           = useState({ temp:'', hum:'', ph:'', light:'', co2:'' });
  const [result,         setResult]         = useState(null);
  const [predLoading,    setPredLoading]    = useState(false);
  const [predError,      setPredError]      = useState('');

  const deviceId = selectedDevice ?? (devices?.length ? devices[0].device_id : null);

  const FIELDS = [
    { key: 'temp',  label: t('predict.fieldTemp'), min: 0,   max: 50    },
    { key: 'hum',   label: t('predict.fieldHum'),  min: 0,   max: 100   },
    { key: 'ph',    label: t('predict.fieldPh'),   min: 0,   max: 14    },
    { key: 'light', label: t('predict.fieldLight'),min: 0,   max: 10000 },
    { key: 'co2',   label: t('predict.fieldCo2'),  min: 300, max: 5000  },
  ];

  async function autofill() {
    if (!deviceId) return;
    const readings = await getDeviceReadings(deviceId, { limit: 1 });
    const r = readings?.[0];
    if (r) setForm({
      temp:  String(r.temperature  ?? ''),
      hum:   String(r.humidity     ?? ''),
      ph:    String(r.ph           ?? ''),
      light: String(r.light_lux    ?? ''),
      co2:   String(r.co2_ppm      ?? ''),
    });
  }

  async function runPrediction(e) {
    e.preventDefault();
    setPredLoading(true); setPredError(''); setResult(null);
    try {
      const data = await predict({
        device_id:   deviceId,
        temperature: parseFloat(form.temp),
        humidity:    parseFloat(form.hum),
        ph:          parseFloat(form.ph),
        light_lux:   parseFloat(form.light),
        co2_ppm:     parseFloat(form.co2),
      });
      setResult({
        cls:   data.predicted_class,
        conf:  Math.round(data.confidence * 100),
        probs: [
          data.raw_probabilities?.optimal  || 0,
          data.raw_probabilities?.warning  || 0,
          data.raw_probabilities?.critical || 0,
        ],
      });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message || '';
      if (status === 503) {
        setPredError(t('predict.aiUnavailable'));
      } else {
        setPredError(msg || t('predict.aiUnavailable'));
      }
    } finally {
      setPredLoading(false);
    }
  }

  const probLabels = [t('predict.optimal'), t('predict.warning'), t('predict.critical')];
  const probColors = ['#22c55e', '#f59e0b', '#ef4444'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('predict.title')}</h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
          {t('predict.subtitle')}
        </div>
      </div>

      <div className="two-panel">
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 16 }}>
            {t('predict.inputValues')}
          </div>
          <form onSubmit={runPrediction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Select
              label={t('predict.device')}
              value={deviceId || ''}
              onChange={e => setSelectedDevice(Number(e.target.value))}
              options={(devices || []).map(d => ({ value: d.device_id, label: d.name || d.serial_number }))}
              disabled={!canPredict}
            />

            {FIELDS.map(f => (
              <Input
                key={f.key}
                label={f.label}
                type="number"
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={`${f.min}–${f.max}`}
                disabled={!canPredict}
              />
            ))}

            <ErrorBanner message={predError} />
            {!canPredict && (
              <ErrorBanner message={t('predict.adminOperatorOnly')} />
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="ghost" onClick={autofill} disabled={!canPredict} style={{ flex: 1 }}>
                {t('predict.autofill')}
              </Btn>
              <Btn type="submit" disabled={predLoading || !canPredict} style={{ flex: 1 }}>
                {predLoading ? t('predict.running') : t('predict.run')}
              </Btn>
            </div>
          </form>
        </Card>

        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 16 }}>
            {t('predict.result')}
          </div>

          {predLoading && <LoadingSpinner text={t('predict.running')} />}

          {!predLoading && !result && (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              {t('predict.fillValues')}
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <SemiGauge
                value={result.conf}
                max={100}
                color={CLS_COLOR[result.cls] || '#22c55e'}
                label={t('predict.confidence')}
              />

              <div style={{
                background: (CLS_COLOR[result.cls] || '#22c55e') + '18',
                border: `1px solid ${CLS_COLOR[result.cls] || '#22c55e'}44`,
                borderRadius: 12, padding: '14px 24px', textAlign: 'center',
              }}>
                <Icon name={CLS_ICON[result.cls]} size={28} color={CLS_COLOR[result.cls]} />
                <div style={{ fontSize: 20, fontWeight: 700, color: CLS_COLOR[result.cls] || '#22c55e', marginTop: 4 }}>
                  {result.cls?.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {result.conf}% {t('predict.confidence')}
                </div>
              </div>

              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>
                  {t('predict.classProbabilities')}
                </div>
                {probLabels.map((label, i) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: probColors[i], fontWeight: 600 }}>{label}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", color: '#374151' }}>
                        {Math.round((result.probs[i] || 0) * 100)}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: '#f0f4f1', borderRadius: 3 }}>
                      <div style={{
                        height: '100%', width: `${Math.round((result.probs[i] || 0) * 100)}%`,
                        background: probColors[i], borderRadius: 3, transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
