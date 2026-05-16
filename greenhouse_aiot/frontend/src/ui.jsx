import { useTheme } from './hooks/useTheme';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

// eslint-disable-next-line react-refresh/only-export-components
export const STATUS_COLOR = {
  Growing:   '#22c55e',
  Harvested: '#3b82f6',
  Alert:     '#f59e0b',
  Planned:   '#8b5cf6',
  growing:   '#22c55e',
  harvested: '#3b82f6',
  alert:     '#f59e0b',
  planned:   '#8b5cf6',
};

// eslint-disable-next-line react-refresh/only-export-components
export const SEV_COLOR = {
  critical: '#ef4444',
  warning:  '#f59e0b',
  info:     '#3b82f6',
};

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export function Badge({ label, color = '#22c55e' }) {
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
      letterSpacing: 0.3,
    }}>
      {cap(label)}
    </span>
  );
}

export function PulseDot({ color = '#22c55e', size = 8 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, opacity: 0.4,
        animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
      }} />
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: color,
      }} />
    </span>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 12,
      border: '1px solid var(--border)', padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

export function Btn({ children, onClick, variant = 'primary', disabled = false, type = 'button', style = {} }) {
  const base = {
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', border: 'none',
    fontFamily: 'inherit', transition: 'opacity 0.15s', opacity: disabled ? 0.6 : 1,
    ...style,
  };
  const variants = {
    primary:   { background: '#22c55e', color: '#fff' },
    secondary: { background: 'var(--bg-card-alt)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    danger:    { background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' },
    ghost:     { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

export function Input({ label, value, onChange, type = 'text', placeholder = '', disabled = false, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5 }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          padding: '8px 12px', borderRadius: 8, border: '1px solid var(--input-border)',
          fontSize: 13, fontFamily: 'inherit', outline: 'none',
          background: disabled ? 'var(--row-hover)' : 'var(--input-bg)',
          color: 'var(--text-primary)',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options = [], disabled = false, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5 }}>{label}</label>}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          padding: '8px 12px', borderRadius: 8, border: '1px solid var(--input-border)',
          fontSize: 13, fontFamily: 'inherit', outline: 'none',
          background: disabled ? 'var(--row-hover)' : 'var(--input-bg)',
          color: 'var(--text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function LineChart({ labels = [], datasets = [], height = 180 }) {
  const { resolvedTheme } = useTheme();
  const gridColor  = resolvedTheme === 'dark' ? '#263348' : '#e5f0e8';
  const tickColor  = resolvedTheme === 'dark' ? '#8da4bf' : '#6b7280';
  const data = {
    labels,
    datasets: datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color || '#22c55e',
      backgroundColor: (ds.color || '#22c55e') + '18',
      borderWidth: 2,
      pointRadius: 2,
      fill: true,
      tension: 0.4,
    })),
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 }, maxTicksLimit: 8 } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
    },
  };
  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
}

export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: '40px 0', color: 'var(--text-secondary)', fontSize: 13,
    }}>
      <div style={{
        width: 16, height: 16, border: '2px solid var(--border)',
        borderTop: '2px solid #22c55e', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      {text}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background: 'var(--danger-bg)', color: 'var(--danger-text)',
      border: '1px solid var(--danger-border)',
      padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 12,
    }}>
      ⚠ {message}
    </div>
  );
}

export function SemiGauge({ value = 0, max = 100, color = '#22c55e', label = '' }) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const angle = pct * 180 - 90;
  const r = 60, cx = 80, cy = 80;
  const toXY = deg => {
    const rad = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [x1, y1] = toXY(-90);
  const [x2, y2] = toXY(angle);
  const largeArc = pct > 0.5 ? 1 : 0;
  return (
    <svg width={160} height={90} style={{ overflow: 'visible' }}>
      <path d={`M ${toXY(-90)[0]} ${toXY(-90)[1]} A ${r} ${r} 0 1 1 ${toXY(90)[0]} ${toXY(90)[1]}`}
        fill="none" style={{ stroke: 'var(--border)' }} strokeWidth={10} strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
      )}
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={18} fontWeight={700} style={{ fill: 'var(--text-primary)' }}>
        {value}
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize={10} style={{ fill: 'var(--text-secondary)' }}>
        {label}
      </text>
    </svg>
  );
}
