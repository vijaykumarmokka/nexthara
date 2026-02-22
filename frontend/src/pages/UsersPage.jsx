import { useState, useEffect } from 'react';
import { usersApi } from '../api';
import { BANKS } from '../constants';
import { formatDate } from '../constants';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  function loadUsers() {
    setLoading(true);
    usersApi.getUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  function handleDelete(id, name) {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    usersApi.deleteUser(id).then(loadUsers).catch(() => alert('Delete failed'));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>User Management</h2>
          <div className="subtitle">Manage portal users and their access</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditUser(null); setShowModal(true); }}>
          <i className="fas fa-plus"></i> Add User
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <table className="app-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Bank</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'super_admin' ? 'badge-blue' : 'badge-grey'}`}>
                      {u.role === 'super_admin' ? 'Super Admin' : 'Bank User'}
                    </span>
                  </td>
                  <td>{u.bank || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatDate(u.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn-icon"
                        title="Edit"
                        onClick={() => { setEditUser(u); setShowModal(true); }}
                      >
                        <i className="fas fa-pencil-alt"></i>
                      </button>
                      <button
                        className="btn-icon btn-icon-danger"
                        title="Delete"
                        onClick={() => handleDelete(u.id, u.name)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadUsers(); }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'bank_user');
  const [bank, setBank] = useState(user?.bank || '');
  const [isActive, setIsActive] = useState(user?.is_active !== undefined ? !!user.is_active : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = { name, role, bank: role === 'bank_user' ? bank : null };
      if (isEdit) {
        data.is_active = isActive;
        await usersApi.updateUser(user.id, data);
      } else {
        data.email = email;
        data.password = password;
        await usersApi.createUser(data);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480, height: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit User' : 'Add User'}</h3>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-control" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          {!isEdit && (
            <>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
              <option value="super_admin">Super Admin</option>
              <option value="bank_user">Bank User</option>
            </select>
          </div>

          {role === 'bank_user' && (
            <div className="form-group">
              <label className="form-label">Bank</label>
              <select className="form-control" value={bank} onChange={e => setBank(e.target.value)} required>
                <option value="">Select bank...</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}

          {isEdit && (
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={isActive ? '1' : '0'} onChange={e => setIsActive(e.target.value === '1')}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          )}

          {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
