import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getCropTypes, createCropType } from '../api';
import { Card, Btn, Input, LoadingSpinner, ErrorBanner } from '../ui';

export default function CropTypeCatalog() {
  const { data: cropTypes, loading, error, refetch } = useApi(getCropTypes);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name:'', scientific_name:'', temp_optimal:'', humidity_min:'', humidity_max:'',
    light_min_lux:'', light_max_lux:'', growth_days:'', co2_optimal:'',
  });

  const types = Array.isArray(cropTypes) ? cropTypes : [];
  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createCropType({
        name:            form.name,
        scientific_name: form.scientific_name,
        temp_optimal:    Number(form.temp_optimal),
        humidity_min:    Number(form.humidity_min),
        humidity_max:    Number(form.humidity_max),
        light_min_lux:   Number(form.light_min_lux),
        light_max_lux:   Number(form.light_max_lux),
        growth_days:     Number(form.growth_days),
        co2_optimal:     Number(form.co2_optimal) || null,
      });
      refetch();
      setShowForm(false);
      setForm({ name:'', scientific_name:'', temp_optimal:'', humidity_min:'', humidity_max:'', light_min_lux:'', light_max_lux:'', growth_days:'', co2_optimal:'' });
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
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Common Name" value={form.name} onChange={e => upd('name', e.target.value)} />
            <Input label="Scientific Name" value={form.scientific_name} onChange={e => upd('scientific_name', e.target.value)} />
            <Input label="Optimal Temp (°C)" type="number" value={form.temp_optimal} onChange={e => upd('temp_optimal', e.target.value)} />
            <Input label="Growth Days" type="number" value={form.growth_days} onChange={e => upd('growth_days', e.target.value)} />
            <Input label="Humidity Min (%)" type="number" value={form.humidity_min} onChange={e => upd('humidity_min', e.target.value)} />
            <Input label="Humidity Max (%)" type="number" value={form.humidity_max} onChange={e => upd('humidity_max', e.target.value)} />
            <Input label="Light Min (lux)" type="number" value={form.light_min_lux} onChange={e => upd('light_min_lux', e.target.value)} />
            <Input label="Light Max (lux)" type="number" value={form.light_max_lux} onChange={e => upd('light_max_lux', e.target.value)} />
            <Input label="CO₂ Optimal (ppm)" type="number" value={form.co2_optimal} onChange={e => upd('co2_optimal', e.target.value)} />
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
                ['Growth Days', `${t.growth_days ?? '—'}d`],
                ['Humidity', `${t.humidity_min}–${t.humidity_max}%`],
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
