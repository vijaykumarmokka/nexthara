import { useState, useEffect } from 'react';
import { agentApi } from '../../api';
import toast from 'react-hot-toast';

const STAGE_COLORS = {
  NEW: 'var(--status-grey)', CONTACT_ATTEMPTED: 'var(--status-amber)', CONNECTED: 'var(--status-blue)',
  QUALIFIED: 'var(--status-purple)', DOCS_REQUESTED: '#ad1457', DOCS_RECEIVED: '#00838f',
  CASE_CREATED: 'var(--status-green)', DROPPED: 'var(--status-red)', LOST: '#991b1b', DUPLICATE: 'var(--status-grey)',
};

const STATUS_BADGE = {
  PENDING: 'badge-amber', CONFIRMED: 'badge-blue', PAID: 'badge-green', DISPUTED: 'badge-red',
};

function fmtL(p) { return p ? `₹${((p || 0) / 100000).toFixed(1)}L` : '₹0'; }
function pct(a, b) { return b ? `${Math.round((a / b) * 100)}%` : '0%'; }

export default function AgentReportsPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentApi.getReports()
      .then(setData)
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--sbi-accent)' }}></i>
      Loading reports...
    </div>
  );
  if (!data) return null;

  const { leadsByStage, leadsByMonth, conversionRate, commByStatus } = data;
  const totalLeads    = conversionRate?.total || 0;
  const converted     = conversionRate?.converted || 0;
  const convPct       = totalLeads ? Math.round((converted / totalLeads) * 100) : 0;
  const maxStageCount = Math.max(...(leadsByStage?.map(s => s.count) || [1]), 1);
  const maxMonth      = Math.max(...(leadsByMonth?.map(m => m.count) || [1]), 1);
  const totalComm     = commByStatus?.reduce((a, b) => a + b.total_paise, 0) || 0;
  const paidComm      = commByStatus?.find(c => c.status === 'PAID')?.total_paise || 0;

  const kpiCards = [
    { label: 'Total Leads',       value: totalLeads,          cls: 'blue',   icon: 'fa-user-plus',    footer: 'All leads in pipeline' },
    { label: 'Cases Created',     value: converted,           cls: 'green',  icon: 'fa-briefcase',    footer: 'Leads converted to cases' },
    { label: 'Lead→Case Rate',    value: `${convPct}%`,       cls: 'purple', icon: 'fa-percentage',   footer: 'Conversion rate' },
    { label: 'Total Commission',  value: fmtL(totalComm),     cls: 'amber',  icon: 'fa-coins',        footer: 'Across all statuses' },
    { label: 'Commission Paid',   value: fmtL(paidComm),      cls: 'green',  icon: 'fa-check-circle', footer: 'Successfully disbursed' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <div className="subtitle">Performance overview and commission analytics</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {kpiCards.map(card => (
          <div key={card.label} className={`kpi-card ${card.cls}`}>
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-value">{card.value ?? '—'}</div>
            <div className="kpi-footer neutral"><i className={`fas ${card.icon}`}></i> {card.footer}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Leads by Stage */}
        <div className="table-container" style={{ padding: 20 }}>
          <div className="table-header" style={{ padding: '0 0 14px 0', border: 'none' }}>
            <h3><i className="fas fa-filter" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i>Leads by Stage</h3>
          </div>
          {(leadsByStage || []).map(s => (
            <div key={s.stage} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{s.stage?.replace(/_/g, ' ')}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.count}</span>
              </div>
              <div style={{ height: 7, background: '#f0f2f5', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(s.count / maxStageCount) * 100}%`, background: STAGE_COLORS[s.stage] || 'var(--sbi-accent)', borderRadius: 4, transition: 'width 0.5s' }}></div>
              </div>
            </div>
          ))}
          {leadsByStage?.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No lead data yet.</div>}
        </div>

        {/* Leads by Month */}
        <div className="table-container" style={{ padding: 20 }}>
          <div className="table-header" style={{ padding: '0 0 14px 0', border: 'none' }}>
            <h3><i className="fas fa-chart-bar" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i>Leads by Month (Last 12)</h3>
          </div>
          {(leadsByMonth || []).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet.</div>}
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 140 }}>
            {[...(leadsByMonth || [])].reverse().map(m => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{m.count}</div>
                <div style={{ width: '100%', height: `${Math.max((m.count / maxMonth) * 110, 4)}px`, background: 'var(--sbi-accent)', borderRadius: '3px 3px 0 0', opacity: 0.8 }}></div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 30, textAlign: 'center' }}>
                  {m.month?.slice(5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Commission Summary */}
      <div className="table-container" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div className="table-header">
          <h3><i className="fas fa-coins" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i>Commission Summary</h3>
        </div>
        {(commByStatus || []).length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No commission data yet.</div>
        ) : (
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {commByStatus.map(c => (
              <div key={c.status} style={{ padding: '16px 18px', borderRadius: 8, border: '1px solid var(--border-color)', background: '#f8f9fb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className={`badge ${STATUS_BADGE[c.status] || 'badge-grey'}`}>{c.status}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.count} cases</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtL(c.total_paise)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pct(c.total_paise, totalComm)} of total</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversion Funnel */}
      <div className="table-container" style={{ padding: 20 }}>
        <div className="table-header" style={{ padding: '0 0 14px 0', border: 'none' }}>
          <h3><i className="fas fa-funnel-dollar" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i>Lead → Case Conversion</h3>
        </div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Leads', value: totalLeads, cls: 'grey' },
            { label: 'Cases Created', value: converted, cls: 'green' },
            { label: 'Conversion Rate', value: `${convPct}%`, cls: 'purple' },
          ].map((item, i) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div className={`kpi-card ${item.cls}`} style={{ textAlign: 'center', minWidth: 160, margin: 0 }}>
                <div className="kpi-value">{item.value}</div>
                <div className="kpi-label" style={{ marginTop: 4 }}>{item.label}</div>
              </div>
              {i < 2 && <div style={{ fontSize: 20, color: 'var(--border-color)', padding: '0 12px' }}>→</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
