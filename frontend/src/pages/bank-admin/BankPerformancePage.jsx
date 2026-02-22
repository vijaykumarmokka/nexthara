import { useState, useEffect } from 'react';
import { bankAdminApi } from '../../api';

const fmt = (paise) => paise ? `₹${(paise / 100000).toFixed(1)}L` : '₹0';

const STATUS_COLORS = {
  INITIATED: '#64748b', DOCS_PENDING: '#f59e0b', LOGIN_DONE: '#3b82f6',
  UNDER_REVIEW: '#8b5cf6', SANCTIONED: '#059669', REJECTED: '#dc2626',
  DISBURSED: '#0d9488', CLOSED: '#374151',
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

export default function BankPerformancePage({ bankId, bankRole, onOpenApp }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bankId) return;
    setLoading(true);
    bankAdminApi.getEnhancedDashboard(bankId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [bankId]);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i></div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>Failed to load dashboard: {error}</div>;
  if (!data) return null;

  const { kpis = {}, funnel = [], sla_risk_queue = [], country_mix = [], branch_performance = [], officer_leaderboard = [], credit_utilization = [], tat_metrics = {} } = data;

  const total = kpis.total_assigned || 0;
  const sanction_pct = total > 0 ? ((kpis.sanctioned / total) * 100).toFixed(1) : '0.0';
  const rejection_pct = total > 0 ? ((kpis.rejected / total) * 100).toFixed(1) : '0.0';

  const kpiCards = [
    { label: 'Apps Assigned', value: total, color: '#2563eb', icon: 'fa-briefcase' },
    { label: 'Active', value: kpis.active || 0, color: '#0d9488', icon: 'fa-spinner' },
    { label: 'Sanctioned', value: kpis.sanctioned || 0, color: '#059669', icon: 'fa-check-circle' },
    { label: 'Rejected', value: kpis.rejected || 0, color: '#dc2626', icon: 'fa-times-circle' },
    { label: 'Disbursed', value: kpis.disbursed || 0, color: '#7c3aed', icon: 'fa-money-bill-wave' },
    { label: 'SLA Breaches', value: kpis.sla_breaches || 0, color: '#dc2626', icon: 'fa-exclamation-triangle' },
    { label: 'Sanction %', value: `${sanction_pct}%`, color: '#059669', icon: 'fa-percentage' },
    { label: 'Avg Sanction', value: fmt(kpis.avg_sanction_paise), color: '#0d9488', icon: 'fa-rupee-sign' },
  ];

  const maxFunnel = Math.max(...funnel.map(f => f.count), 1);
  const maxCountry = Math.max(...country_mix.map(c => c.count), 1);
  const maxCredit = Math.max(...credit_utilization.map(m => m.total), 1);

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1, background: '#e5e7eb', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        {kpiCards.map(k => (
          <div key={k.label} style={{ background: '#fff', padding: '16px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Funnel + Credit Utilization */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Application Funnel */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            <i className="fas fa-filter" style={{ marginRight: 8, color: '#2563eb' }}></i>Application Funnel
          </div>
          {funnel.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingTop: 24 }}>No applications yet</div>
          ) : funnel.map(f => (
            <div key={f.status} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: '#374151', fontWeight: 500 }}>{f.status?.replace(/_/g,' ')}</span>
                <span style={{ color: '#6b7280', fontWeight: 700 }}>{f.count}</span>
              </div>
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4 }}>
                <div style={{ height: 8, width: `${(f.count / maxFunnel) * 100}%`, background: STATUS_COLORS[f.status] || '#9ca3af', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Sanction %</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{sanction_pct}%</div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Rejection %</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{rejection_pct}%</div>
            </div>
          </div>
        </div>

        {/* Credit Utilization */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            <i className="fas fa-chart-bar" style={{ marginRight: 8, color: '#7c3aed' }}></i>Credit Utilization (Monthly)
          </div>
          {credit_utilization.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingTop: 24 }}>No data yet</div>}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
            {credit_utilization.map(m => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1, flex: 1, justifyContent: 'flex-end' }}>
                  <div style={{ background: '#059669', width: '100%', height: `${(m.sanctioned / Math.max(maxCredit, 1)) * 90}px`, borderRadius: '3px 3px 0 0', minHeight: 2 }} title={`Sanctioned: ${m.sanctioned}`} />
                  <div style={{ background: '#bfdbfe', width: '100%', height: `${((m.total - m.sanctioned) / Math.max(maxCredit, 1)) * 90}px`, minHeight: 2 }} title={`Other: ${m.total - m.sanctioned}`} />
                </div>
                <div style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>{m.month?.slice(5)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11 }}>
            <span style={{ color: '#059669' }}>■ Sanctioned</span>
            <span style={{ color: '#3b82f6' }}>■ Other Active</span>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Avg Sanction</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{fmt(kpis.avg_sanction_paise)}</div>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Total Disbursed</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{fmt(kpis.total_disbursed_paise)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: TAT Breakdown + Country Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* TAT Breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            <i className="fas fa-clock" style={{ marginRight: 8, color: '#f59e0b' }}></i>TAT Breakdown
          </div>
          {[
            { label: 'Assign → Login', value: tat_metrics?.avg_hours_assign_to_login },
            { label: 'Login → Sanction', value: tat_metrics?.avg_hours_login_to_sanction },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 13, color: '#374151' }}>{t.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.value ? '#0d7377' : '#9ca3af' }}>
                {t.value ? `${(t.value / 24).toFixed(1)}d` : '—'}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, background: '#f0f9ff', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 12, color: '#0d7377', fontWeight: 700, marginBottom: 6 }}>SLA Risk Queue</div>
            <div style={{ fontSize: 13, color: '#374151' }}>
              <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 20 }}>{kpis.sla_breaches || 0}</span> active SLA breaches
            </div>
          </div>
        </div>

        {/* Country Mix */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            <i className="fas fa-globe" style={{ marginRight: 8, color: '#0d9488' }}></i>Country Mix
          </div>
          {country_mix.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>No data</div>}
          {country_mix.map(c => (
            <div key={c.country} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: '#374151', fontWeight: 500 }}>{c.country}</span>
                <span style={{ color: '#6b7280' }}>{c.count} <span style={{ fontSize: 11, color: '#059669' }}>({c.sanctioned} sanctioned)</span></span>
              </div>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4 }}>
                <div style={{ height: 6, width: `${(c.count / maxCountry) * 100}%`, background: '#0d9488', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SLA Risk Queue */}
      {sla_risk_queue.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: 8, color: '#dc2626' }}></i>SLA Risk Queue (Top 10)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                {['Student','Country','Status','SLA Due','Branch','Officer',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sla_risk_queue.map(a => {
                const days = daysUntil(a.sla_due_at);
                const breached = days !== null && days < 0;
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f9fafb', cursor: onOpenApp ? 'pointer' : 'default' }}
                    onClick={() => onOpenApp && onOpenApp(a.id)}>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{a.student_name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{a.country || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: (STATUS_COLORS[a.status] || '#9ca3af') + '20', color: STATUS_COLORS[a.status] || '#9ca3af', fontWeight: 700 }}>
                        {a.status?.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: breached ? '#dc2626' : days <= 1 ? '#d97706' : '#374151' }}>
                        {breached ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{a.branch_name || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{a.officer_name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {onOpenApp && (
                        <button onClick={e => { e.stopPropagation(); onOpenApp(a.id); }} style={{ fontSize: 11, padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>
                          Open
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Branch / Region Performance Table */}
      {(['SUPER_ADMIN','REGION_HEAD'].includes(bankRole)) && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
              <i className="fas fa-building" style={{ marginRight: 8, color: '#2563eb' }}></i>Branch / Region Performance
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Branch','Region/State','Apps','Sanctions','Sanction %','SLA Breach','Avg Ticket'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branch_performance.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No branches yet</td></tr>
              )}
              {branch_performance.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13, color: '#111827' }}>{b.branch_name}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280' }}>{b.region ? `${b.region} / ` : ''}{b.state || '—'}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{b.apps}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#059669', fontWeight: 600 }}>{b.sanctions}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ color: (b.sanction_rate || 0) >= 50 ? '#059669' : '#d97706', fontWeight: 700, fontSize: 13 }}>
                      {b.sanction_rate != null ? `${b.sanction_rate}%` : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {b.sla_breaches > 0
                      ? <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{b.sla_breaches}</span>
                      : <span style={{ color: '#059669', fontSize: 12, fontWeight: 600 }}>✓ Clean</span>}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#374151' }}>{fmt(b.avg_ticket_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Officer Leaderboard */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
            <i className="fas fa-trophy" style={{ marginRight: 8, color: '#d97706' }}></i>Officer Performance Leaderboard
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['#','Officer','Branch','Apps Handled','Sanctions','Sanction %','SLA Breaches'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {officer_leaderboard.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No officers yet</td></tr>
            )}
            {officer_leaderboard.map((o, i) => (
              <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6', background: i === 0 ? '#fffbeb' : 'transparent' }}>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: i === 0 ? '#d97706' : '#9ca3af' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </td>
                <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13, color: '#111827' }}>{o.name}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{o.branch_name || '—'}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{o.apps_handled}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: '#059669', fontWeight: 600 }}>{o.sanctions}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ color: (o.sanction_rate || 0) >= 50 ? '#059669' : '#d97706', fontWeight: 700 }}>
                    {o.sanction_rate != null ? `${o.sanction_rate}%` : '—'}
                  </span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {o.sla_breaches > 0
                    ? <span style={{ color: '#dc2626', fontWeight: 700 }}>{o.sla_breaches}</span>
                    : <span style={{ color: '#059669', fontWeight: 600 }}>✓</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
