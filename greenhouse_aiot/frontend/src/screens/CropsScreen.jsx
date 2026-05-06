import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { getCrops, createCrop, getCropTypes, getZones } from '../api';
import { Card, Badge, Btn, Input, Select, LoadingSpinner, ErrorBanner, STATUS_COLOR } from '../ui';

export default function CropsScreen({ zone }) {
  const { t } = useTranslation();
  const { currentRole: role } = useAuth();
  const canManage = role === 'admin' || role === 'operator';
  const { data: cropsData, loading, error, refetch } = useApi(
    () => getCrops(zone ? { zone_id: zone } : {}),
    [zone]
  );
  const { data: cropTypes } = useApi(getCropTypes);
  const { data: zones }     = useApi(getZones);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ batch_code:'', crop_type_id:'', zone_id:'', quantity:'' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const crops = Array.isArray(cropsData) ? cropsData : [];

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      await createCrop({
        batch_code:   form.batch_code,
        crop_type_id: Number(form.crop_type_id),
        zone_id:      Number(form.zone_id),
        quantity:     Number(form.quantity),
        planted_at:   new Date().toISOString().slice(0, 10),
      });
      refetch();
      setShowForm(false);
      setForm({ batch_code:'', crop_type_id:'', zone_id:'', quantity:'' });
    } catch (err) {
      setSaveError(err.response?.data?.error || t('crops.couldNotCreate'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('crops.title')}</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{t('crops.count', { count: crops.length })}</div>
        </div>
        {canManage && (
          <Btn onClick={() => setShowForm(f => !f)}>{t('crops.newBatchBtn')}</Btn>
        )}
      </div>

      <ErrorBanner message={error} />
      {!canManage && <ErrorBanner message={t('crops.viewOnlyMsg')} />}

      {showForm && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 14 }}>{t('crops.newBatch')}</div>
          <ErrorBanner message={saveError} />
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label={t('crops.batchCode')} value={form.batch_code} onChange={e => upd('batch_code', e.target.value)} />
            <Input label={t('crops.quantity')} type="number" value={form.quantity} onChange={e => upd('quantity', e.target.value)} />
            <Select
              label={t('crops.cropType')}
              value={form.crop_type_id}
              onChange={e => upd('crop_type_id', e.target.value)}
              options={[{ value:'', label: t('common.select') }, ...(cropTypes || []).map(tp => ({ value: tp.crop_type_id, label: tp.name }))]}
            />
            <Select
              label={t('crops.zone')}
              value={form.zone_id}
              onChange={e => upd('zone_id', e.target.value)}
              options={[{ value:'', label: t('common.select') }, ...(zones || []).map(z => ({ value: z.zone_id, label: z.description || z.name }))]}
            />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</Btn>
              <Btn type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.create')}</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card-alt)' }}>
              {[t('crops.colBatch'), t('crops.colCropType'), t('crops.colZone'), t('crops.colStatus'), t('crops.colQuantity'), t('crops.colProgress'), t('crops.colDaysLeft')].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crops.map(c => {
              const daysElapsed = Math.floor((Date.now() - new Date(c.planted_at)) / 86400000);
              const growthDays  = c.crop_type?.growth_days || 60;
              const daysLeft    = Math.max(0, growthDays - daysElapsed);
              const pct         = Math.min(100, Math.round((daysElapsed / growthDays) * 100));
              return (
                <tr key={c.crop_id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{c.batch_code}</td>
                  <td style={{ padding: '10px 12px' }}>{c.crop_type?.name || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{c.zone?.description || c.zone_id}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge label={c.status} color={STATUS_COLOR[c.status] || '#6b7280'} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>{c.quantity}</td>
                  <td style={{ padding: '10px 12px', minWidth: 100 }}>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#22c55e', borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{pct}%</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{daysLeft}d</td>
                </tr>
              );
            })}
            {crops.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('crops.noCrops')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
