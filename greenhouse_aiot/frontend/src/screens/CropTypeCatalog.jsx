import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getCropTypes, createCropType } from '../api';
import { Card, Btn, Input, LoadingSpinner, ErrorBanner } from '../ui';

export default function CropTypeCatalog() {
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
      setSaveError(err.response?.data?.error || 'Could not create crop type');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Crop Type Catalog</h1>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{types.length} types</div>
        </div>
        <Btn onClick={() => setShowForm(f => !f)}>+ Add Crop Type</Btn>
      </div>

      <ErrorBanner message={error} />

      {showForm && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>New Crop Type</div>
          <ErrorBanner message={saveError} />
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Common Name" value={form.name} onChange={e => upd('name', e.target.value)} />
            <Input label="Scientific Name" value={form.scientific_name} onChange={e => upd('scientific_name', e.target.value)} />
            <Input label="Description" value={form.description} onChange={e => upd('description', e.target.value)} style={{ gridColumn: '1/-1' }} />
            <Input label="Min Temp (°C)" type="number" value={form.temp_min} onChange={e => upd('temp_min', e.target.value)} />
            <Input label="Max Temp (°C)" type="number" value={form.temp_max} onChange={e => upd('temp_max', e.target.value)} />
            <Input label="Optimal Temp (°C)" type="number" value={form.temp_optimal} onChange={e => upd('temp_optimal', e.target.value)} />
            <Input label="Growth Days" type="number" value={form.growth_days} onChange={e => upd('growth_days', e.target.value)} />
            <Input label="Humidity Min (%)" type="number" value={form.humidity_min} onChange={e => upd('humidity_min', e.target.value)} />
            <Input label="Humidity Max (%)" type="number" value={form.humidity_max} onChange={e => upd('humidity_max', e.target.value)} />
            <Input label="pH Min" type="number" value={form.ph_min} onChange={e => upd('ph_min', e.target.value)} />
            <Input label="pH Max" type="number" value={form.ph_max} onChange={e => upd('ph_max', e.target.value)} />
            <Input label="Light Min (lux)" type="number" value={form.light_min_lux} onChange={e => upd('light_min_lux', e.target.value)} />
            <Input label="Light Max (lux)" type="number" value={form.light_max_lux} onChange={e => upd('light_max_lux', e.target.value)} />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create'}</Btn>
            </div>
          </form>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {types.map(t => (
          <Card key={t.crop_type_id}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 2 }}>{t.name}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginBottom: 12 }}>{t.scientific_name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['Temp Optimal', `${t.temp_optimal ?? '—'}°C`],
                ['Temp Range', `${t.temp_min ?? '—'}–${t.temp_max ?? '—'}°C`],
                ['Growth Days', `${t.growth_days ?? '—'}d`],
                ['Humidity', `${t.humidity_min}–${t.humidity_max}%`],
                ['pH', `${t.ph_min}–${t.ph_max}`],
                ['Light', `${t.light_min_lux}–${t.light_max_lux} lux`],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#374151', fontFamily: "'DM Mono', monospace" }}>{val}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
