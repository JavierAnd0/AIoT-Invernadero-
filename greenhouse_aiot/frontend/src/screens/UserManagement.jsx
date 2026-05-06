import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { currentTenantId, user: currentUser } = useAuth();
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
      setSaveError(t('users.noActiveTenant'));
      return;
    }
    setSaveError('');
    setSaving(true);
    try {
      await inviteMember(currentTenantId, { ...form, create_user: true });
      refetch();
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setSaveError(err.response?.data?.error || t('users.couldNotCreate'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId, role) {
    setSaveError('');
    try {
      await updateUser(userId, { role });
      refetch();
    } catch (err) {
      setSaveError(err.response?.data?.error || t('users.couldNotUpdate'));
    }
  }

  async function handleDeactivate(userId) {
    if (!confirm(t('users.confirmDeactivate'))) return;
    setSaveError('');
    try {
      await deleteUser(userId);
      refetch();
    } catch (err) {
      setSaveError(err.response?.data?.error || t('users.couldNotDeactivate'));
    }
  }

  async function handleReactivate(user) {
    if (!currentTenantId) return;
    setSaveError('');
    try {
      await inviteMember(currentTenantId, { email: user.email, role: user.role });
      refetch();
    } catch (err) {
      setSaveError(err.response?.data?.error || t('users.couldNotReactivate'));
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{t('users.title')}</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{t('users.count', { count: users.length })}</div>
        </div>
        <Btn onClick={() => setShowForm(f => !f)}>{t('users.addBtn')}</Btn>
      </div>

      <ErrorBanner message={error} />

      {showForm && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: 'var(--text-primary)' }}>{t('users.newUser')}</div>
          <ErrorBanner message={saveError} />
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label={t('users.usernameLabel')}  value={form.username}  onChange={e => upd('username',  e.target.value)} required />
            <Input label={t('users.fullNameLabel')} value={form.full_name} onChange={e => upd('full_name', e.target.value)} required />
            <Input label={t('users.emailLabel')}     type="email" value={form.email} onChange={e => upd('email', e.target.value)} required />
            <Input label={t('users.passwordLabel')}  type="password" value={form.password} onChange={e => upd('password', e.target.value)} required minLength={8} />
            <Select
              label={t('users.roleLabel')}
              value={form.role}
              onChange={e => upd('role', e.target.value)}
              options={['admin', 'operator', 'viewer'].map(r => ({ value: r, label: r }))}
            />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</Btn>
              <Btn type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.create')}</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {saveError && !showForm && <ErrorBanner message={saveError} />}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card-alt)' }}>
              {[t('users.colUsername'), t('users.colFullName'), t('users.colEmail'), t('users.colRole'), t('users.colStatus'), t('users.colActions')].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isSelf = u.user_id === currentUser?.user_id;
              return (
              <tr key={u.user_id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                  {u.username}
                  {isSelf && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: '#22c55e', fontWeight: 700 }}>{t('users.you')}</span>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>{u.full_name || '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{u.email || '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  {isSelf ? (
                    <span style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLOR[u.role] || '#6b7280' }}>
                      {u.role}
                    </span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.user_id, e.target.value)}
                      style={{
                        fontSize: 12, padding: '3px 6px', borderRadius: 6,
                        border: '1px solid var(--input-border)',
                        background: 'var(--input-bg)',
                        color: ROLE_COLOR[u.role] || 'var(--text-secondary)',
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {['admin', 'operator', 'viewer'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge
                    label={u.member_active ? t('users.active') : t('users.inactive')}
                    color={u.member_active ? '#22c55e' : '#6b7280'}
                  />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {isSelf ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                  ) : u.member_active ? (
                    <Btn variant="danger" onClick={() => handleDeactivate(u.user_id)} style={{ fontSize: 11, padding: '4px 10px' }}>
                      {t('users.deactivate')}
                    </Btn>
                  ) : (
                    <Btn variant="ghost" onClick={() => handleReactivate(u)} style={{ fontSize: 11, padding: '4px 10px' }}>
                      {t('users.reactivate')}
                    </Btn>
                  )}
                </td>
              </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {t('users.noUsers')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
