import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { bankAdminApi } from '../../api';

export default function BankBranchesPage({ bankId, bankRole }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ branch_name: '', region: '', state: '', city: '' });

  const canEdit = bankRole === 'SUPER_ADMIN';

  const load = async () => {
    setLoading(true);
    try {
      const data = await bankAdminApi.getBranches(bankId);
      setBranches(data);
    } catch { toast.error('Failed to load branches'); }
    setLoading(false);
  };

  useEffect(() => { if (bankId) load(); }, [bankId]);

  const openAdd = () => { setEditBranch(null); setForm({ branch_name: '', region: '', state: '', city: '' }); setShowModal(true); };
  const openEdit = (b) => { setEditBranch(b); setForm({ branch_name: b.branch_name, region: b.region || '', state: b.state || '', city: b.city || '' }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (editBranch) {
        await bankAdminApi.updateBranch(editBranch.id, form);
        toast.success('Branch updated');
      } else {
        await bankAdminApi.createBranch(bankId, form);
        toast.success('Branch created');
      }
      setShowModal(false);
      await load();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'Roboto, sans-serif' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0d7377', marginBottom: 2 }}>Branch Network</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{branches.length} branches configured</div>
        </div>
        {canEdit && (
          <button onClick={openAdd} style={{ padding: '9px 18px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }}></i> Add Branch
          </button>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 20 }}></i></div>}

      {!loading && branches.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 60, textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <i className="fas fa-sitemap" style={{ fontSize: 36, marginBottom: 12, display: 'block' }}></i>
          No branches configured yet
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {branches.map(branch => (
          <div key={branch.id} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{branch.branch_name}</div>
                {branch.region && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{branch.region}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: branch.is_active ? '#dcfce7' : '#f3f4f6', color: branch.is_active ? '#16a34a' : '#6b7280', fontWeight: 600 }}>
                  {branch.is_active ? 'Active' : 'Inactive'}
                </span>
                {canEdit && (
                  <button onClick={() => openEdit(branch)} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                    <i className="fas fa-edit"></i>
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'State', value: branch.state },
                { label: 'City', value: branch.city },
                { label: 'Officers', value: branch.user_count || 0 },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f9fafb', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{value || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{editBranch ? 'Edit Branch' : 'Add Branch'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Branch Name *', key: 'branch_name', full: true, placeholder: 'e.g. Mumbai Central Branch' },
                { label: 'Region', key: 'region', placeholder: 'e.g. West' },
                { label: 'State', key: 'state', placeholder: 'e.g. Maharashtra' },
                { label: 'City', key: 'city', placeholder: 'e.g. Mumbai' },
              ].map(({ label, key, full, placeholder }) => (
                <div key={key} style={full ? { gridColumn: '1/-1' } : {}}>
                  <label style={labelStyle}>{label}</label>
                  <input style={inputStyle} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              {editBranch && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.is_active ? 1 : 0} onChange={e => setForm(f => ({ ...f, is_active: parseInt(e.target.value) }))}>
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.branch_name} style={{ padding: '8px 16px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: saving || !form.branch_name ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editBranch ? 'Update Branch' : 'Create Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
