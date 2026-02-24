import { useState, useEffect } from 'react';
import { usersApi } from '../api';
import { formatDate } from '../constants';

const INTERNAL_ROLES = [
  { value: 'SUPER_ADMIN',    label: 'Super Admin' },
  { value: 'LOAN_HEAD',      label: 'Loan Head' },
  { value: 'LOAN_EXECUTIVE', label: 'Loan Executive' },
];

const ROLE_BADGE = {
  SUPER_ADMIN:    'badge-blue',
  LOAN_HEAD:      'badge-purple',
  LOAN_EXECUTIVE: 'badge-grey',
};

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
          <div className="subtitle">Manage internal Nexthara staff accounts and access</div>
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
                <th>Branch</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.full_name || u.name}</strong>
                    {u.phone_e164 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.phone_e164}</div>}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.role] || 'badge-grey'}`}>
                      {INTERNAL_ROLES.find(r => r.value === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td>{u.branch_id || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {u.last_login_at ? formatDate(u.last_login_at) : '—'}
                  </td>
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
                        onClick={() => handleDelete(u.id, u.full_name || u.name)}
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
  const [name, setName] = useState(user?.full_name || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'LOAN_EXECUTIVE');
  const [phone, setPhone] = useState(user?.phone_e164 || '');
  const [branchId, setBranchId] = useState(user?.branch_id || '');
  const [isActive, setIsActive] = useState(user?.is_active !== undefined ? !!user.is_active : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = { name, full_name: name, role, phone_e164: phone || null, branch_id: branchId || null };
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

  const BRANCHES = [
    { value: 'BRN-HQ',  label: 'Head Office (Hyderabad)' },
    { value: 'BRN-BLR', label: 'Bangalore Branch' },
    { value: 'BRN-CLT', label: 'Calicut Branch' },
  ];

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480, height: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit User' : 'Add Staff User'}</h3>
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
            <label className="form-label">Phone (E.164 format)</label>
            <input className="form-control" placeholder="+919876543210" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
              {INTERNAL_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Branch</label>
            <select className="form-control" value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">Select branch...</option>
              {BRANCHES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>

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
