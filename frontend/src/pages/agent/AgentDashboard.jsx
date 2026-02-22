import { useState, useEffect } from 'react';
import { agentApi } from '../../api';
import toast from 'react-hot-toast';

const STAGE_LABELS = {
  NEW: 'New', CONTACT_ATTEMPTED: 'Attempted', CONNECTED: 'Connected',
  QUALIFIED: 'Qualified', DOCS_REQUESTED: 'Docs Req.', DOCS_RECEIVED: 'Docs Recv.',
  CASE_CREATED: 'Case Created',
};
const STAGE_COLORS = {
  NEW: '#78909c', CONTACT_ATTEMPTED: '#f57f17', CONNECTED: '#1565c0',
  QUALIFIED: '#6a1b9a', DOCS_REQUESTED: '#ad1457', DOCS_RECEIVED: '#00838f',
  CASE_CREATED: '#2e7d32',
};
const STAGE_BADGE = {
  NEW: 'badge-grey', CONTACT_ATTEMPTED: 'badge-amber', CONNECTED: 'badge-blue',
  QUALIFIED: 'badge-purple', DOCS_REQUESTED: 'badge-red', DOCS_RECEIVED: 'badge-blue',
  CASE_CREATED: 'badge-green', DROPPED: 'badge-red', LOST: 'badge-red', DUPLICATE: 'badge-grey',
};

function StageChip({ stage }) {
  const label = STAGE_LABELS[stage] || stage?.replace(/_/g, ' ');
  return <span className={`badge ${STAGE_BADGE[stage] || 'badge-grey'}`}>{label}</span>;
}

function fmt(paise) { return `₹${((paise || 0) / 100000).toFixed(1)}L`; }

export default function AgentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentApi.getDashboard()
      .then(setData)
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--sbi-accent)' }}></i>
      Loading dashboard...
    </div>
  );
  if (!data) return null;

  const { kpis, funnel, recentLeads, overdueLeads } = data;
  const maxFunnel = Math.max(...(funnel?.map(f => f.count) || [1]), 1);

  const kpiCards = [
    { label: 'Total Leads',       value: kpis.totalLeads,                    icon: 'fa-user-plus',    cls: 'blue',   footer: 'All leads in your network' },
    { label: 'Active Leads',      value: kpis.activeLeads,                   icon: 'fa-fire',         cls: 'amber',  footer: 'In active pipeline stages' },
    { label: 'Cases Created',     value: kpis.casesCreated,                  icon: 'fa-briefcase',    cls: 'green',  footer: 'Leads converted to cases' },
    { label: 'Total Commission',  value: fmt(kpis.totalCommPaise),           icon: 'fa-rupee-sign',   cls: 'purple', footer: 'Across all commissions' },
    { label: 'Commission Paid',   value: fmt(kpis.paidCommPaise),            icon: 'fa-check-circle', cls: 'green',  footer: `Pending: ${fmt(kpis.totalCommPaise - kpis.paidCommPaise)}` },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Agent Dashboard</h2>
          <div className="subtitle">Your leads, cases and commissions at a glance</div>
        </div>
        <button className="btn btn-outline" onClick={() => window.location.reload()}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {kpiCards.map(card => (
          <div key={card.label} className={`kpi-card ${card.cls}`} style={{ padding: '14px 16px' }}>
            <div className="kpi-label" style={{ fontSize: 11 }}>{card.label}</div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{card.value ?? '—'}</div>
            <div className="kpi-footer neutral" style={{ fontSize: 11 }}>
              <i className={`fas ${card.icon}`}></i> {card.footer}
            </div>
          </div>
        ))}
      </div>

      {/* Funnel + Recent Leads */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Lead Funnel */}
        <div className="table-container" style={{ padding: 20 }}>
          <div className="table-header" style={{ padding: '0 0 14px 0', border: 'none' }}>
            <h3><i className="fas fa-filter" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i>Lead Funnel</h3>
          </div>
          {funnel?.map(f => (
            <div key={f.stage} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{STAGE_LABELS[f.stage] || f.stage}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.count}</span>
              </div>
              <div style={{ height: 7, background: '#f0f2f5', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(f.count / maxFunnel) * 100}%`, background: STAGE_COLORS[f.stage] || 'var(--sbi-accent)', borderRadius: 4, transition: 'width 0.5s' }}></div>
              </div>
            </div>
          ))}
          {!funnel?.length && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No leads yet.</div>}
        </div>

        {/* Recent Leads */}
        <div className="table-container" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-header">
            <h3><i className="fas fa-clock" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i>Recent Leads</h3>
          </div>
          <table className="app-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {!recentLeads?.length && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No leads yet.</td></tr>
              )}
              {recentLeads?.map(l => (
                <tr key={l.id}>
                  <td><div className="student-name">{l.full_name}</div></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{l.phone_e164}</td>
                  <td><StageChip stage={l.stage} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-up Queue */}
      <div className="table-container" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-header">
          <h3><i className="fas fa-exclamation-triangle" style={{ marginRight: 8, color: 'var(--status-amber)' }}></i>Follow-up Queue</h3>
          <span className="results-count">Least recently updated</span>
        </div>
        {!overdueLeads?.length ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-check-circle" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--status-green)' }}></i>
            All leads are up to date
          </div>
        ) : (
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {overdueLeads.map(l => (
              <div key={l.id} style={{ background: '#f8f9fb', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border-color)' }}>
                <div className="student-name">{l.full_name}</div>
                <div className="student-sub">{l.phone_e164}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                  <StageChip stage={l.stage} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(l.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
