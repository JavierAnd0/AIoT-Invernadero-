import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi }  from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { getUsers, deleteUser, updateUser } from '../api';
import { Card, Badge, Btn, LoadingSpinner, ErrorBanner } from '../ui';

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

export default function UserManagement() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { data: usersData, loading, error, refetch } = useApi(getUsers);
  const [saveError,  setSaveError]  = useState('');

  const users = usersData?.users || (Array.isArray(usersData) ? usersData : []);



  async function handleRoleChange(userId, role) {
    setSaveError('');
    try {
      await updateUser(userId, { role: role.toUpperCase() });
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
    setSaveError('');
    try {
      await updateUser(user.id, { isActive: true });
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
      </div>

      <ErrorBanner message={error} />



      <Card>
        {saveError && <ErrorBanner message={saveError} />}
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
              const isSelf = u.id === currentUser?.user_id || u.username === currentUser?.username;
              const normalizedRole = u.role?.toLowerCase() || 'viewer';
              return (
              <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                  {u.username}
                  {isSelf && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: '#22c55e', fontWeight: 700 }}>{t('users.you')}</span>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>{u.fullName || '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{u.email || '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  {isSelf ? (
                    <span style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLOR[normalizedRole] || '#6b7280' }}>
                      {normalizedRole}
                    </span>
                  ) : (
                    <select
                      value={normalizedRole}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      style={{
                        fontSize: 12, padding: '3px 6px', borderRadius: 6,
                        border: '1px solid var(--input-border)',
                        background: 'var(--input-bg)',
                        color: ROLE_COLOR[normalizedRole] || 'var(--text-secondary)',
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
                    label={u.active ? t('users.active') : t('users.inactive')}
                    color={u.active ? '#22c55e' : '#6b7280'}
                  />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {isSelf ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                  ) : u.active ? (
                    <Btn variant="danger" onClick={() => handleDeactivate(u.id)} style={{ fontSize: 11, padding: '4px 10px' }}>
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
