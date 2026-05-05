import { useState } from 'react';
import { useApi }  from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { getUsers, inviteMember, deleteUser, updateUser } from '../api';
import { Card, Badge, Btn, Input, Select, LoadingSpinner, ErrorBanner } from '../ui';

/*
 * User Management — tenant-scoped
 *
 * Creating a user calls POST /tenants/<id>/members with create_user=true,
 * which is the correct multi-tenant endpoint.  POST /users/ does not exist.
 *
 * The list returned by GET /users/ merges user + membership data. The active
 * flag comes back as `member_active` (from tenant_memberships.is_active),
 * NOT as `is_active` (which is the global user flag).
 */

const ROLE_COLOR = { admin: '#8b5cf6', operator: '#3b82f6', viewer: '#6b7280' };

const EMPTY_FORM = {
  username: '', full_name: '', email: '', password: '', role: 'viewer',
};

export default function UserManagement() {
  const { currentTenantId } = useAuth();
  const { data: usersData, loading, error, refetch } = useApi(getUsers);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState('');

  const users = usersData?.users || (Array.isArray(usersData) ? usersData : []);

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    if (!currentTenantId) {
      setSaveError('No active tenant — please re-login.');
      return;
    }
    setSaveError('');
    setSaving(true);
    try {
      // POST /tenants/<id>/members with create_user=true creates the user
      // account AND the membership in a single call.
      await inviteMember(currentTenantId, { ...form, create_user: true });
      refetch();
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Could not create user');
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId, role) {
    setSaveError('');
    try {
      // PUT /users/<id> updates role on the tenant_membership
      await updateUser(userId, { role });
      refetch();
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Could not update role');
    }
  }

  async function handleDeactivate(userId) {
    if (!confirm('Deactivate this user?')) return;
    setSaveError('');
    try {
      // DELETE /users/<id> sets membership.is_active = false
      await deleteUser(userId);
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
            <Input label="Username *"  value={form.username}  onChange={e => upd('username',  e.target.value)} required />
            <Input label="Full Name *" value={form.full_name} onChange={e => upd('full_name', e.target.value)} required />
            <Input label="Email *"     type="email" value={form.email} onChange={e => upd('email', e.target.value)} required />
            <Input label="Password *"  type="password" value={form.password} onChange={e => upd('password', e.target.value)} required />
            <Select
              label="Role"
              value={form.role}
              onChange={e => upd('role', e.target.value)}
              options={['admin', 'operator', 'viewer'].map(r => ({ value: r, label: r }))}
            />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create'}</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {saveError && !showForm && <ErrorBanner message={saveError} />}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Username', 'Full Name', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id} style={{ borderTop: '1px solid #f0f4f1' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                  {u.username}
                </td>
                <td style={{ padding: '10px 12px' }}>{u.full_name || '—'}</td>
                <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>{u.email || '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  {/* role comes from tenant_memberships, not global users.role */}
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.user_id, e.target.value)}
                    style={{
                      fontSize: 12, padding: '3px 6px', borderRadius: 6,
                      border: '1px solid #d1d5db',
                      color: ROLE_COLOR[u.role] || '#6b7280',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {['admin', 'operator', 'viewer'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {/* member_active = tenant_memberships.is_active (not global users.is_active) */}
                  <Badge
                    label={u.member_active ? 'Active' : 'Inactive'}
                    color={u.member_active ? '#22c55e' : '#6b7280'}
                  />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {u.member_active && (
                    <Btn
                      variant="danger"
                      onClick={() => handleDeactivate(u.user_id)}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Deactivate
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
