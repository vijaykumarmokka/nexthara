import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import toast from 'react-hot-toast';

const SCOPES = ['LEAD', 'CASE', 'BANK_APP', 'EVENT'];
const TRIGGERS = ['ON_CREATE', 'ON_STAGE_CHANGE', 'TIME_BASED', 'SLA_BREACH'];
const SCOPE_COLOR = { LEAD: '#1e88e5', CASE: '#7b1fa2', BANK_APP: '#00897b', EVENT: '#e53935' };
const TRIGGER_COLOR = { ON_CREATE: '#43a047', ON_STAGE_CHANGE: '#fb8c00', TIME_BASED: '#0288d1', SLA_BREACH: '#e53935' };

const EMPTY_FORM = { name: '', scope: 'LEAD', trigger_type: 'ON_CREATE', priority: 0, conditions: '{}', actions: '[]' };

export default function AdminAutomationsPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getAutomationRules().then(setRules).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name, scope: r.scope, trigger_type: r.trigger_type, priority: r.priority, conditions: JSON.stringify(r.conditions, null, 2), actions: JSON.stringify(r.actions, null, 2) });
    setShowModal(true);
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = { ...form, conditions: JSON.parse(form.conditions || '{}'), actions: JSON.parse(form.actions || '[]'), priority: Number(form.priority) };
      if (editing) { await adminApi.updateAutomationRule(editing.id, payload); toast.success('Rule updated'); }
      else { await adminApi.createAutomationRule(payload); toast.success('Rule created'); }
      setShowModal(false);
      load();
    } catch(e) { toast.error(e.message || 'Save failed'); } finally { setSaving(false); }
  };

  const toggle = async (r) => {
    await adminApi.updateAutomationRule(r.id, { is_active: !r.is_active });
    load();
  };

  const del = async (r) => {
    if (!confirm(`Delete rule "${r.name}"?`)) return;
    await adminApi.deleteAutomationRule(r.id);
    toast.success('Deleted');
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1d4d' }}>Automation Rules</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Configure trigger-based automation for leads, cases, and bank apps</div>
        </div>
        <button onClick={openCreate} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-plus"></i> New Rule
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-spinner fa-spin"></i></div> : (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['ID', 'Name', 'Scope', 'Trigger', 'Priority', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}>{r.id}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a1d4d' }}>{r.name}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: (SCOPE_COLOR[r.scope] || '#6b7280') + '18', color: SCOPE_COLOR[r.scope] || '#6b7280', padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{r.scope}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: (TRIGGER_COLOR[r.trigger_type] || '#6b7280') + '18', color: TRIGGER_COLOR[r.trigger_type] || '#6b7280', padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{r.trigger_type}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{r.priority}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggle(r)} style={{ background: r.is_active ? '#dcfce7' : '#fee2e2', color: r.is_active ? '#16a34a' : '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(r)} style={{ background: '#eff6ff', color: '#1e88e5', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}><i className="fas fa-edit"></i></button>
                      <button onClick={() => del(r)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No automation rules yet</td></tr>}
            </tbody>
          </table></div>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 580, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1d4d', marginBottom: 20 }}>{editing ? 'Edit Rule' : 'New Automation Rule'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Auto-assign on new lead" style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Scope *</label>
                  <select value={form.scope} onChange={e => setForm(f => ({...f, scope: e.target.value}))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    {SCOPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Trigger *</label>
                  <select value={form.trigger_type} onChange={e => setForm(f => ({...f, trigger_type: e.target.value}))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                    {TRIGGERS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Priority</label>
                  <input type="number" value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Conditions (JSON)</label>
                <textarea value={form.conditions} onChange={e => setForm(f => ({...f, conditions: e.target.value}))} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Actions (JSON Array)</label>
                <textarea value={form.actions} onChange={e => setForm(f => ({...f, actions: e.target.value}))} rows={4} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', border: '1px solid #d1d5db', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name} style={{ padding: '8px 22px', border: 'none', borderRadius: 7, background: '#1a1d4d', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving || !form.name ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
