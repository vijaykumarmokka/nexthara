import { useState, useEffect, useCallback } from 'react';
import { leadsApi } from '../../api';
import toast from 'react-hot-toast';

const STAGE_COLORS = {
  NEW:               { bg: '#e3f2fd', color: '#1565c0', label: 'NEW' },
  CONTACT_ATTEMPTED: { bg: '#f3e5f5', color: '#7b1fa2', label: 'ATTEMPTED' },
  CONNECTED:         { bg: '#ede7f6', color: '#512da8', label: 'CONNECTED' },
  QUALIFIED:         { bg: '#fff8e1', color: '#f57f17', label: 'QUALIFIED' },
  DOCS_REQUESTED:    { bg: '#e0f7fa', color: '#00695c', label: 'DOCS REQ' },
  DOCS_RECEIVED:     { bg: '#e0f2f1', color: '#00695c', label: 'DOCS RCVD' },
  CASE_CREATED:      { bg: '#e8f5e9', color: '#2e7d32', label: 'CASE MADE' },
  DROPPED:           { bg: '#eceff1', color: '#546e7a', label: 'DROPPED' },
  LOST:              { bg: '#fbe9e7', color: '#bf360c', label: 'LOST' },
  DUPLICATE:         { bg: '#f5f5f5', color: '#757575', label: 'DUPLICATE' },
};

const SOURCE_BADGES = {
  META_LEAD_FORM: { bg: '#1877f2', color: '#fff', label: 'META' },
  META_WHATSAPP:  { bg: '#25d366', color: '#fff', label: 'WA' },
  WEBSITE_FORM:   { bg: '#0288d1', color: '#fff', label: 'WEB' },
  EVENT:          { bg: '#7b1fa2', color: '#fff', label: 'EVENT' },
  ADMISSION_CRM:  { bg: '#2e7d32', color: '#fff', label: 'ADMN' },
  MANUAL_ENTRY:   { bg: '#757575', color: '#fff', label: 'MANUAL' },
  IMPORT_CSV:     { bg: '#546e7a', color: '#fff', label: 'CSV' },
  WALK_IN:        { bg: '#e65100', color: '#fff', label: 'WALK-IN' },
  REFERRAL:       { bg: '#6a1b9a', color: '#fff', label: 'REF' },
  API:            { bg: '#00695c', color: '#fff', label: 'API' },
  // Legacy
  META:           { bg: '#1877f2', color: '#fff', label: 'META' },
  GOOGLE:         { bg: '#ea4335', color: '#fff', label: 'GOOGLE' },
  WEBSITE:        { bg: '#0288d1', color: '#fff', label: 'WEB' },
  MANUAL:         { bg: '#757575', color: '#fff', label: 'MANUAL' },
};

const PRIORITY_ICONS = {
  NORMAL: null,
  HIGH:   { icon: '🔥', title: 'High Priority' },
  URGENT: { icon: '🚨', title: 'Urgent' },
};

function StageBadge({ stage }) {
  const cfg = STAGE_COLORS[stage] || { bg: '#f5f5f5', color: '#666', label: stage };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
      {cfg.label}
    </span>
  );
}

function SourceBadge({ lead }) {
  const key = lead.lead_source_type || lead.source || 'MANUAL';
  const cfg = SOURCE_BADGES[key] || { bg: '#9e9e9e', color: '#fff', label: key };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
      {cfg.label}
    </span>
  );
}

function ScoreBadge({ score }) {
  if (!score && score !== 0) return <span style={{ color: '#bbb', fontSize: 11 }}>—</span>;
  const isHot = score >= 80;
  const color = score >= 80 ? '#c62828' : score >= 60 ? '#e65100' : score >= 40 ? '#f57f17' : '#546e7a';
  return (
    <span style={{ fontWeight: 700, color, fontSize: 12 }}>
      {isHot && '🔥'}{score}
    </span>
  );
}

function formatLoan(paise) {
  if (!paise) return '—';
  const lakh = paise / 10000000;
  if (lakh >= 1) return `₹${lakh.toFixed(1)}L`;
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function timeAgo(dt) {
  if (!dt) return '—';
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatFollowup(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  const now = new Date();
  const diffMs = d - now;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < -30) return <span style={{ color: '#c62828', fontWeight: 700 }}>⚠ Overdue</span>;
  if (diffMins < 0)   return <span style={{ color: '#e65100', fontWeight: 600 }}>Due now</span>;
  if (diffMins < 60)  return <span style={{ color: '#f57f17', fontWeight: 600 }}>In {diffMins}m</span>;
  const today = now.toDateString() === d.toDateString();
  if (today) return <span style={{ color: '#1565c0' }}>Today {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function MetricCard({ label, count, color, bg, active, onClick }) {
  return (
    <div onClick={onClick} style={{ background: active ? color : bg || '#fff', color: active ? '#fff' : color, border: `2px solid ${color}`, borderRadius: 12, padding: '14px 20px', cursor: 'pointer', minWidth: 100, textAlign: 'center', transition: 'all 0.2s', boxShadow: active ? `0 4px 12px ${color}40` : '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{count}</div>
      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, opacity: active ? 0.9 : 0.8 }}>{label}</div>
    </div>
  );
}

const QUEUE_TABS = [
  { key: 'all',        label: 'All Leads' },
  { key: 'mine',       label: '🔥 My Leads Today' },
  { key: 'followup',   label: '⏰ Follow-up Due' },
  { key: 'overdue',    label: '🚨 Overdue' },
  { key: 'highvalue',  label: '⭐ High Value' },
];

export default function LeadsPage({ onOpenLead }) {
  const [leads, setLeads]         = useState([]);
  const [stats, setStats]         = useState(null);
  const [queues, setQueues]       = useState(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(true);
  const [activeQueue, setActiveQueue] = useState('all');
  const [stageFilter, setStageFilter] = useState('');
  const [filters, setFilters]     = useState({ search: '', source_type: '', country: '', priority: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    leadsApi.getStats().then(setStats).catch(() => {});
    leadsApi.getQueues().then(setQueues).catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    if (activeQueue !== 'all') return;
    setLoading(true);
    const params = { page, limit: 50 };
    if (filters.search)      params.search      = filters.search;
    if (filters.source_type) params.source_type = filters.source_type;
    if (filters.country)     params.country     = filters.country;
    if (filters.priority)    params.priority    = filters.priority;
    if (stageFilter)         params.stage       = stageFilter;
    leadsApi.getLeads(params).then(r => {
      setLeads(r.data || []); setTotal(r.total || 0); setPages(r.pages || 1);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filters, stageFilter, page, activeQueue, refreshKey]);

  const displayLeads = (() => {
    if (activeQueue === 'mine')      return queues?.myLeadsToday  || [];
    if (activeQueue === 'followup')  return queues?.followupDue   || [];
    if (activeQueue === 'overdue')   return queues?.overdue       || [];
    if (activeQueue === 'highvalue') return queues?.highValue     || [];
    return leads;
  })();

  const handleMetricClick = (stage) => {
    setStageFilter(prev => prev === stage ? '' : stage);
    setActiveQueue('all');
    setPage(1);
  };

  const exportCSV = () => {
    const rows = [['Name','Phone','Source','Country','Loan','Score','Stage','Campaign','Owner','Last Activity','Next Follow-up','Priority']];
    displayLeads.forEach(l => rows.push([l.full_name, l.phone_e164, l.lead_source_type || l.source, l.country || '', formatLoan(l.loan_amount_paise), l.intent_score || '', l.stage, l.campaign_name || l.meta_campaign_id || '', l.assigned_staff_name || '', timeAgo(l.last_activity_at), l.next_followup_at || '', l.priority]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'leads.csv'; a.click();
  };

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Lead Management Panel</h2>
          <div className="subtitle">Manage, qualify, and convert student inquiries efficiently.</div>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={refresh}><i className="fas fa-sync-alt"></i> Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}><i className="fas fa-plus"></i> Add Manual Lead</button>
        </div>
      </div>

      {/* Overdue alert */}
      {stats && stats.overdue > 0 && (
        <div style={{ background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#c62828' }}>
          <i className="fas fa-exclamation-triangle"></i>
          <strong>{stats.overdue} Overdue Leads</strong> — follow-ups are past due!
          <button onClick={() => setActiveQueue('overdue')} style={{ marginLeft: 'auto', background: '#c62828', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>View Overdue</button>
        </div>
      )}

      {/* Summary Metric Strip */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <MetricCard label="New Today"  count={stats.newToday}              color="#1565c0" bg="#e3f2fd" active={stageFilter === 'NEW'}          onClick={() => handleMetricClick('NEW')} />
          <MetricCard label="Connected"  count={stats.counts.CONNECTED || 0} color="#7b1fa2" bg="#f3e5f5" active={stageFilter === 'CONNECTED'}    onClick={() => handleMetricClick('CONNECTED')} />
          <MetricCard label="Qualified"  count={stats.counts.QUALIFIED || 0} color="#f57f17" bg="#fff8e1" active={stageFilter === 'QUALIFIED'}    onClick={() => handleMetricClick('QUALIFIED')} />
          <MetricCard label="Docs Rcvd"  count={stats.counts.DOCS_RECEIVED || 0} color="#00695c" bg="#e0f2f1" active={stageFilter === 'DOCS_RECEIVED'} onClick={() => handleMetricClick('DOCS_RECEIVED')} />
          <MetricCard label="Case Made"  count={stats.counts.CASE_CREATED || 0} color="#2e7d32" bg="#e8f5e9" active={stageFilter === 'CASE_CREATED'} onClick={() => handleMetricClick('CASE_CREATED')} />
          <MetricCard label="Dropped"    count={stats.counts.DROPPED || 0}   color="#546e7a" bg="#eceff1" active={stageFilter === 'DROPPED'}     onClick={() => handleMetricClick('DROPPED')} />
          <MetricCard label="Lost"       count={stats.counts.LOST || 0}       color="#bf360c" bg="#fbe9e7" active={stageFilter === 'LOST'}        onClick={() => handleMetricClick('LOST')} />
          <MetricCard label="High Value" count={stats.highValue || 0}         color="#e65100" bg="#fff3e0" active={false}                         onClick={() => setActiveQueue('highvalue')} />
        </div>
      )}

      {/* Queue Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {QUEUE_TABS.map(t => (
          <button key={t.key} onClick={() => { setActiveQueue(t.key); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${activeQueue === t.key ? '#1a237e' : '#ddd'}`, background: activeQueue === t.key ? '#1a237e' : '#fff', color: activeQueue === t.key ? '#fff' : '#333', fontWeight: activeQueue === t.key ? 700 : 400, cursor: 'pointer', fontSize: 13 }}>
            {t.label}
            {t.key === 'overdue' && queues?.overdue?.length > 0 && (
              <span style={{ marginLeft: 6, background: '#c62828', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{queues.overdue.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="🔍 Search name / phone…" value={filters.search}
          onChange={e => { setFilters(f => ({...f, search: e.target.value})); setPage(1); setActiveQueue('all'); }}
          style={{ flex: 1, minWidth: 180, padding: '7px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13 }} />
        <select value={filters.source_type} onChange={e => { setFilters(f => ({...f, source_type: e.target.value})); setPage(1); setActiveQueue('all'); }}
          style={{ padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13 }}>
          <option value="">Source ▼</option>
          <option value="META_LEAD_FORM">Meta Lead Form</option>
          <option value="META_WHATSAPP">Meta WhatsApp</option>
          <option value="WEBSITE_FORM">Website Form</option>
          <option value="EVENT">Event</option>
          <option value="ADMISSION_CRM">Admission CRM</option>
          <option value="MANUAL_ENTRY">Manual Entry</option>
          <option value="IMPORT_CSV">Import CSV</option>
          <option value="WALK_IN">Walk-in</option>
          <option value="REFERRAL">Referral</option>
          <option value="API">API</option>
        </select>
        <select value={filters.country} onChange={e => { setFilters(f => ({...f, country: e.target.value})); setPage(1); setActiveQueue('all'); }}
          style={{ padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13 }}>
          <option value="">Country ▼</option>
          <option>UK</option><option>USA</option><option>Canada</option><option>Australia</option><option>Ireland</option><option>Germany</option>
        </select>
        <select value={stageFilter} onChange={e => { setStageFilter(e.target.value); setPage(1); setActiveQueue('all'); }}
          style={{ padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13 }}>
          <option value="">Stage ▼</option>
          {Object.keys(STAGE_COLORS).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={e => { setFilters(f => ({...f, priority: e.target.value})); setPage(1); setActiveQueue('all'); }}
          style={{ padding: '7px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13 }}>
          <option value="">Priority ▼</option>
          <option>NORMAL</option><option>HIGH</option><option>URGENT</option>
        </select>
        <button onClick={() => { setFilters({ search: '', source_type: '', country: '', priority: '' }); setStageFilter(''); setPage(1); setActiveQueue('all'); }}
          style={{ padding: '7px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, background: '#f5f5f5', cursor: 'pointer' }}>
          Reset
        </button>
        <button onClick={exportCSV}
          style={{ padding: '7px 12px', border: '1px solid #1a237e', borderRadius: 8, fontSize: 13, background: '#fff', color: '#1a237e', cursor: 'pointer' }}>
          <i className="fas fa-download"></i> Export CSV
        </button>
      </div>

      {/* Leads Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f6fa', borderBottom: '2px solid #e0e0e0' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Country</th>
              <th style={thStyle}>Loan</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Campaign</th>
              <th style={thStyle}>Stage</th>
              <th style={thStyle}>Owner</th>
              <th style={thStyle}>Last Activity</th>
              <th style={thStyle}>Next Follow-up</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && activeQueue === 'all' ? (
              <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#999' }}>Loading…</td></tr>
            ) : displayLeads.length === 0 ? (
              <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#999' }}>No leads found</td></tr>
            ) : displayLeads.map(lead => {
              const isNew      = lead.stage === 'NEW';
              const isOverdue  = lead.next_followup_at && new Date(lead.next_followup_at) < new Date(Date.now() - 30 * 60000);
              const isDueSoon  = lead.next_followup_at && new Date(lead.next_followup_at) > new Date() && new Date(lead.next_followup_at) < new Date(Date.now() + 30 * 60000);
              const isHighVal  = lead.loan_amount_paise >= 3000000;
              const isHotScore = lead.intent_score >= 80;
              const isNoContact = lead.stage === 'NEW' && !lead.last_activity_at;

              const rowStyle = {
                borderBottom: '1px solid #f0f0f0',
                borderLeft: `4px solid ${isOverdue ? '#c62828' : isNew ? '#1565c0' : isDueSoon ? '#f57f17' : 'transparent'}`,
                background: isOverdue ? '#fff5f5' : 'transparent',
                transition: 'background 0.15s',
              };

              return (
                <tr key={lead.id} style={rowStyle}
                  onMouseEnter={e => e.currentTarget.style.background = isOverdue ? '#ffebee' : '#f9fafe'}
                  onMouseLeave={e => e.currentTarget.style.background = isOverdue ? '#fff5f5' : 'transparent'}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>
                      {lead.full_name}
                      {isHighVal  && <span title="High Value (>30L)" style={{ marginLeft: 4 }}>⭐</span>}
                      {isHotScore && <span title="Hot score ≥ 80" style={{ marginLeft: 2 }}>🔥</span>}
                    </div>
                    {isOverdue && <div style={{ fontSize: 10, color: '#c62828', fontWeight: 700 }}>OVERDUE</div>}
                    {lead.city && <div style={{ fontSize: 11, color: '#888' }}>{lead.city}</div>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {isNoContact && <span title="Not contacted" style={{ marginRight: 4 }}>📞</span>}
                      {lead.phone_e164}
                    </span>
                  </td>
                  <td style={tdStyle}><SourceBadge lead={lead} /></td>
                  <td style={tdStyle}>{lead.country || '—'}</td>
                  <td style={tdStyle}>{formatLoan(lead.loan_amount_paise)}</td>
                  <td style={tdStyle}><ScoreBadge score={lead.intent_score} /></td>
                  <td style={tdStyle}>
                    {(lead.campaign_name || lead.meta_campaign_id) ? (
                      <span style={{ fontSize: 11, color: '#555', maxWidth: 100, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={lead.campaign_name || lead.meta_campaign_id}>
                        {(lead.campaign_name || lead.meta_campaign_id || '').slice(0, 14)}{(lead.campaign_name || lead.meta_campaign_id || '').length > 14 ? '…' : ''}
                      </span>
                    ) : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  <td style={tdStyle}><StageBadge stage={lead.stage} /></td>
                  <td style={tdStyle}>{lead.assigned_staff_name || <span style={{ color: '#aaa' }}>Unassigned</span>}</td>
                  <td style={tdStyle}>{timeAgo(lead.last_activity_at)}</td>
                  <td style={tdStyle}>{formatFollowup(lead.next_followup_at)}</td>
                  <td style={tdStyle}>
                    <button onClick={() => onOpenLead(lead.id)}
                      style={{ padding: '5px 14px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {activeQueue === 'all' && pages > 1 && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', fontSize: 13 }}>
            <span style={{ color: '#666' }}>Showing {displayLeads.length} of {total} leads</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '4px 12px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', background: '#fff' }}>‹ Prev</button>
              <span style={{ padding: '4px 12px', color: '#555' }}>Page {page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                style={{ padding: '4px 12px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', background: '#fff' }}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onCreated={() => { setShowAddModal(false); refresh(); }} />}
    </div>
  );
}

const thStyle = { padding: '11px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: '#555', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 14px', verticalAlign: 'middle' };

// ─── Add Lead Modal ───────────────────────────────────────────────────────────
function AddLeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    full_name: '', phone_e164: '', email: '', city: '',
    source: 'MANUAL', lead_source_type: 'MANUAL_ENTRY',
    campaign_name: '', country: '', course: '', loan_amount_paise: '',
    priority: 'NORMAL', intent_score: '50',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone_e164) return toast.error('Name and phone required');
    setSaving(true);
    try {
      const data = {
        ...form,
        loan_amount_paise: form.loan_amount_paise ? Math.round(parseFloat(form.loan_amount_paise) * 100) : null,
        intent_score: form.intent_score ? parseInt(form.intent_score) : 50,
      };
      await leadsApi.createLead(data);
      toast.success('Lead added successfully!');
      onCreated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Add Manual Lead</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>×</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Full Name *</label><input style={inputStyle} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Varun Kumar" /></div>
            <div><label style={labelStyle}>Phone (E.164) *</label><input style={inputStyle} value={form.phone_e164} onChange={e => set('phone_e164', e.target.value)} placeholder="+918848087657" /></div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label style={labelStyle}>City</label><input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} /></div>
            <div>
              <label style={labelStyle}>Source Type</label>
              <select style={inputStyle} value={form.lead_source_type} onChange={e => set('lead_source_type', e.target.value)}>
                <option value="MANUAL_ENTRY">Manual Entry</option>
                <option value="META_LEAD_FORM">Meta Lead Form</option>
                <option value="META_WHATSAPP">Meta WhatsApp</option>
                <option value="WEBSITE_FORM">Website Form</option>
                <option value="EVENT">Event</option>
                <option value="ADMISSION_CRM">Admission CRM</option>
                <option value="WALK_IN">Walk-in</option>
                <option value="REFERRAL">Referral</option>
              </select>
            </div>
            <div><label style={labelStyle}>Campaign Name</label><input style={inputStyle} value={form.campaign_name} onChange={e => set('campaign_name', e.target.value)} /></div>
            <div>
              <label style={labelStyle}>Country Interested</label>
              <select style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)}>
                <option value="">Select…</option><option>UK</option><option>USA</option><option>Canada</option><option>Australia</option><option>Ireland</option><option>Germany</option>
              </select>
            </div>
            <div><label style={labelStyle}>Course</label><input style={inputStyle} value={form.course} onChange={e => set('course', e.target.value)} placeholder="MSc Data Science" /></div>
            <div><label style={labelStyle}>Loan Amount (₹)</label><input style={inputStyle} type="number" value={form.loan_amount_paise} onChange={e => set('loan_amount_paise', e.target.value)} placeholder="2500000" /></div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option>NORMAL</option><option>HIGH</option><option>URGENT</option>
              </select>
            </div>
            <div><label style={labelStyle}>Intent Score (0–100)</label><input style={inputStyle} type="number" min="0" max="100" value={form.intent_score} onChange={e => set('intent_score', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', background: '#fff' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '8px 20px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              {saving ? 'Creating…' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 };
const inputStyle  = { width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' };
