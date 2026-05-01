import { useApi } from '../hooks/useApi';
import { getPredictions } from '../api';
import { Card, Badge, LoadingSpinner, ErrorBanner } from '../ui';

const CLS_COLOR = { optimal: '#22c55e', warning: '#f59e0b', critical: '#ef4444' };

function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} days ago`;
}

export default function PredictionHistory() {
  const { data: predData, loading, error } = useApi(getPredictions);
  const predictions = predData?.predictions || (Array.isArray(predData) ? predData : []);

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Prediction History</h1>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{predictions.length} predictions</div>
      </div>

      <ErrorBanner message={error} />

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Time', 'Device', 'Model', 'Result', 'Confidence', 'Temp', 'Humidity', 'CO₂', 'Light'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {predictions.map(p => (
              <tr key={p.prediction_id} style={{ borderTop: '1px solid #f0f4f1' }}>
                <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 11 }}>{timeAgo(p.created_at)}</td>
                <td style={{ padding: '10px 12px', fontSize: 12 }}>{p.device?.name || p.device_id || '—'}</td>
                <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6b7280' }}>
                  {p.model_name || '—'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge label={p.predicted_class} color={CLS_COLOR[p.predicted_class] || '#6b7280'} />
                </td>
                <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace" }}>
                  {p.confidence != null ? `${Math.round(p.confidence * 100)}%` : '—'}
                </td>
                <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace" }}>
                  {p.input_features?.temperature != null ? Number(p.input_features.temperature).toFixed(1) : '—'}
                </td>
                <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace" }}>
                  {p.input_features?.humidity != null ? Number(p.input_features.humidity).toFixed(1) : '—'}
                </td>
                <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace" }}>
                  {p.input_features?.co2_ppm ?? '—'}
                </td>
                <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace" }}>
                  {p.input_features?.light_lux ?? '—'}
                </td>
              </tr>
            ))}
            {predictions.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
                  No predictions yet. Use AI Predict to generate one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
