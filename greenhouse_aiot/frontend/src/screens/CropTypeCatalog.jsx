import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { getCropTypes, createCropType } from '../api';
import { Card, Btn, Input, LoadingSpinner, ErrorBanner } from '../ui';

export default function CropTypeCatalog() {
  const { t } = useTranslation();
  const { data: cropTypes, loading, error, refetch } = useApi(getCropTypes);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    name:'', scientific_name:'', description:'', temp_min:'', temp_max:'', temp_optimal:'',
    humidity_min:'', humidity_max:'', ph_min:'', ph_max:'', light_min_lux:'', light_max_lux:'',
    growth_days:'',
  });

  const types = Array.isArray(cropTypes) ? cropTypes : [];
  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    setSaveError('');
    if (!form.name.trim()) { setSaveError(t('cropTypes.nameRequired')); return; }
    setSaving(true);
    try {
      await createCropType({
        name:            form.name,
        scientific_name: form.scientific_name,
        description:     form.description,
        temp_min:        Number(form.temp_min),
        temp_max:        Number(form.temp_max),
        temp_optimal:    Number(form.temp_optimal),
        humidity_min:    Number(form.humidity_min),
        humidity_max:    Number(form.humidity_max),
        ph_min:          Number(form.ph_min),
        ph_max:          Number(form.ph_max),
        light_min_lux:   Number(form.light_min_lux),
        light_max_lux:   Number(form.light_max_lux),
        growth_days:     Number(form.growth_days),
      });
      refetch();
      setShowForm(false);
      setForm({
        name:'', scientific_name:'', description:'', temp_min:'', temp_max:'', temp_optimal:'',
        humidity_min:'', humidity_max:'', ph_min:'', ph_max:'', light_min_lux:'', light_max_lux:'',
        growth_days:'',
      });
    } catch (err) {
      setSaveError(err.response?.data?.error || t('cropTypes.couldNotCreate'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('cropTypes.title')}</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{t('cropTypes.count', { count: types.length })}</div>
        </div>
        <Btn onClick={() => setShowForm(f => !f)}>{t('cropTypes.addBtn')}</Btn>
      </div>

      <ErrorBanner message={error} />

      {showForm && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: 'var(--text-primary)' }}>{t('cropTypes.newTitle')}</div>
          <ErrorBanner message={saveError} />
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label={t('cropTypes.commonName')} value={form.name} onChange={e => upd('name', e.target.value)} />
            <Input label={t('cropTypes.scientificName')} value={form.scientific_name} onChange={e => upd('scientific_name', e.target.value)} />
            <Input label={t('cropTypes.description')} value={form.description} onChange={e => upd('description', e.target.value)} style={{ gridColumn: '1/-1' }} />
            <Input label={t('cropTypes.tempMin')} type="number" value={form.temp_min} onChange={e => upd('temp_min', e.target.value)} />
            <Input label={t('cropTypes.tempMax')} type="number" value={form.temp_max} onChange={e => upd('temp_max', e.target.value)} />
            <Input label={t('cropTypes.tempOptimal')} type="number" value={form.temp_optimal} onChange={e => upd('temp_optimal', e.target.value)} />
            <Input label={t('cropTypes.growthDays')} type="number" value={form.growth_days} onChange={e => upd('growth_days', e.target.value)} />
            <Input label={t('cropTypes.humidityMin')} type="number" value={form.humidity_min} onChange={e => upd('humidity_min', e.target.value)} />
            <Input label={t('cropTypes.humidityMax')} type="number" value={form.humidity_max} onChange={e => upd('humidity_max', e.target.value)} />
            <Input label={t('cropTypes.phMin')} type="number" value={form.ph_min} onChange={e => upd('ph_min', e.target.value)} />
            <Input label={t('cropTypes.phMax')} type="number" value={form.ph_max} onChange={e => upd('ph_max', e.target.value)} />
            <Input label={t('cropTypes.lightMin')} type="number" value={form.light_min_lux} onChange={e => upd('light_min_lux', e.target.value)} />
            <Input label={t('cropTypes.lightMax')} type="number" value={form.light_max_lux} onChange={e => upd('light_max_lux', e.target.value)} />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</Btn>
              <Btn type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.create')}</Btn>
            </div>
          </form>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {types.map(tp => (
          <Card key={tp.crop_type_id}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>{tp.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 12 }}>{tp.scientific_name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                [t('cropTypes.cardTempOptimal'), `${tp.temp_optimal ?? '—'}°C`],
                [t('cropTypes.cardTempRange'), `${tp.temp_min ?? '—'}–${tp.temp_max ?? '—'}°C`],
                [t('cropTypes.cardGrowthDays'), `${tp.growth_days ?? '—'}d`],
                [t('cropTypes.cardHumidity'), `${tp.humidity_min}–${tp.humidity_max}%`],
                [t('cropTypes.cardPh'), `${tp.ph_min}–${tp.ph_max}`],
                [t('cropTypes.cardLight'), `${tp.light_min_lux}–${tp.light_max_lux} lux`],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: "'DM Mono', monospace" }}>{val}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
