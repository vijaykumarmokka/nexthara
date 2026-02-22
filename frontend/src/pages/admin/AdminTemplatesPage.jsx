import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import toast from 'react-hot-toast';

const CATEGORIES = ['WELCOME', 'REMINDER', 'STATUS_UPDATE', 'DOCS_REQUEST', 'ESCALATION', 'CAMPAIGN'];
const CHANNELS = ['WHATSAPP', 'EMAIL', 'SMS'];
const CHANNEL_COLOR = { WHATSAPP: '#25d366', EMAIL: '#1e88e5', SMS: '#fb8c00' };

const EMPTY_FORM = { name: '', category: 'REMINDER', channel: 'WHATSAPP', language: 'en', body: '', variables_json: '[]' };

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [filterCh, setFilterCh] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterCat) params.category = filterCat;
    if (filterCh) params.channel = filterCh;
    adminApi.getTemplates(params).then(setTemplates).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [filterCat, filterCh]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({ name: t.name, category: t.category, channel: t.channel, language: t.language, body: t.body, variables_json: JSON.stringify(t.variables_json || [], null, 2) });
    setShowModal(true);
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = { ...form, variables_json: JSON.parse(form.variables_json || '[]') };
      if (editing) { await adminApi.updateTemplate(editing.id, payload); toast.success('Template updated'); }
      else { await adminApi.createTemplate(payload); toast.success('Template created'); }
      setShowModal(false);
      load();
    } catch(e) { toast.error(e.message || 'Save failed'); } finally { setSaving(false); }
  };

  const toggle = async (t) => {
    await adminApi.updateTemplate(t.id, { is_active: !t.is_active });
    load();
  };

  const del = async (t) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await adminApi.deleteTemplate(t.id);
    toast.success('Deleted');
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1d4d' }}>Message Templates</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>WhatsApp, Email, and SMS templates for all communication triggers</div>
        </div>
        <button onClick={openCreate} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-plus"></i> New Template
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 12, color: '#374151' }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterCh} onChange={e => setFilterCh(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 12, color: '#374151' }}>
          <option value="">All Channels</option>
          {CHANNELS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-spinner fa-spin"></i></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {templates.map(t => (
            <div key={t.id} style={{ background: '#fff', borderRadius: 10, padding: 18, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', borderTop: `3px solid ${CHANNEL_COLOR[t.channel] || '#6b7280'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d4d' }}>{t.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                    <span style={{ background: (CHANNEL_COLOR[t.channel] || '#6b7280') + '18', color: CHANNEL_COLOR[t.channel] || '#6b7280', padding: '2px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{t.channel}</span>
                    <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 7px', borderRadius: 8, fontSize: 10, fontWeight: 600 }}>{t.category}</span>
                    <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 7px', borderRadius: 8, fontSize: 10 }}>{t.language?.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(t)} style={{ background: '#eff6ff', color: '#1e88e5', border: 'none', borderRadius: 5, padding: '5px 8px', cursor: 'pointer', fontSize: 11 }}><i className="fas fa-edit"></i></button>
                  <button onClick={() => del(t)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 5, padding: '5px 8px', cursor: 'pointer', fontSize: 11 }}><i className="fas fa-trash"></i></button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#4b5563', background: '#f9fafb', borderRadius: 6, padding: '8px 10px', maxHeight: 72, overflow: 'hidden', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{t.body}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{t.id}</div>
                <button onClick={() => toggle(t)} style={{ background: t.is_active ? '#dcfce7' : '#fee2e2', color: t.is_active ? '#16a34a' : '#dc2626', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                  {t.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#9ca3af' }}>No templates found</div>
          )}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1d4d', marginBottom: 20 }}>{editing ? 'Edit Template' : 'New Message Template'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Docs Reminder - WhatsApp" style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Channel</label>
                  <select value={form.channel} onChange={e => setForm(f => ({...f, channel: e.target.value}))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Language</label>
                  <input value={form.language} onChange={e => setForm(f => ({...f, language: e.target.value}))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Body *</label>
                <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} rows={5} placeholder="Hi {{student_name}}, your documents for {{university}} are required..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Variables (JSON Array)</label>
                <textarea value={form.variables_json} onChange={e => setForm(f => ({...f, variables_json: e.target.value}))} rows={2} placeholder='["student_name", "university"]' style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', border: '1px solid #d1d5db', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name || !form.body} style={{ padding: '8px 22px', border: 'none', borderRadius: 7, background: '#1a1d4d', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving || !form.name || !form.body ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
