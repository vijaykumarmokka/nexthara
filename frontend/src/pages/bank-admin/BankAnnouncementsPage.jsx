import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { bankAdminApi } from '../../api';

const VISIBLE_TO_OPTIONS = ['ALL', 'REGION', 'BRANCH'];
const VISIBLE_COLORS = { ALL: '#1565c0', REGION: '#7c3aed', BRANCH: '#0d7377' };

export default function BankAnnouncementsPage({ bankId, bankRole }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', attachment_url: '', visible_to: 'ALL' });

  const canCreate = bankRole === 'BANK_SUPER_ADMIN';

  const load = async () => {
    setLoading(true);
    try { setItems((await bankAdminApi.getAnnouncements(bankId)) || []); } catch { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { if (bankId) load(); }, [bankId]);

  const create = async () => {
    if (!form.title) return toast.error('Title required');
    setSaving(true);
    try {
      await bankAdminApi.createAnnouncement(bankId, form);
      toast.success('Announcement posted');
      setShowModal(false);
      setForm({ title: '', description: '', attachment_url: '', visible_to: 'ALL' });
      await load();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await bankAdminApi.deleteAnnouncement(id);
      toast.success('Deleted');
      await load();
    } catch (e) { toast.error(e.message); }
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'Roboto, sans-serif' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0d7377', marginBottom: 2 }}>Bank Announcements</h2>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Policy updates, product changes, posters & notifications</div>
        </div>
        {canCreate && (
          <button onClick={() => setShowModal(true)} style={{ padding: '9px 18px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <i className="fas fa-bullhorn" style={{ marginRight: 6 }}></i> New Announcement
          </button>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 20 }}></i></div>}

      {!loading && items.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 60, textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <i className="fas fa-bullhorn" style={{ fontSize: 36, marginBottom: 12, display: 'block' }}></i>
          No announcements yet
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{item.title}</div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: `${VISIBLE_COLORS[item.visible_to] || '#6b7280'}20`, color: VISIBLE_COLORS[item.visible_to] || '#6b7280', fontWeight: 600 }}>
                    {item.visible_to}
                  </span>
                </div>
                {item.description && <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 8 }}>{item.description}</div>}
                {item.attachment_url && (
                  <a href={item.attachment_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1565c0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="fas fa-paperclip"></i> Attachment
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{item.created_at?.slice(0, 10)}</div>
                {canCreate && (
                  <button onClick={() => del(item.id)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, padding: '4px 8px', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 520, maxWidth: '95vw', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>New Announcement</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. New Product Launched: Global Ed-Vantage" />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, height: 100, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed announcement message..." />
              </div>
              <div>
                <label style={labelStyle}>Attachment URL</label>
                <input style={inputStyle} value={form.attachment_url} onChange={e => setForm(f => ({ ...f, attachment_url: e.target.value }))} placeholder="https://... (link to PDF, poster, etc.)" />
              </div>
              <div>
                <label style={labelStyle}>Visible To</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {VISIBLE_TO_OPTIONS.map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, visible_to: opt }))} style={{
                      flex: 1, padding: '8px 0', border: `1px solid ${form.visible_to === opt ? VISIBLE_COLORS[opt] : '#d1d5db'}`,
                      borderRadius: 6, background: form.visible_to === opt ? `${VISIBLE_COLORS[opt]}15` : '#fff',
                      color: form.visible_to === opt ? VISIBLE_COLORS[opt] : '#6b7280', fontWeight: form.visible_to === opt ? 600 : 400,
                      fontSize: 13, cursor: 'pointer',
                    }}>{opt}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={create} disabled={saving || !form.title} style={{ padding: '8px 16px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', opacity: saving || !form.title ? 0.6 : 1 }}>
                {saving ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
