import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { getDevices, createDevice, updateDeviceStatus, getZones } from '../api';
import { Card, Badge, Btn, Input, Select, LoadingSpinner, ErrorBanner, PageHeader } from '../ui';

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
  const { t } = useTranslation();
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

  const STATUS_OPTS = [
    { value: 'online',      label: t('devices.online') },
    { value: 'offline',     label: t('devices.offline') },
    { value: 'error',       label: t('devices.error') },
    { value: 'maintenance', label: t('devices.maintenance') },
  ];

  const DEVICE_TYPE_OPTS = [
    { value: 'sensor_node', label: t('devices.sensorNode') },
    { value: 'actuator',    label: t('devices.actuator') },
    { value: 'gateway',     label: t('devices.gateway') },
    { value: 'simulated',   label: t('devices.simulated') },
  ];

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
    if (!form.name.trim()) { setSaveError(t('devices.nameRequired')); return; }
    if (!form.zone_id)     { setSaveError(t('devices.zoneRequired'));  return; }
    setSaving(true);
    try {
      await createDevice({ ...form, zone_id: Number(form.zone_id) });
      refetchDevices();
      setShowForm(false);
      setForm({ name:'', serial_number:'', device_type:'sensor_node', zone_id:'', firmware_version:'' });
    } catch (err) {
      setSaveError(err.response?.data?.error || t('devices.couldNotCreate'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title={t('devices.title')} subtitle={t('devices.count', { count: deviceList.length })}>
        {canCreate && <Btn onClick={() => setShowForm(f => !f)}>{t('devices.addDevice')}</Btn>}
      </PageHeader>

      <ErrorBanner message={error} />
      {!canCreate && <ErrorBanner message={t('devices.adminOnlyMsg')} />}

      {showForm && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: 'var(--text-primary)' }}>{t('devices.newDevice')}</div>
          <ErrorBanner message={saveError} />
          <form onSubmit={handleCreate} className="form-grid">
            <Input label={t('devices.name')} value={form.name} onChange={e => upd('name', e.target.value)} />
            <Input label={t('devices.serialNumber')} value={form.serial_number} onChange={e => upd('serial_number', e.target.value)} />
            <Select
              label={t('devices.type')}
              value={form.device_type}
              onChange={e => upd('device_type', e.target.value)}
              options={DEVICE_TYPE_OPTS}
            />
            <Select
              label={t('devices.zone')}
              value={form.zone_id}
              onChange={e => upd('zone_id', e.target.value)}
              options={[{ value:'', label: t('devices.selectZone') }, ...(zones || []).map(z => ({ value: z.zone_id, label: z.description || z.name }))]}
            />
            <Input label={t('devices.firmware')} value={form.firmware_version} onChange={e => upd('firmware_version', e.target.value)} />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</Btn>
              <Btn type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.create')}</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card-alt)' }}>
              {[t('devices.colName'), t('devices.colSerial'), t('devices.colType'), t('devices.colZone'), t('devices.colFirmware'), t('devices.colLastSeen'), t('devices.colStatus'), t('devices.colActions')].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deviceList.map(d => (
              <tr key={d.device_id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{d.name || '—'}</td>
                <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{d.serial_number}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{d.device_type}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{d.zone?.description || d.zone_id}</td>
                <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{d.firmware_version || '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{timeAgo(d.last_seen_at)}</td>
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
                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('devices.noDevices')}</td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
