import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getZones, createZone, updateZone } from '../api';
import { Card, Badge, Btn, Input, LoadingSpinner, ErrorBanner } from '../ui';

export default function ZoneManagement() {
  const { data: zones, loading, error, refetch } = useApi(getZones);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', area_m2:'' });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const zoneList = Array.isArray(zones) ? zones : [];

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateZone(editing.zone_id, { ...form, area_m2: Number(form.area_m2) });
        setEditing(null);
      } else {
        await createZone({ ...form, area_m2: Number(form.area_m2) });
      }
      refetch();
      setShowForm(false);
      setForm({ name:'', description:'', area_m2:'' });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(z) {
    setEditing(z);
    setForm({ name: z.name || '', description: z.description || '', area_m2: String(z.area_m2 || '') });
    setShowForm(true);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Zone Management</h1>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{zoneList.length} zones</div>
        </div>
        <Btn onClick={() => { setShowForm(f => !f); setEditing(null); setForm({ name:'', description:'', area_m2:'' }); }}>
          + Add Zone
        </Btn>
      </div>

      <ErrorBanner message={error} />

      {showForm && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
            {editing ? 'Edit Zone' : 'New Zone'}
          </div>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Name" value={form.name} onChange={e => upd('name', e.target.value)} />
            <Input label="Area (m²)" type="number" value={form.area_m2} onChange={e => upd('area_m2', e.target.value)} />
            <Input label="Description" value={form.description} onChange={e => upd('description', e.target.value)} style={{ gridColumn: '1/-1' }} />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Btn>
            </div>
          </form>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {zoneList.map(z => (
          <Card key={z.zone_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                {z.description || z.name}
              </div>
              <Badge label={z.is_active ? 'Active' : 'Inactive'} color={z.is_active ? '#22c55e' : '#6b7280'} />
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              {z.area_m2 != null && <span>{z.area_m2} m²</span>}
              {z.name && <span style={{ marginLeft: 8 }}>· {z.name}</span>}
            </div>
            <Btn variant="ghost" onClick={() => startEdit(z)} style={{ width: '100%', fontSize: 11 }}>
              Edit
            </Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}
