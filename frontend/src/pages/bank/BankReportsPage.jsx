import { useEffect, useState } from 'react';
import { api } from '../../api';
import { STATUS_CONFIG, formatCurrency } from '../../constants';

const STAGE_LABELS = {
  1: 'Pre-Login', 2: 'Login', 3: 'Doc Verification',
  4: 'Credit Review', 5: 'Decision', 6: 'Post Sanction', 7: 'Closed',
};

export default function BankReportsPage() {
  const [stats, setStats]     = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [all, setAll]         = useState(null);

  function load() {
    api.getStats().then(setStats).catch(() => {});
    api.getPipeline().then(setPipeline).catch(() => {});
    api.getApplications({ limit: 200 }).then(r => setAll(r.data)).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  // Compute analytics from all
  const analytics = all ? (() => {
    const statusCounts = {};
    let totalSanctioned = 0, totalDisbursed = 0, totalRequested = 0;
    for (const app of all) {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      if (app.sanction_amount) totalSanctioned += app.sanction_amount;
      if (app.disbursed_amount) totalDisbursed += app.disbursed_amount;
      if (app.loan_amount_requested) totalRequested += app.loan_amount_requested;
    }
    return { statusCounts, totalSanctioned, totalDisbursed, totalRequested };
  })() : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reports & Analytics</h2>
          <div className="subtitle">Portfolio summary and performance metrics</div>
        </div>
        <button className="btn btn-outline" onClick={load}><i className="fas fa-sync-alt"></i> Refresh</button>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Applications', value: stats?.total ?? '—', icon: 'fa-folder-open', cls: 'blue' },
          { label: 'Total Sanctioned', value: stats?.sanctioned ?? '—', icon: 'fa-check-circle', cls: 'green' },
          { label: 'Total Rejected', value: stats?.rejected ?? '—', icon: 'fa-times-circle', cls: 'red' },
          { label: 'SLA Breaches', value: stats?.slaBreach ?? '—', icon: 'fa-fire', cls: 'purple' },
        ].map(card => (
          <div key={card.label} className={`kpi-card ${card.cls}`}>
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-value">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      {analytics && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div className="bank-summary-section-title" style={{ marginBottom: 16 }}><i className="fas fa-rupee-sign" style={{ marginRight: 8 }}></i> Financial Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Loan Amount Requested</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--sbi-accent)' }}>{formatCurrency(analytics.totalRequested)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Amount Sanctioned</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-green)' }}>{formatCurrency(analytics.totalSanctioned)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Amount Disbursed</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1565c0' }}>{formatCurrency(analytics.totalDisbursed)}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Pipeline Stage Breakdown */}
        <div className="card" style={{ padding: 20 }}>
          <div className="bank-summary-section-title" style={{ marginBottom: 16 }}><i className="fas fa-stream" style={{ marginRight: 8 }}></i> Pipeline Stage Breakdown</div>
          {!pipeline ? (
            <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>Loading...</div>
          ) : (
            <div>
              {Object.entries(pipeline).map(([stage, data]) => {
                const pct = stats?.total ? Math.round((data.count / stats.total) * 100) : 0;
                return (
                  <div key={stage} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Stage {stage}: {data.label}</span>
                      <span style={{ fontWeight: 600 }}>{data.count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--sbi-accent)', borderRadius: 3, transition: 'width 0.4s' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="card" style={{ padding: 20 }}>
          <div className="bank-summary-section-title" style={{ marginBottom: 16 }}><i className="fas fa-chart-pie" style={{ marginRight: 8 }}></i> Status Breakdown</div>
          {!analytics ? (
            <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>Loading...</div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {Object.entries(analytics.statusCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status];
                  const pct = all ? Math.round((count / all.length) * 100) : 0;
                  return (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 150 }}>{cfg?.label || status}</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--sbi-accent)', borderRadius: 3 }}></div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>{count}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* SLA Health */}
      <div className="card" style={{ padding: 20 }}>
        <div className="bank-summary-section-title" style={{ marginBottom: 16 }}><i className="fas fa-heartbeat" style={{ marginRight: 8 }}></i> SLA Health</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'On Track', count: all ? all.filter(a => a.sla_days <= 2 && a.awaiting_from !== 'Closed').length : '—', cls: 'green', icon: 'fa-check-circle' },
            { label: 'At Risk (≥70% SLA)', count: stats?.slaWarning ?? '—', cls: 'amber', icon: 'fa-exclamation-triangle' },
            { label: 'Breached SLA', count: stats?.slaBreach ?? '—', cls: 'red', icon: 'fa-fire' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}><i className={`fas ${item.icon}`} style={{ color: item.cls === 'green' ? 'var(--status-green)' : item.cls === 'amber' ? '#ff8f00' : '#d32f2f' }}></i></div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{item.count}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
