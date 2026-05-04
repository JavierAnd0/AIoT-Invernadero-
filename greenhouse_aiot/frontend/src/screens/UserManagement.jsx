import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getUsers, createUser, deleteUser } from '../api';
import { Card, Badge, Btn, Input, Select, LoadingSpinner, ErrorBanner } from '../ui';

const ROLE_COLOR = { admin: '#8b5cf6', operator: '#3b82f6', viewer: '#6b7280' };

export default function UserManagement() {
  const { data: usersData, loading, error, refetch } = useApi(getUsers);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username:'', full_name:'', email:'', password:'', role:'viewer' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const users = usersData?.users || (Array.isArray(usersData) ? usersData : []);

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      await createUser(form);
      refetch();
      setShowForm(false);
      setForm({ username:'', full_name:'', email:'', password:'', role:'viewer' });
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Could not create user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this user?')) return;
    setSaveError('');
    try {
      await deleteUser(id);
      refetch();
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Could not deactivate user');
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>User Management</h1>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{users.length} users</div>
        </div>
        <Btn onClick={() => setShowForm(f => !f)}>+ Add User</Btn>
      </div>

      <ErrorBanner message={error} />

      {showForm && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>New User</div>
          <ErrorBanner message={saveError} />
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Username" value={form.username} onChange={e => upd('username', e.target.value)} />
            <Input label="Full Name" value={form.full_name} onChange={e => upd('full_name', e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={e => upd('email', e.target.value)} />
            <Input label="Password" type="password" value={form.password} onChange={e => upd('password', e.target.value)} />
            <Select
              label="Role"
              value={form.role}
              onChange={e => upd('role', e.target.value)}
              options={['admin','operator','viewer'].map(r => ({ value: r, label: r }))}
            />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create'}</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <ErrorBanner message={saveError} />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Username', 'Full Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id} style={{ borderTop: '1px solid #f0f4f1' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{u.username}</td>
                <td style={{ padding: '10px 12px' }}>{u.full_name || '—'}</td>
                <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>{u.email || '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge label={u.role} color={ROLE_COLOR[u.role] || '#6b7280'} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge label={u.is_active ? 'Active' : 'Inactive'} color={u.is_active ? '#22c55e' : '#6b7280'} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {u.is_active && (
                    <Btn variant="danger" onClick={() => handleDeactivate(u.user_id)} style={{ fontSize: 11, padding: '4px 10px' }}>
                      Deactivate
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
