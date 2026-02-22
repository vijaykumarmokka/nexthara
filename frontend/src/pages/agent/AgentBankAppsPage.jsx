import { useState, useEffect, useCallback } from 'react';
import { agentApi } from '../../api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/Common/StatusBadge';
import SLATag from '../../components/Common/SLATag';
import AwaitingPill from '../../components/Common/AwaitingPill';

const BANKS = ['Credila','SBI','Axis','HDFC','ICICI','Prodigy','IDFC','Auxilo','Avanse'];
const STATUSES = ['NOT_CONNECTED','LOGIN_SUBMITTED','DOCS_PENDING','UNDER_REVIEW','QUERY_RAISED','SANCTIONED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED','REJECTED','CLOSED'];

export default function AgentBankAppsPage() {
  const [apps, setApps]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [statusF, setStatusF]   = useState('');
  const [bankF, setBankF]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (statusF) params.status = statusF;
    if (bankF)   params.bank   = bankF;
    agentApi.getBankApps(params)
      .then(r => { setApps(r.data || []); setTotal(r.total || 0); setPages(r.pages || 1); })
      .catch(() => toast.error('Failed to load bank applications'))
      .finally(() => setLoading(false));
  }, [page, statusF, bankF, refreshKey]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Bank Applications</h2>
          <div className="subtitle">{total} total across all cases</div>
        </div>
        <button className="btn btn-outline" onClick={() => setRefreshKey(k => k + 1)}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select className="filter-select" value={bankF} onChange={e => { setBankF(e.target.value); setPage(1); }}>
          <option value="">All Banks</option>
          {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="filter-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container" style={{ marginTop: 8 }}>
        <div className="table-header">
          <h3>Bank Applications</h3>
          <span className="results-count">Showing {apps.length} of {total}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Case Ref</th>
              <th>Student</th>
              <th>Bank</th>
              <th>Status</th>
              <th>Awaiting</th>
              <th>SLA</th>
              <th>Loan Amt</th>
              <th>Sanction Amt</th>
              <th>Last Update</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>}
            {!loading && apps.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <i className="fas fa-university" style={{ fontSize: 24, display: 'block', marginBottom: 8 }}></i>
                No bank applications found. Convert leads to cases to see bank applications here.
              </td></tr>
            )}
            {apps.map(a => (
              <tr key={a.agent_lead_id + (a.app_id || '')}>
                <td><span className="app-id">{a.app_id ? `#${a.app_id.slice(0, 8)}` : '—'}</span></td>
                <td>
                  <div className="student-name">{a.full_name}</div>
                  <div className="student-sub">{a.phone_e164}</div>
                </td>
                <td style={{ fontWeight: 500 }}>{a.bank || '—'}</td>
                <td><StatusBadge status={a.status} /></td>
                <td><AwaitingPill awaiting={a.awaiting_from} /></td>
                <td><SLATag days={a.sla_days || 0} awaiting={a.awaiting_from} status={a.status} /></td>
                <td style={{ color: 'var(--text-muted)' }}>{a.loan_amount_requested ? `₹${(a.loan_amount_requested / 100000).toFixed(1)}L` : '—'}</td>
                <td style={{ fontWeight: a.sanction_amount ? 600 : 400, color: a.sanction_amount ? 'var(--status-green)' : 'var(--text-muted)' }}>
                  {a.sanction_amount ? `₹${(a.sanction_amount / 100000).toFixed(1)}L` : '—'}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                </td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => setSelected(a)}>
                    Actions <i className="fas fa-arrow-right" style={{ marginLeft: 4 }}></i>
                  </button>
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

      {selected && (
        <BankAppActionDrawer
          app={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); setRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}

// ─── Action Drawer ────────────────────────────────────────────────────────────

function BankAppActionDrawer({ app, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [query, setQuery]         = useState('');
  const [sending, setSending]     = useState(false);

  async function submitQuery() {
    if (!query.trim()) return;
    setSending(true);
    try {
      if (app.agent_lead_id) {
        await agentApi.addLeadNote(app.agent_lead_id, `[BANK QUERY] ${query.trim()}`);
      }
      toast.success('Query raised — your account manager will follow up.');
      setQuery('');
    } catch (err) { toast.error(err.message || 'Failed to submit query'); }
    finally { setSending(false); }
  }

  return (
    <div className="cw-drawer-overlay">
      <div className="cw-drawer">
        {/* Header */}
        <div className="cw-drawer-header" style={{ background: 'var(--header-gradient)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{app.full_name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {app.bank || 'No bank assigned'} · {app.app_id ? `#${app.app_id.slice(0, 8)}` : 'No case'}
            </div>
          </div>
          <button className="cw-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Status bar */}
        <div className="bank-status-bar">
          <StatusBadge status={app.status} />
          <SLATag days={app.sla_days || 0} awaiting={app.awaiting_from} status={app.status} />
          {app.awaiting_from && <AwaitingPill awaiting={app.awaiting_from} />}
        </div>

        {/* Tabs */}
        <div className="cw-drawer-nav">
          {['overview', 'timeline', 'query'].map(t => (
            <button key={t} className={`cw-drawer-nav-item${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="cw-drawer-body">
          {activeTab === 'overview' && (
            <div>
              <div className="detail-grid">
                {[
                  ['Student', app.full_name], ['Phone', app.phone_e164], ['Bank', app.bank],
                  ['Awaiting From', app.awaiting_from], ['SLA Days', app.sla_days ? `${app.sla_days} days` : null],
                  ['Loan Amount', app.loan_amount_requested ? `₹${(app.loan_amount_requested / 100000).toFixed(2)}L` : null],
                  ['Sanction Amount', app.sanction_amount ? `₹${(app.sanction_amount / 100000).toFixed(2)}L` : null],
                  ['Bank Ref', app.bank_application_ref], ['Priority', app.priority],
                ].map(([label, val]) => val ? (
                  <div key={label} className="detail-item"><label>{label}</label><div className="value">{val}</div></div>
                ) : null)}
              </div>
              <div className="bank-panel-warning" style={{ marginTop: 16 }}>
                <i className="fas fa-info-circle"></i>
                <div>To update bank status or upload documents, use the <strong>Timeline</strong> tab or <strong>Raise Query</strong> to communicate with the Nexthara team.</div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status History</div>
              {(!app.history || app.history.length === 0) ? (
                <div className="cw-empty-state">
                  <i className="fas fa-history"></i>
                  <p>No timeline available.</p>
                </div>
              ) : (
                <div className="timeline">
                  {app.history?.slice().reverse().map((h, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-dot blue"><i className="fas fa-circle" style={{ fontSize: 7 }}></i></div>
                      <div className="timeline-content">
                        <div className="title">{h.status?.replace(/_/g, ' ')}</div>
                        {h.notes && <div className="subtitle">{h.notes}</div>}
                        <div className="time">{h.created_at ? new Date(h.created_at).toLocaleString() : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'query' && (
            <div>
              <div className="bank-panel-note" style={{ marginBottom: 16 }}>
                <i className="fas fa-question-circle" style={{ marginRight: 6 }}></i>
                Raise a query with the Nexthara team about this bank application. Your query will be reviewed within 24 hours.
              </div>
              <div className="form-group">
                <label>Your Query</label>
                <textarea
                  rows={5}
                  placeholder="Describe the issue or question you have about this application..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={submitQuery} disabled={sending || !query.trim()}>
                  {sending ? 'Submitting...' : 'Submit Query'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
