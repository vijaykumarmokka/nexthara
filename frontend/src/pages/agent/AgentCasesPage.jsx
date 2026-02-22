import { useState, useEffect, useCallback } from 'react';
import { agentApi } from '../../api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/Common/StatusBadge';

function fmt(val) { return val ? `₹${(val / 100000).toFixed(1)}L` : '—'; }

export default function AgentCasesPage() {
  const [cases, setCases]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (search) params.search = search;
    agentApi.getCases(params)
      .then(r => { setCases(r.data || []); setTotal(r.total || 0); setPages(r.pages || 1); })
      .catch(() => toast.error('Failed to load cases'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Cases</h2>
          <div className="subtitle">{total} cases linked to your leads</div>
        </div>
        <button className="btn btn-outline" onClick={load}><i className="fas fa-sync-alt"></i> Refresh</button>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search name, bank, university..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="table-container" style={{ marginTop: 8 }}>
        <div className="table-header">
          <h3>Cases</h3>
          <span className="results-count">Showing {cases.length} of {total}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Phone</th>
              <th>Bank</th>
              <th>University / Course</th>
              <th>Loan Amt</th>
              <th>Status</th>
              <th>Awaiting</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>}
            {!loading && cases.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <i className="fas fa-briefcase" style={{ fontSize: 24, display: 'block', marginBottom: 8 }}></i>
                No cases found. Leads appear here once converted to cases.
              </td></tr>
            )}
            {cases.map(c => (
              <tr key={c.agent_lead_id}>
                <td><div className="student-name">{c.student_name || c.full_name}</div></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.phone_e164}</td>
                <td style={{ fontWeight: 500 }}>{c.bank || '—'}</td>
                <td>
                  <div style={{ fontSize: 13 }}>{c.university || '—'}</div>
                  {c.course && <div className="student-sub">{c.course}</div>}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{fmt(c.loan_amount_requested ? c.loan_amount_requested * 100 : null)}</td>
                <td><StatusBadge status={c.status} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.awaiting_from || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{c.case_created_at ? new Date(c.case_created_at).toLocaleDateString() : '—'}</td>
                <td>
                  {c.case_id && (
                    <button className="btn btn-sm btn-primary"
                      onClick={() => agentApi.getCase(c.case_id).then(setSelected).catch(() => toast.error('Failed to load case'))}>
                      Open <i className="fas fa-arrow-right" style={{ marginLeft: 4 }}></i>
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

      {selected && <CaseDetailModal caseData={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── Case Detail Modal ────────────────────────────────────────────────────────

function CaseDetailModal({ caseData, onClose }) {
  return (
    <div className="modal-overlay show">
      <div className="modal">
        <div className="modal-header" style={{ background: 'var(--header-gradient)', color: '#fff', borderRadius: '12px 12px 0 0' }}>
          <div>
            <h3 style={{ color: '#fff' }}>{caseData.student_name}</h3>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              Case #{caseData.id?.slice(0, 8)} &nbsp;·&nbsp; {caseData.bank}
            </div>
          </div>
          <button className="modal-close" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }} onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            {[
              ['Bank', caseData.bank], ['University', caseData.university],
              ['Course', caseData.course], ['Status', caseData.status?.replace(/_/g, ' ')],
              ['Sub-status', caseData.sub_status], ['Awaiting From', caseData.awaiting_from],
              ['Loan Requested', caseData.loan_amount_requested ? `₹${caseData.loan_amount_requested.toLocaleString()}` : null],
              ['Sanction Amount', caseData.sanction_amount ? `₹${caseData.sanction_amount.toLocaleString()}` : null],
              ['Priority', caseData.priority],
            ].map(([label, val]) => val ? (
              <div key={label} className="detail-item">
                <label>{label}</label>
                <div className="value">{val}</div>
              </div>
            ) : null)}
          </div>

          {caseData.commission && (
            <div className="sanction-card" style={{ marginTop: 20 }}>
              <h4>Commission</h4>
              <div className="sanction-grid">
                <div className="sanction-item"><label>Rate</label><div className="value">{caseData.commission.commission_percent}%</div></div>
                <div className="sanction-item"><label>Amount</label><div className="value">₹{((caseData.commission.commission_amount_paise || 0) / 100).toLocaleString()}</div></div>
                <div className="sanction-item"><label>Status</label><div className="value">{caseData.commission.status}</div></div>
              </div>
            </div>
          )}

          {caseData.history?.length > 0 && (
            <div className="timeline" style={{ marginTop: 20 }}>
              <h4>Status History</h4>
              {caseData.history.slice().reverse().map(h => (
                <div key={h.id} className="timeline-item">
                  <div className="timeline-dot blue"><i className="fas fa-circle" style={{ fontSize: 8 }}></i></div>
                  <div className="timeline-content">
                    <div className="title">{h.status?.replace(/_/g, ' ')}</div>
                    {h.notes && <div className="subtitle">{h.notes}</div>}
                    <div className="time">{new Date(h.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
