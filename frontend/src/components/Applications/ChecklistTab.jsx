import { useState, useEffect, useCallback } from 'react';
import { crmApi } from '../../api';
import toast from 'react-hot-toast';

// Status chip config
const STATUS_CONFIG = {
  PENDING:      { label: 'Pending',       bg: '#f3f4f6', color: '#374151' },
  UPLOADED:     { label: 'Uploaded',      bg: '#dbeafe', color: '#1d4ed8' },
  UNDER_REVIEW: { label: 'Under Review',  bg: '#ede9fe', color: '#7c3aed' },
  VERIFIED:     { label: 'Verified',      bg: '#dcfce7', color: '#15803d' },
  REJECTED:     { label: 'Rejected',      bg: '#fee2e2', color: '#dc2626' },
  WAIVED:       { label: 'Waived',        bg: '#e2e8f0', color: '#475569' },
};

const REQUIREMENT_CONFIG = {
  REQUIRED:    { label: 'REQUIRED',    bg: '#fee2e2', color: '#dc2626' },
  OPTIONAL:    { label: 'OPTIONAL',    bg: '#fef9c3', color: '#854d0e' },
  NOT_NEEDED:  { label: 'NOT NEEDED',  bg: '#e2e8f0', color: '#475569' },
};

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

function ReqChip({ level }) {
  const cfg = REQUIREMENT_CONFIG[level] || REQUIREMENT_CONFIG.REQUIRED;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>
      {cfg.label}
    </span>
  );
}

function ProgressBar({ current, total, color = '#1d4ed8' }) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', minWidth: 36 }}>{current}/{total}</span>
    </div>
  );
}

// ── Item Drawer (slide-in panel) ─────────────────────────────────────────────
function ItemDrawer({ item, onClose, onUpdate, onCreateQuery, caseId }) {
  const [status, setStatus] = useState(item.status);
  const [reqLevel, setReqLevel] = useState(item.requirement_level);
  const [notes, setNotes] = useState(item.notes || '');
  const [rejReason, setRejReason] = useState(item.rejection_reason || '');
  const [dueAt, setDueAt] = useState(item.due_at ? item.due_at.slice(0,10) : '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await crmApi.updateChecklistItem(item.id, {
        status,
        requirement_level: reqLevel,
        notes: notes || null,
        rejection_reason: rejReason || null,
        due_at: dueAt || null,
        last_requested_at: status === 'PENDING' && item.status !== 'PENDING' ? new Date().toISOString() : undefined,
      });
      toast.success('Item updated');
      onUpdate();
      onClose();
    } catch(e) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  async function handleSendReminder() {
    try {
      await crmApi.scheduleReminder({
        scope: 'CASE', entity_id: caseId, reminder_type: 'DOC_PENDING',
        channel: 'IN_APP', recipient_party: 'STUDENT',
        template_name: 'doc_reminder', scheduled_at: new Date().toISOString(),
        payload: { doc_name: item.display_name, case_id: caseId },
      });
      toast.success('Reminder scheduled');
    } catch(e) { toast.error(e.message); }
  }

  async function handleCreateQuery() {
    try {
      await crmApi.createQuery(caseId, {
        scope: 'CASE', raised_by_party: 'STAFF',
        title: `Clarification needed: ${item.display_name}`,
        priority: 'NORMAL',
        initial_message: `Bank/staff requested clarification on document: ${item.display_name}`,
      });
      toast.success('Query thread created');
      onCreateQuery();
    } catch(e) { toast.error(e.message); }
  }

  const isOverdue = item.due_at && new Date(item.due_at) < new Date() && item.status === 'PENDING';

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', zIndex: 1001, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{item.display_name}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{item.doc_code}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
      </div>

      <div style={{ padding: '16px 20px', flex: 1 }}>
        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 3 }}>Requirement</div>
            <ReqChip level={item.requirement_level} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 3 }}>Status</div>
            <StatusChip status={item.status} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 3 }}>Owner</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{item.owner_entity_type}{item.coapp_name ? ` (${item.coapp_name})` : ''}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 3 }}>Required by</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{item.required_by === 'BANK' ? `Bank${item.bank_id ? ` (${item.bank_id})` : ''}` : item.required_by}</div>
          </div>
          {item.due_at && (
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 3 }}>Due Date</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isOverdue ? '#dc2626' : '#111827' }}>
                {new Date(item.due_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {isOverdue && <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, padding: '1px 6px', borderRadius: 4, marginLeft: 6 }}>OVERDUE</span>}
              </div>
            </div>
          )}
          {item.description && (
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 3 }}>Description</div>
              <div style={{ fontSize: 12, color: '#4b5563' }}>{item.description}</div>
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />

        {/* Edit fields */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>Update Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {status === 'REJECTED' && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>Rejection Reason</label>
            <input value={rejReason} onChange={e => setRejReason(e.target.value)} placeholder="e.g. Not readable, document expired"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>Requirement Level</label>
          <select value={reqLevel} onChange={e => setReqLevel(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
            <option value="REQUIRED">Required</option>
            <option value="OPTIONAL">Optional</option>
            <option value="NOT_NEEDED">Not Needed</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>Due Date</label>
          <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: '9px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '4px 0 12px' }} />

        {/* One-click actions */}
        <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Quick Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={handleSendReminder}
            style={{ padding: '8px 12px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 13, cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}>
            📱 Send WhatsApp Reminder
          </button>
          <button onClick={handleCreateQuery}
            style={{ padding: '8px 12px', background: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff', borderRadius: 6, fontSize: 13, cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}>
            ❓ Create Query Thread
          </button>
          {item.requirement_level !== 'NOT_NEEDED' && (
            <button onClick={async () => {
              await crmApi.updateChecklistItem(item.id, { requirement_level: 'NOT_NEEDED', status: 'WAIVED' });
              toast.success('Marked as waived');
              onUpdate(); onClose();
            }} style={{ padding: '8px 12px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}>
              ✓ Mark as Waived
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ChecklistTab ─────────────────────────────────────────────────────────
export default function ChecklistTab({ app }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({ status: '', owner_type: '', search: '' });
  const [expandedGroups, setExpandedGroups] = useState({});

  const loadChecklist = useCallback(async () => {
    try {
      const d = await crmApi.getChecklist(app.id);
      setData(d);
      // Auto-expand all groups
      const expanded = {};
      (d.groups || []).forEach(g => { expanded[g.group] = true; });
      setExpandedGroups(expanded);
    } catch(e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [app.id]);

  useEffect(() => { loadChecklist(); }, [loadChecklist]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await crmApi.generateChecklist(app.id);
      toast.success('Checklist generated from document master');
      await loadChecklist();
    } catch(e) {
      toast.error(e.message);
    } finally { setGenerating(false); }
  }

  function toggleGroup(groupName) {
    setExpandedGroups(g => ({ ...g, [groupName]: !g[groupName] }));
  }

  // Apply filters
  const filteredGroups = (data?.groups || []).map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (filters.status && item.status !== filters.status) return false;
      if (filters.owner_type && item.owner_entity_type !== filters.owner_type) return false;
      if (filters.search && !item.display_name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    }),
  })).filter(g => g.items.length > 0);

  const summary = data?.summary || {};
  const pct = summary.required_total ? Math.round((summary.required_completed / summary.required_total) * 100) : 0;

  if (loading) return <div style={{ padding: 32, color: '#9ca3af' }}>Loading checklist…</div>;

  return (
    <div style={{ padding: '20px 0', position: 'relative' }}>
      {/* Header strip */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {app.student_name} · {app.country} · {app.loan_amount_requested ? `₹${Number(app.loan_amount_requested).toLocaleString('en-IN')}` : '—'}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Stage: {app.status?.replace(/_/g,' ')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleGenerate} disabled={generating}
              style={{ padding: '6px 14px', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {generating ? 'Generating…' : '⟳ Generate Checklist'}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Required docs</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: pct === 100 ? '#15803d' : '#111827' }}>{pct}%</span>
            </div>
            <ProgressBar current={summary.required_completed || 0} total={summary.required_total || 0} color="#1d4ed8" />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Optional: <b>{summary.optional_total || 0}</b></span>
            {summary.overdue_required > 0 && (
              <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                {summary.overdue_required} OVERDUE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['', 'PENDING', 'UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'WAIVED'].map(s => (
          <button key={s} onClick={() => setFilters(f => ({ ...f, status: s }))}
            style={{ padding: '5px 12px', background: filters.status === s ? '#1a237e' : '#f9fafb', color: filters.status === s ? '#fff' : '#374151', border: '1px solid #e5e7eb', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: filters.status === s ? 600 : 400 }}>
            {s || 'All'}
          </button>
        ))}
        <select value={filters.owner_type} onChange={e => setFilters(f => ({ ...f, owner_type: e.target.value }))}
          style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 20, fontSize: 12, background: '#f9fafb' }}>
          <option value="">Owner: All</option>
          <option value="STUDENT">Student</option>
          <option value="COAPPLICANT">Co-Applicant</option>
          <option value="COLLATERAL">Collateral</option>
        </select>
        <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder="🔍 Search doc..."
          style={{ flex: 1, minWidth: 160, padding: '5px 12px', border: '1px solid #e5e7eb', borderRadius: 20, fontSize: 12, background: '#f9fafb' }} />
      </div>

      {/* Empty state */}
      {filteredGroups.length === 0 && (
        <div style={{ background: '#fff', border: '1px dashed #d1d5db', borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>No checklist items yet</div>
          <div style={{ fontSize: 12 }}>Click "Generate Checklist" to auto-build from document master, or add co-applicants first.</div>
        </div>
      )}

      {/* Two-panel layout: groups left, items right */}
      {filteredGroups.length > 0 && (
        <div style={{ display: 'flex', gap: 14 }}>
          {/* Left: group list */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Groups</div>
            {filteredGroups.map(g => {
              const done = g.items.filter(i => ['VERIFIED','UPLOADED'].includes(i.status)).length;
              return (
                <button key={g.group} onClick={() => toggleGroup(g.group)}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 4, background: expandedGroups[g.group] ? '#eff6ff' : '#f9fafb', border: `1px solid ${expandedGroups[g.group] ? '#bfdbfe' : '#e5e7eb'}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: expandedGroups[g.group] ? '#1d4ed8' : '#374151', fontWeight: expandedGroups[g.group] ? 600 : 400 }}>
                    {expandedGroups[g.group] ? '▾' : '▸'} {g.group}
                  </span>
                  <span style={{ color: done === g.items.length ? '#15803d' : '#6b7280', fontWeight: 600 }}>{done}/{g.items.length}</span>
                </button>
              );
            })}
          </div>

          {/* Right: items */}
          <div style={{ flex: 1 }}>
            {filteredGroups.map(g => !expandedGroups[g.group] ? null : (
              <div key={g.group} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>{g.group}</div>
                {g.items.map(item => {
                  const isOverdue = item.due_at && new Date(item.due_at) < new Date() && item.status === 'PENDING';
                  return (
                    <div key={item.id} onClick={() => setSelectedItem(item)}
                      style={{ background: '#fff', border: `1px solid ${isOverdue ? '#fca5a5' : '#e5e7eb'}`, borderLeft: `3px solid ${isOverdue ? '#dc2626' : item.status === 'VERIFIED' ? '#15803d' : item.status === 'REJECTED' ? '#dc2626' : '#e5e7eb'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', transition: 'box-shadow 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.display_name}</span>
                          <ReqChip level={item.requirement_level} />
                          <StatusChip status={item.status} />
                          {isOverdue && <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>OVERDUE</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', gap: 12 }}>
                          <span>Scope: {item.bank_id ? `${item.bank_id} only` : 'ALL BANKS'}</span>
                          {item.due_at && <span>Due: {new Date(item.due_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>}
                          {item.required_by !== 'SYSTEM' && <span>Req by: {item.required_by}</span>}
                          {item.notes && <span>Note: {item.notes}</span>}
                        </div>
                        {item.rejection_reason && (
                          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>Reason: "{item.rejection_reason}"</div>
                        )}
                      </div>
                      <div style={{ marginLeft: 12, display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedItem(item)}
                          style={{ padding: '3px 8px', fontSize: 11, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 4, cursor: 'pointer' }}>
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item drawer */}
      {selectedItem && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000 }} onClick={() => setSelectedItem(null)} />
          <ItemDrawer item={selectedItem} caseId={app.id} onClose={() => setSelectedItem(null)} onUpdate={loadChecklist} onCreateQuery={() => {}} />
        </>
      )}
    </div>
  );
}
