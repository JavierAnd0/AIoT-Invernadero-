import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { getDevices, createDevice, updateDeviceStatus, getZones } from '../api';
import { Card, Badge, Btn, Input, Select, LoadingSpinner, ErrorBanner } from '../ui';

const STATUS_OPTS = [
  { value: 'online',      label: 'Online'      },
  { value: 'offline',     label: 'Offline'     },
  { value: 'error',       label: 'Error'       },
  { value: 'maintenance', label: 'Maintenance' },
];
const DEVICE_TYPE_OPTS = [
  { value: 'sensor_node', label: 'Sensor Node' },
  { value: 'actuator', label: 'Actuator' },
  { value: 'gateway', label: 'Gateway' },
  { value: 'simulated', label: 'Simulated' },
];
const STATUS_COLOR = { online: '#22c55e', offline: '#6b7280', error: '#ef4444', maintenance: '#f59e0b' };

function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function DeviceManagement() {
  const { currentRole: role } = useAuth();
  const canCreate = role === 'admin';
  const canUpdateStatus = role === 'admin' || role === 'operator';
  const { data: devices, loading, error, refetch: refetchDevices } = useApi(getDevices);
  const { data: zones }  = useApi(getZones);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', serial_number:'', device_type:'sensor_node', zone_id:'', firmware_version:'' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const deviceList = Array.isArray(devices) ? devices : [];

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleStatusChange(id, status) {
    if (!canUpdateStatus) return;
    setSaveError('');
    try {
      await updateDeviceStatus(id, status);
      refetchDevices();
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Could not update device status');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      await createDevice({ ...form, zone_id: Number(form.zone_id) });
      refetchDevices();
      setShowForm(false);
      setForm({ name:'', serial_number:'', device_type:'sensor_node', zone_id:'', firmware_version:'' });
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Could not create device');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Device Management</h1>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{deviceList.length} devices</div>
        </div>
        {canCreate && <Btn onClick={() => setShowForm(f => !f)}>+ Add Device</Btn>}
      </div>

      <ErrorBanner message={error} />
      <ErrorBanner message={saveError} />
      {!canCreate && (
        <ErrorBanner message="Only admin users can register new devices. Operators can update device status." />
      )}

      {showForm && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>New Device</div>
          <ErrorBanner message={saveError} />
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Name" value={form.name} onChange={e => upd('name', e.target.value)} />
            <Input label="Serial Number" value={form.serial_number} onChange={e => upd('serial_number', e.target.value)} />
            <Select
              label="Type"
              value={form.device_type}
              onChange={e => upd('device_type', e.target.value)}
              options={DEVICE_TYPE_OPTS}
            />
            <Select
              label="Zone"
              value={form.zone_id}
              onChange={e => upd('zone_id', e.target.value)}
              options={[{ value:'', label:'Select zone…' }, ...(zones || []).map(z => ({ value: z.zone_id, label: z.description || z.name }))]}
            />
            <Input label="Firmware Version" value={form.firmware_version} onChange={e => upd('firmware_version', e.target.value)} />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create'}</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Name', 'Serial', 'Type', 'Zone', 'Firmware', 'Last Seen', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deviceList.map(d => (
              <tr key={d.device_id} style={{ borderTop: '1px solid #f0f4f1' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{d.name || '—'}</td>
                <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{d.serial_number}</td>
                <td style={{ padding: '10px 12px', color: '#6b7280' }}>{d.device_type}</td>
                <td style={{ padding: '10px 12px', color: '#6b7280' }}>{d.zone?.description || d.zone_id}</td>
                <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{d.firmware_version || '—'}</td>
                <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 11 }}>{timeAgo(d.last_seen_at)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge label={d.status} color={STATUS_COLOR[d.status] || '#6b7280'} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Select
                    value={d.status}
                    onChange={e => handleStatusChange(d.device_id, e.target.value)}
                    options={STATUS_OPTS}
                    disabled={!canUpdateStatus}
                    style={{ minWidth: 110 }}
                  />
                </td>
              </tr>
            ))}
            {deviceList.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>No devices found</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
