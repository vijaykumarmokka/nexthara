import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { bankAdminApi } from '../../api';

const ROLES = ['BANK_SUPER_ADMIN', 'BANK_REGION_HEAD', 'BANK_BRANCH_MANAGER', 'BANK_OFFICER'];
const ROLE_COLORS = { BANK_SUPER_ADMIN: '#7c3aed', BANK_REGION_HEAD: '#1565c0', BANK_BRANCH_MANAGER: '#0d7377', BANK_OFFICER: '#374151' };
const ROLE_LABELS = { BANK_SUPER_ADMIN: 'National Head', BANK_REGION_HEAD: 'Region Head', BANK_BRANCH_MANAGER: 'Branch Manager', BANK_OFFICER: 'Officer' };

export default function BankUsersPage({ bankId, bankRole }) {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'BANK_OFFICER', branch_id: '', password: '' });

  const canEdit = bankRole === 'BANK_SUPER_ADMIN';

  const load = async () => {
    setLoading(true);
    try {
      const [u, b] = await Promise.all([bankAdminApi.getUsers(bankId), bankAdminApi.getBranches(bankId)]);
      setUsers(u); setBranches(b);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  };

  useEffect(() => { if (bankId) load(); }, [bankId]);

  const createUser = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('Name, email and password required');
    setSaving(true);
    try {
      await bankAdminApi.createUser(bankId, form);
      toast.success('User created');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', role: 'BANK_OFFICER', branch_id: '', password: '' });
      await load();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const toggleActive = async (user) => {
    try {
      await bankAdminApi.updateUser(user.id, { is_active: user.is_active ? 0 : 1 });
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
      await load();
    } catch (e) { toast.error(e.message); }
  };

  const filtered = users.filter(u =>
    (!search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter)
  );

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'Roboto, sans-serif' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0d7377', marginBottom: 2 }}>Bank Users</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{users.length} users · Role-based access control</div>
        </div>
        {canEdit && (
          <button onClick={() => setShowModal(true)} style={{ padding: '9px 18px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <i className="fas fa-user-plus" style={{ marginRight: 6 }}></i> Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }}></i>
          <input style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...inputStyle, width: 180 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 20 }}></i></div>}

      {/* Table */}
      {!loading && (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Name', 'Email', 'Phone', 'Role', 'Branch', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', letterSpacing: 0.5, borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>No users found</td></tr>
              )}
              {filtered.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: ROLE_COLORS[user.role] || '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {user.name[0].toUpperCase()}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{user.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{user.email}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>{user.phone || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: `${ROLE_COLORS[user.role]}20`, color: ROLE_COLORS[user.role], fontWeight: 600 }}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>{user.branch_name || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: user.is_active ? '#dcfce7' : '#f3f4f6', color: user.is_active ? '#16a34a' : '#6b7280', fontWeight: 600 }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {canEdit && (
                      <button onClick={() => toggleActive(user)} style={{ padding: '4px 10px', background: user.is_active ? '#fef2f2' : '#f0fdf4', color: user.is_active ? '#dc2626' : '#16a34a', border: `1px solid ${user.is_active ? '#fecaca' : '#bbf7d0'}`, borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} style={{ background: '#fff', borderRadius: 8, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${ROLE_COLORS[role]}` }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{ROLE_LABELS[role]}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: ROLE_COLORS[role] }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 520, maxWidth: '95vw', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Add Bank User</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              {[
                { label: 'Full Name *', key: 'name', placeholder: 'Ravi Kumar' },
                { label: 'Email *', key: 'email', type: 'email', placeholder: 'ravi@bank.com' },
                { label: 'Phone', key: 'phone', placeholder: '+91 98765 43210' },
                { label: 'Password *', key: 'password', type: 'password', placeholder: 'Min 8 chars' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type || 'text'} style={inputStyle} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Role *</label>
                <select style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Branch</label>
                <select style={inputStyle} value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">No Branch (National)</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createUser} disabled={saving} style={{ padding: '8px 16px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
