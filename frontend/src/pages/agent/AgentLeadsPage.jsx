import { useState, useEffect, useCallback } from 'react';
import { agentApi } from '../../api';
import toast from 'react-hot-toast';

const STAGES = ['NEW','CONTACT_ATTEMPTED','CONNECTED','QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED','DROPPED','LOST','DUPLICATE'];
const STAGE_BADGE = {
  NEW: 'badge-grey', CONTACT_ATTEMPTED: 'badge-amber', CONNECTED: 'badge-blue',
  QUALIFIED: 'badge-purple', DOCS_REQUESTED: 'badge-red', DOCS_RECEIVED: 'badge-blue',
  CASE_CREATED: 'badge-green', DROPPED: 'badge-red', LOST: 'badge-red', DUPLICATE: 'badge-grey',
};

function StageChip({ stage }) {
  return <span className={`badge ${STAGE_BADGE[stage] || 'badge-grey'}`}>{stage?.replace(/_/g, ' ')}</span>;
}

function fmt(paise) { if (!paise) return '—'; return `₹${(paise / 100000).toFixed(1)}L`; }

export default function AgentLeadsPage() {
  const [leads, setLeads]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [search, setSearch]       = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [loading, setLoading]     = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [selected, setSelected]   = useState(null);
  const [convertTarget, setConvertTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (search) params.search = search;
    if (stageFilter) params.stage = stageFilter;
    agentApi.getLeads(params)
      .then(r => { setLeads(r.data || []); setTotal(r.total || 0); setPages(r.pages || 1); })
      .catch(() => toast.error('Failed to load leads'))
      .finally(() => setLoading(false));
  }, [page, search, stageFilter, refreshKey]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Leads</h2>
          <div className="subtitle">{total} total leads in your pipeline</div>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <i className="fas fa-plus"></i> Add Lead
          </button>
        </div>
      </div>

      {/* Chip stage filters */}
      <div className="bank-chip-filters" style={{ flexWrap: 'nowrap', gap: 5 }}>
        <button className={`bank-chip${!stageFilter ? ' active' : ''}`} style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { setStageFilter(''); setPage(1); }}>All</button>
        {STAGES.map(s => (
          <button key={s} className={`bank-chip${stageFilter === s ? ' active' : ''}`} style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { setStageFilter(s); setPage(1); }}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="filter-bar" style={{ marginTop: 8 }}>
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search name, phone, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container" style={{ marginTop: 8 }}>
        <div className="table-header">
          <h3>Leads</h3>
          <span className="results-count">Showing {leads.length} of {total}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Country</th>
              <th>Course</th>
              <th>Loan Amt</th>
              <th>Stage</th>
              <th>Priority</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>}
            {!loading && leads.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <i className="fas fa-inbox" style={{ fontSize: 24, display: 'block', marginBottom: 8 }}></i>
                No leads found
              </td></tr>
            )}
            {leads.map(l => (
              <tr key={l.id}>
                <td><div className="student-name">{l.full_name}</div></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{l.phone_e164}</td>
                <td style={{ color: 'var(--text-muted)' }}>{l.country || '—'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{l.course || '—'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{fmt(l.loan_amount_paise)}</td>
                <td><StageChip stage={l.stage} /></td>
                <td>
                  <span className={`badge ${l.priority === 'HIGH' ? 'badge-amber' : 'badge-grey'}`}>{l.priority || '—'}</span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelected(l)}>View</button>
                  {!l.internal_case_id && !['CASE_CREATED','DROPPED','LOST','DUPLICATE'].includes(l.stage) && (
                    <button
                      className="btn btn-sm"
                      style={{ background: 'var(--status-green-bg)', color: 'var(--status-green)', border: '1px solid #a5d6a7' }}
                      onClick={() => setConvertTarget(l)}
                    >
                      Convert
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="pagination">
            <div className="info">Page {page} of {pages} ({total} total)</div>
            <div className="pagination-btns">
              <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}><i className="fas fa-chevron-left"></i></button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pages}><i className="fas fa-chevron-right"></i></button>
            </div>
          </div>
        )}
      </div>

      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); setRefreshKey(k => k + 1); }} />}
      {selected && <LeadDetailModal lead={selected} onClose={() => { setSelected(null); setRefreshKey(k => k + 1); }} />}
      {convertTarget && <ConvertToCaseModal lead={convertTarget} onClose={() => setConvertTarget(null)} onConverted={() => { setConvertTarget(null); setRefreshKey(k => k + 1); }} />}
    </div>
  );
}

// ─── Add Lead Modal ───────────────────────────────────────────────────────────

function AddLeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: '', phone_e164: '', email: '', city: '', country: '', course: '', university: '', intake: '', loan_amount_paise: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await agentApi.createLead({ ...form, loan_amount_paise: form.loan_amount_paise ? Number(form.loan_amount_paise) : null });
      toast.success('Lead created');
      onCreated();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay show">
      <div className="modal" style={{ marginTop: 60 }}>
        <div className="modal-header">
          <h3>Add New Lead</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <div className="form-row">
              {[
                { label: 'Full Name *', key: 'full_name', req: true },
                { label: 'Phone *', key: 'phone_e164', req: true, placeholder: '+91...' },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label>{f.label}</label>
                  <input type="text" required={f.req} placeholder={f.placeholder || ''} value={form[f.key]} onChange={e => set(f.key, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="form-row">
              <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              <div className="form-group"><label>City</label><input type="text" value={form.city} onChange={e => set('city', e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Country</label><input type="text" value={form.country} onChange={e => set('country', e.target.value)} /></div>
              <div className="form-group"><label>Course</label><input type="text" value={form.course} onChange={e => set('course', e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>University</label><input type="text" value={form.university} onChange={e => set('university', e.target.value)} /></div>
              <div className="form-group"><label>Intake</label><input type="text" value={form.intake} onChange={e => set('intake', e.target.value)} /></div>
            </div>
            <div className="form-group">
              <label>Loan Amount (₹) — e.g. 5000000 for ₹50L</label>
              <input type="number" value={form.loan_amount_paise} onChange={e => set('loan_amount_paise', e.target.value)} placeholder="Amount in paise" />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Lead'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Lead Detail Modal ────────────────────────────────────────────────────────

function LeadDetailModal({ lead: initialLead, onClose }) {
  const [lead, setLead] = useState(initialLead);
  const [note, setNote] = useState('');
  const [stage, setStage] = useState(initialLead.stage);
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await agentApi.addLeadNote(lead.id, note);
      toast.success('Note added');
      setNote('');
      const updated = await agentApi.getLead(lead.id);
      setLead(updated);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function updateStage() {
    if (stage === lead.stage) return;
    setSaving(true);
    try {
      await agentApi.updateLead(lead.id, { stage });
      toast.success('Stage updated');
      const updated = await agentApi.getLead(lead.id);
      setLead(updated);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay show">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h3>{lead.full_name}</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{lead.phone_e164} &nbsp;·&nbsp; <StageChip stage={lead.stage} /></div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Info Grid */}
          <div className="detail-grid">
            {[
              ['Email', lead.email], ['City', lead.city], ['Country', lead.country],
              ['Course', lead.course], ['University', lead.university], ['Intake', lead.intake],
              ['Loan Amount', lead.loan_amount_paise ? fmt(lead.loan_amount_paise) : null],
              ['Case ID', lead.internal_case_id],
            ].map(([label, val]) => val ? (
              <div key={label} className="detail-item">
                <label>{label}</label>
                <div className="value">{val}</div>
              </div>
            ) : null)}
          </div>

          {/* Update Stage */}
          <div className="update-form">
            <h4><i className="fas fa-exchange-alt" style={{ marginRight: 8 }}></i>Update Stage</h4>
            <div style={{ display: 'flex', gap: 10 }}>
              <select className="filter-select" style={{ flex: 1 }} value={stage} onChange={e => setStage(e.target.value)}>
                {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <button className="btn btn-primary" onClick={updateStage} disabled={saving || stage === lead.stage}>Save</button>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Notes</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="cw-input"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note..."
                onKeyDown={e => e.key === 'Enter' && addNote()}
              />
              <button className="btn btn-primary" onClick={addNote} disabled={saving || !note.trim()}>Add</button>
            </div>
            {lead.notes?.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notes yet.</div>}
            {lead.notes?.map(n => (
              <div key={n.id} className="cw-note-item">
                <div className="cw-note-text">{n.note_text}</div>
                <div className="cw-note-meta"><i className="fas fa-user"></i> {n.agent_user_name} · {new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Convert to Case Modal ────────────────────────────────────────────────────

const BANKS = ['SBI','HDFC','Axis','ICICI','Credila','Auxilo','Avanse','IDFC','Union Bank','Bank of Baroda','Other'];

function ConvertToCaseModal({ lead, onClose, onConverted }) {
  const [bank, setBank] = useState('');
  const [loanAmt, setLoanAmt] = useState(lead.loan_amount_paise ? String(Math.round(lead.loan_amount_paise / 100)) : '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!bank) return toast.error('Please select a bank');
    setSaving(true);
    try {
      await agentApi.convertLeadToCase(lead.id, {
        bank,
        loan_amount_requested: loanAmt ? Number(loanAmt) : null,
        notes: notes.trim() || null,
      });
      toast.success('Lead converted to case successfully!');
      onConverted();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay show">
      <div className="modal" style={{ marginTop: 60 }}>
        <div className="modal-header">
          <div>
            <h3>Convert to Case</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{lead.full_name} · {lead.phone_e164}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="bank-panel-note">
            <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
            A new application case will be created and linked to this lead. The lead stage will be updated to <strong>Case Created</strong>.
          </div>

          {/* Lead summary */}
          <div className="update-form" style={{ marginTop: 0, marginBottom: 16 }}>
            <h4>Lead Summary</h4>
            <div className="detail-grid" style={{ marginBottom: 0 }}>
              {[['University', lead.university], ['Course', lead.course], ['Country', lead.country], ['Intake', lead.intake]].map(([label, val]) => val ? (
                <div key={label} className="detail-item">
                  <label>{label}</label>
                  <div className="value">{val}</div>
                </div>
              ) : null)}
            </div>
          </div>

          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group">
                <label>Bank / Lender *</label>
                <select value={bank} onChange={e => setBank(e.target.value)} required>
                  <option value="">Select bank...</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Loan Amount Requested (₹)</label>
                <input type="number" value={loanAmt} onChange={e => setLoanAmt(e.target.value)} placeholder="e.g. 5000000 for ₹50L" />
                {loanAmt && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>= ₹{(Number(loanAmt) / 100000).toFixed(2)}L</div>}
              </div>
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes for the case..." />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !bank}
                style={{ background: 'var(--status-green)', boxShadow: '0 2px 6px rgba(46,125,50,0.3)' }}>
                {saving ? 'Converting...' : 'Convert to Case'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
