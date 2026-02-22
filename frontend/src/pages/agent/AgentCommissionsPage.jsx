import { useState, useEffect, useCallback } from 'react';
import { agentApi } from '../../api';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  PENDING:   'badge-amber',
  CONFIRMED: 'badge-blue',
  PAID:      'badge-green',
  DISPUTED:  'badge-red',
};

function CommissionBadge({ status }) {
  return <span className={`badge ${STATUS_BADGE[status] || 'badge-grey'}`}>{status}</span>;
}

function fmtPaise(p) { return p ? `₹${((p || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'; }
function fmtL(p)     { return p ? `₹${((p || 0) / 100000).toFixed(2)}L` : '—'; }

const STATUSES = ['PENDING', 'CONFIRMED', 'PAID', 'DISPUTED'];

export default function AgentCommissionsPage() {
  const [commissions, setCommissions] = useState([]);
  const [totals, setTotals]           = useState(null);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [pages, setPages]             = useState(1);
  const [statusF, setStatusF]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState(null);
  const [refreshKey, setRefreshKey]   = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (statusF) params.status = statusF;
    agentApi.getCommissions(params)
      .then(r => { setCommissions(r.data || []); setTotal(r.total || 0); setPages(r.pages || 1); setTotals(r.totals || {}); })
      .catch(() => toast.error('Failed to load commissions'))
      .finally(() => setLoading(false));
  }, [page, statusF, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const kpiCards = totals ? [
    { label: 'Total Earned',  value: fmtL(totals.total_paise),     cls: 'blue',   icon: 'fa-coins' },
    { label: 'Paid Out',      value: fmtL(totals.paid_paise),      cls: 'green',  icon: 'fa-check-circle' },
    { label: 'Confirmed',     value: fmtL(totals.confirmed_paise), cls: 'blue',   icon: 'fa-thumbs-up' },
    { label: 'Pending',       value: fmtL(totals.pending_paise),   cls: 'amber',  icon: 'fa-clock' },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Commissions</h2>
          <div className="subtitle">{total} commission records</div>
        </div>
      </div>

      {/* Totals KPI */}
      {totals && (
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          {kpiCards.map(card => (
            <div key={card.label} className={`kpi-card ${card.cls}`}>
              <div className="kpi-label">{card.label}</div>
              <div className="kpi-value" style={{ fontSize: 22 }}>{card.value}</div>
              <div className="kpi-footer neutral"><i className={`fas ${card.icon}`}></i></div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <select className="filter-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-header">
          <h3>Commission Records</h3>
          <span className="results-count">Showing {commissions.length} of {total}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Phone</th>
              <th>Sanction Amt</th>
              <th>Commission %</th>
              <th>Commission Amt</th>
              <th>Status</th>
              <th>Paid At</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>}
            {!loading && commissions.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <i className="fas fa-coins" style={{ fontSize: 24, display: 'block', marginBottom: 8 }}></i>
                No commissions yet. Commissions appear once a case is sanctioned by a bank.
              </td></tr>
            )}
            {commissions.map(c => (
              <tr key={c.id}>
                <td><div className="student-name">{c.student_name || '—'}</div></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.phone_e164 || '—'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{fmtPaise(c.sanction_amount_paise)}</td>
                <td style={{ color: 'var(--text-muted)' }}>{c.commission_percent ? `${c.commission_percent}%` : '—'}</td>
                <td style={{ fontWeight: 600, color: c.status === 'PAID' ? 'var(--status-green)' : 'var(--text-primary)' }}>
                  {fmtPaise(c.commission_amount_paise)}
                </td>
                <td><CommissionBadge status={c.status} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.paid_at ? new Date(c.paid_at).toLocaleDateString() : '—'}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => setSelected(c)}>Detail</button>
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
        <CommissionDetailModal
          commission={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); setRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}

// ─── Commission Detail Modal ──────────────────────────────────────────────────

function CommissionDetailModal({ commission, onClose, onUpdated }) {
  const [dispute, setDispute] = useState('');
  const [saving, setSaving]   = useState(false);

  async function raiseDispute() {
    if (!dispute.trim()) return;
    setSaving(true);
    try {
      await agentApi.updateCommission(commission.id, { status: 'DISPUTED' });
      toast.success('Commission marked as disputed. Nexthara team will review.');
      onUpdated();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  const canDispute = ['PENDING', 'CONFIRMED'].includes(commission.status);
  const fmtPaise = (p) => p ? `₹${((p || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';

  return (
    <div className="modal-overlay show">
      <div className="modal" style={{ marginTop: 60 }}>
        <div className="modal-header" style={{ background: 'var(--header-gradient)', color: '#fff', borderRadius: '12px 12px 0 0' }}>
          <div>
            <h3 style={{ color: '#fff' }}>Commission Detail</h3>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{commission.student_name}</div>
          </div>
          <button className="modal-close" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }} onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Summary band */}
          <div className={commission.status === 'PAID' ? 'sanction-card' : 'update-form'} style={{ marginTop: 0, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: commission.status === 'PAID' ? 'var(--status-green)' : 'var(--text-primary)' }}>
                {fmtPaise(commission.commission_amount_paise)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {commission.commission_percent}% of {fmtPaise(commission.sanction_amount_paise)}
              </div>
            </div>
            <span className={`badge ${STATUS_BADGE[commission.status] || 'badge-grey'}`}>{commission.status}</span>
          </div>

          <div className="detail-grid">
            {[
              ['Student', commission.student_name],
              ['Case ID', commission.case_id ? `#${commission.case_id.slice(0, 10)}` : null],
              ['Sanction Amount', fmtPaise(commission.sanction_amount_paise)],
              ['Commission Rate', commission.commission_percent ? `${commission.commission_percent}%` : null],
              ['Commission Amount', fmtPaise(commission.commission_amount_paise)],
              ['Invoice Number', commission.invoice_number],
              ['Paid At', commission.paid_at ? new Date(commission.paid_at).toLocaleString() : null],
              ['Created', new Date(commission.created_at).toLocaleDateString()],
            ].map(([label, val]) => val ? (
              <div key={label} className="detail-item"><label>{label}</label><div className="value">{val}</div></div>
            ) : null)}
          </div>

          {/* Dispute section */}
          {canDispute && (
            <div className="update-form" style={{ marginTop: 20 }}>
              <h4>Raise Dispute</h4>
              <div className="bank-panel-warning">
                <i className="fas fa-exclamation-triangle"></i>
                If the commission amount or details are incorrect, raise a dispute. Nexthara's accounts team will review within 3–5 business days.
              </div>
              <div className="form-group">
                <label>Explain the discrepancy</label>
                <textarea rows={3} value={dispute} onChange={e => setDispute(e.target.value)} placeholder="Describe the issue..." />
              </div>
              <div className="form-actions">
                <button
                  className="btn"
                  style={{ background: 'var(--status-red)', color: '#fff', border: 'none' }}
                  onClick={raiseDispute}
                  disabled={saving || !dispute.trim()}
                >
                  {saving ? 'Submitting...' : 'Raise Dispute'}
                </button>
              </div>
            </div>
          )}

          {commission.status === 'DISPUTED' && (
            <div className="bank-panel-warning" style={{ marginTop: 16 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Dispute Filed</div>
                <div style={{ marginTop: 4 }}>This commission is under review by the Nexthara accounts team.</div>
              </div>
            </div>
          )}

          {commission.status === 'PAID' && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--status-green-bg)', borderRadius: 6, border: '1px solid #a5d6a7' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-green)' }}>Commission Paid</div>
              <div style={{ fontSize: 12, color: '#388e3c', marginTop: 4 }}>
                {commission.paid_at ? `Paid on ${new Date(commission.paid_at).toLocaleDateString()}` : 'Payment confirmed by accounts team'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
