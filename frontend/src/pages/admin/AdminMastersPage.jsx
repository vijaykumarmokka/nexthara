import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'universities', label: 'Universities', icon: 'fa-university' },
  { key: 'courses', label: 'Courses', icon: 'fa-book' },
  { key: 'countries', label: 'Countries', icon: 'fa-globe' },
  { key: 'documents', label: 'Documents', icon: 'fa-file-alt' },
  { key: 'stages', label: 'Stage Master', icon: 'fa-stream' },
  { key: 'loss-reasons', label: 'Loss Reasons', icon: 'fa-times-circle' },
];

function SimpleTable({ columns, rows, onEdit, onDelete, idKey = 'id', nameKey = 'name' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {columns.map(c => <th key={c.key} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>{c.label}</th>)}
            <th style={{ padding: '9px 14px', width: 90 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r[idKey] || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: '9px 14px', color: c.bold ? '#1a1d4d' : '#4b5563', fontWeight: c.bold ? 600 : 400 }}>
                  {c.render ? c.render(r[c.key], r) : (r[c.key] ?? '—')}
                </td>
              ))}
              <td style={{ padding: '9px 14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onEdit(r)} style={{ background: '#eff6ff', color: '#1e88e5', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}><i className="fas fa-edit"></i></button>
                  <button onClick={() => onDelete(r)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}><i className="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={columns.length + 1} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No records</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}

function ActiveBadge({ v }) {
  return <span style={{ background: v ? '#dcfce7' : '#fee2e2', color: v ? '#16a34a' : '#dc2626', padding: '2px 7px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>{v ? 'Active' : 'Inactive'}</span>;
}

// ─── Universities ────────────────────────────────────────────────────────────
function UniversitiesTab() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', country: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const load = () => adminApi.getUniversities().then(setRows).catch(() => {});
  useEffect(load, []);
  const save = async () => {
    try {
      if (editing) { await adminApi.updateUniversity(editing.id, form); toast.success('Updated'); }
      else { await adminApi.createUniversity(form); toast.success('Created'); }
      setShowForm(false); setEditing(null); setForm({ name: '', country: '' }); load();
    } catch(e) { toast.error(e.message); }
  };
  const del = async (r) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    try { await adminApi.deleteUniversity(r.id); toast.success('Deleted'); load(); }
    catch(e) { toast.error(e.message); }
  };
  const edit = (r) => { setEditing(r); setForm({ name: r.name, country: r.country || '' }); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditing(null); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => { setEditing(null); setForm({ name: '', country: '' }); setShowForm(true); }} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add</button>
      </div>
      {showForm && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>University Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Country</label>
            <input value={form.country} onChange={e => setForm(f => ({...f, country: e.target.value}))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <button onClick={save} disabled={!form.name} style={{ padding: '7px 16px', border: 'none', borderRadius: 6, background: '#1a1d4d', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Save</button>
          <button onClick={cancel} style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
        </div>
      )}
      <SimpleTable
        columns={[
          { key: 'name', label: 'University', bold: true },
          { key: 'country', label: 'Country' },
          { key: 'is_active', label: 'Status', render: v => <ActiveBadge v={v} /> },
        ]}
        rows={rows} onEdit={edit} onDelete={del}
      />
    </div>
  );
}

// ─── Courses ────────────────────────────────────────────────────────────────
function CoursesTab() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const load = () => adminApi.getCourses().then(setRows).catch(() => {});
  useEffect(load, []);
  const save = async () => {
    try {
      if (editing) { await adminApi.updateCourse(editing.id, form); toast.success('Updated'); }
      else { await adminApi.createCourse(form); toast.success('Created'); }
      setShowForm(false); setEditing(null); setForm({ name: '' }); load();
    } catch(e) { toast.error(e.message); }
  };
  const del = async (r) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    try { await adminApi.deleteCourse(r.id); toast.success('Deleted'); load(); }
    catch(e) { toast.error(e.message); }
  };
  const edit = (r) => { setEditing(r); setForm({ name: r.name }); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditing(null); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => { setEditing(null); setForm({ name: '' }); setShowForm(true); }} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add</button>
      </div>
      {showForm && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Course Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <button onClick={save} disabled={!form.name} style={{ padding: '7px 16px', border: 'none', borderRadius: 6, background: '#1a1d4d', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Save</button>
          <button onClick={cancel} style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
        </div>
      )}
      <SimpleTable
        columns={[
          { key: 'name', label: 'Course Name', bold: true },
          { key: 'is_active', label: 'Status', render: v => <ActiveBadge v={v} /> },
        ]}
        rows={rows} onEdit={edit} onDelete={del}
      />
    </div>
  );
}

// ─── Countries ────────────────────────────────────────────────────────────────
function CountriesTab() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', code: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const load = () => adminApi.getCountries().then(setRows).catch(() => {});
  useEffect(load, []);
  const save = async () => {
    try {
      if (editing) { await adminApi.updateCountry(editing.id, form); toast.success('Updated'); }
      else { await adminApi.createCountry(form); toast.success('Created'); }
      setShowForm(false); setEditing(null); setForm({ name: '', code: '' }); load();
    } catch(e) { toast.error(e.message); }
  };
  const del = async (r) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    try { await adminApi.deleteCountry(r.id); toast.success('Deleted'); load(); }
    catch(e) { toast.error(e.message); }
  };
  const edit = (r) => { setEditing(r); setForm({ name: r.name, code: r.code || '' }); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditing(null); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => { setEditing(null); setForm({ name: '', code: '' }); setShowForm(true); }} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add</button>
      </div>
      {showForm && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Country Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>ISO Code</label>
            <input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} placeholder="e.g. GB" style={{ width: 80, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }} />
          </div>
          <button onClick={save} disabled={!form.name} style={{ padding: '7px 16px', border: 'none', borderRadius: 6, background: '#1a1d4d', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Save</button>
          <button onClick={cancel} style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
        </div>
      )}
      <SimpleTable
        columns={[
          { key: 'name', label: 'Country', bold: true },
          { key: 'code', label: 'ISO Code' },
          { key: 'is_active', label: 'Status', render: v => <ActiveBadge v={v} /> },
        ]}
        rows={rows} onEdit={edit} onDelete={del}
      />
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────
function DocumentsTab() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ document_name: '', doc_code: '', category: 'STUDENT', mandatory: true, sort_order: 0 });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const load = () => adminApi.getDocumentMaster().then(data => setRows(Array.isArray(data) ? data : [])).catch(() => {});
  useEffect(load, []);
  const save = async () => {
    try {
      if (editing) { await adminApi.updateDocument(editing.id, form); toast.success('Updated'); }
      else { await adminApi.createDocument(form); toast.success('Created'); }
      setShowForm(false); setEditing(null); setForm({ document_name: '', doc_code: '', category: 'STUDENT', mandatory: true, sort_order: 0 }); load();
    } catch(e) { toast.error(e.message); }
  };
  const del = async (r) => {
    if (!confirm(`Delete "${r.document_name}"?`)) return;
    try { await adminApi.deleteDocument(r.id); toast.success('Deleted'); load(); }
    catch(e) { toast.error(e.message); }
  };
  const edit = (r) => { setEditing(r); setForm({ document_name: r.document_name || r.display_name || '', doc_code: r.doc_code, category: r.category, mandatory: !!r.mandatory, sort_order: r.sort_order || 0 }); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditing(null); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => { setEditing(null); setForm({ document_name: '', doc_code: '', category: 'STUDENT', mandatory: true, sort_order: 0 }); setShowForm(true); }} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add</button>
      </div>
      {showForm && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Document Name *</label>
            <input value={form.document_name} onChange={e => setForm(f => ({...f, document_name: e.target.value}))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Code *</label>
            <input value={form.doc_code} onChange={e => setForm(f => ({...f, doc_code: e.target.value}))} style={{ width: 100, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
              {['STUDENT','COAPPLICANT','COLLATERAL','IDENTITY','ACADEMIC','FINANCIAL','IMMIGRATION','PROPERTY','BANK'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={form.mandatory} onChange={e => setForm(f => ({...f, mandatory: e.target.checked}))} id="mandatory" />
            <label htmlFor="mandatory" style={{ fontSize: 12, color: '#374151' }}>Mandatory</label>
          </div>
          <button onClick={save} disabled={!form.document_name || !form.doc_code} style={{ padding: '7px 16px', border: 'none', borderRadius: 6, background: '#1a1d4d', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Save</button>
          <button onClick={cancel} style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
        </div>
      )}
      <SimpleTable
        columns={[
          { key: 'document_name', label: 'Document Name', bold: true },
          { key: 'doc_code', label: 'Code' },
          { key: 'category', label: 'Category' },
          { key: 'mandatory', label: 'Mandatory', render: v => <ActiveBadge v={v} /> },
          { key: 'sort_order', label: 'Order' },
        ]}
        rows={rows} onEdit={edit} onDelete={del}
      />
    </div>
  );
}

// ─── Stage Master ─────────────────────────────────────────────────────────────
function StagesTab() {
  const [rows, setRows] = useState([]);
  const [scopeFilter, setScopeFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label: '', sort_order: 0, is_active: true });
  const load = () => adminApi.getStageMaster(scopeFilter ? { scope: scopeFilter } : {}).then(data => setRows(Array.isArray(data) ? data : [])).catch(() => {});
  useEffect(load, [scopeFilter]);
  const del = async (r) => {
    if (!confirm(`Delete stage "${r.stage_key}"?`)) return;
    try { await adminApi.deleteStage(r.id); toast.success('Deleted'); load(); }
    catch(e) { toast.error(e.message); }
  };
  const edit = (r) => { setEditing(r); setForm({ label: r.label, sort_order: r.sort_order, is_active: !!r.is_active }); };
  const save = async () => {
    try {
      await adminApi.updateStage(editing.id, form);
      toast.success('Stage updated');
      setEditing(null);
      load();
    } catch(e) { toast.error(e.message); }
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
          <option value="">All Scopes</option>
          {['LEAD', 'CASE', 'BANK_APP'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <SimpleTable
        columns={[
          { key: 'scope', label: 'Scope' },
          { key: 'stage_key', label: 'Stage Key', bold: true },
          { key: 'label', label: 'Label' },
          { key: 'sort_order', label: 'Order' },
          { key: 'is_active', label: 'Status', render: v => <ActiveBadge v={v} /> },
        ]}
        rows={rows} onEdit={edit} onDelete={del}
      />
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: '#1a1d4d' }}>Edit Stage</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stage Key</label>
              <input value={editing.stage_key} disabled style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, background: '#f9fafb', color: '#9ca3af', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Label *</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <span style={{ fontSize: 12 }}>Active</span>
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              <button onClick={save} disabled={!form.label} style={{ padding: '7px 16px', border: 'none', borderRadius: 6, background: '#1a1d4d', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loss Reasons ─────────────────────────────────────────────────────────────
function LossReasonsTab() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ scope: 'LEAD', reason_code: '', label: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const load = () => adminApi.getLossReasons().then(data => setRows(Array.isArray(data) ? data : [])).catch(() => {});
  useEffect(load, []);
  const save = async () => {
    try {
      if (editing) { await adminApi.updateLossReason(editing.id, { label: form.label }); toast.success('Updated'); }
      else { await adminApi.createLossReason(form); toast.success('Created'); }
      setShowForm(false); setEditing(null); setForm({ scope: 'LEAD', reason_code: '', label: '' }); load();
    } catch(e) { toast.error(e.message); }
  };
  const del = async (r) => {
    if (!confirm(`Delete "${r.label}"?`)) return;
    try { await adminApi.deleteLossReason(r.id); toast.success('Deleted'); load(); }
    catch(e) { toast.error(e.message); }
  };
  const edit = (r) => { setEditing(r); setForm({ scope: r.scope, reason_code: r.reason_code, label: r.label }); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditing(null); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => { setEditing(null); setForm({ scope: 'LEAD', reason_code: '', label: '' }); setShowForm(true); }} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add</button>
      </div>
      {showForm && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Scope</label>
            <select value={form.scope} onChange={e => setForm(f => ({...f, scope: e.target.value}))} disabled={!!editing} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}>
              {['LEAD', 'CASE', 'BANK_APP'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Reason Code *</label>
            <input value={form.reason_code} onChange={e => setForm(f => ({...f, reason_code: e.target.value}))} disabled={!!editing} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Label *</label>
            <input value={form.label} onChange={e => setForm(f => ({...f, label: e.target.value}))} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <button onClick={save} disabled={!form.reason_code || !form.label} style={{ padding: '7px 16px', border: 'none', borderRadius: 6, background: '#1a1d4d', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Save</button>
          <button onClick={cancel} style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
        </div>
      )}
      <SimpleTable
        columns={[
          { key: 'scope', label: 'Scope' },
          { key: 'reason_code', label: 'Code', bold: true },
          { key: 'label', label: 'Label' },
          { key: 'is_active', label: 'Status', render: v => <ActiveBadge v={v} /> },
        ]}
        rows={rows} onEdit={edit} onDelete={del}
      />
    </div>
  );
}

const TAB_COMPONENTS = {
  universities: UniversitiesTab,
  courses: CoursesTab,
  countries: CountriesTab,
  documents: DocumentsTab,
  stages: StagesTab,
  'loss-reasons': LossReasonsTab,
};

export default function AdminMastersPage() {
  const [activeTab, setActiveTab] = useState('universities');
  const ActiveComp = TAB_COMPONENTS[activeTab];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1d4d' }}>Master Data</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Manage universities, courses, countries, documents, stages, and loss reasons</div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            color: activeTab === t.key ? '#1a1d4d' : '#6b7280',
            borderBottom: `2px solid ${activeTab === t.key ? '#1a1d4d' : 'transparent'}`,
            marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className={`fas ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      {ActiveComp ? <ActiveComp /> : null}
    </div>
  );
}
