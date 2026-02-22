import { useState, useEffect } from 'react';
import { adminApi } from '../../api';

const KPI_CONFIG = [
  { key: 'new_leads',     label: 'New Leads',      icon: 'fa-user-plus',    color: '#1e88e5' },
  { key: 'connected_pct', label: 'Connected %',     icon: 'fa-phone-alt',    color: '#43a047', suffix: '%' },
  { key: 'cases_created', label: 'Cases Created',   icon: 'fa-briefcase',    color: '#7b1fa2' },
  { key: 'sanction_pct',  label: 'Sanction Rate',   icon: 'fa-check-circle', color: '#00897b', suffix: '%' },
  { key: 'sla_breaches',  label: 'SLA Breaches',    icon: 'fa-exclamation-triangle', color: '#e53935' },
  { key: 'comms_failed',  label: 'Comms Failed',    icon: 'fa-times-circle', color: '#fb8c00' },
];

function KpiCard({ label, value, icon, color, suffix = '' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`fas ${icon}`} style={{ color, fontSize: 18 }}></i>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1d4d', lineHeight: 1 }}>{value ?? '—'}{suffix}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function QueueCard({ title, icon, color, items, renderRow }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <i className={`fas ${icon}`} style={{ color, fontSize: 14 }}></i>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1d4d' }}>{title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, background: color + '18', color, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 12 }}>All clear</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.slice(0, 5).map((item, i) => (
            <div key={i} style={{ fontSize: 12, padding: '8px 10px', background: '#f9fafb', borderRadius: 6, borderLeft: `3px solid ${color}` }}>
              {renderRow(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getDashboard(days)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i></div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>Failed to load dashboard.</div>;

  const { kpis, live_queues, bank_performance, staff_performance, campaign_mix } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1d4d' }}>Master Brain Dashboard</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Live operational overview — all engines</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid', fontSize: 12, cursor: 'pointer', fontWeight: days === d ? 700 : 400, background: days === d ? '#1a1d4d' : '#fff', color: days === d ? '#fff' : '#374151', borderColor: days === d ? '#1a1d4d' : '#d1d5db' }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {KPI_CONFIG.map(k => (
          <KpiCard key={k.key} label={k.label} value={kpis?.[k.key]} icon={k.icon} color={k.color} suffix={k.suffix || ''} />
        ))}
      </div>

      {/* Live Queues */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Live Queues</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <QueueCard
            title="Overdue Follow-ups" icon="fa-clock" color="#ef4444"
            items={live_queues?.overdue_followups || []}
            renderRow={r => (
              <div>
                <div style={{ fontWeight: 600, color: '#1a1d4d', marginBottom: 2 }}>{r.lead_name}</div>
                <div style={{ color: '#ef4444' }}>{r.hours_overdue}h overdue</div>
              </div>
            )}
          />
          <QueueCard
            title="Docs Pending >48h" icon="fa-file-exclamation" color="#f59e0b"
            items={live_queues?.docs_pending || []}
            renderRow={r => (
              <div>
                <div style={{ fontWeight: 600, color: '#1a1d4d', marginBottom: 2 }}>{r.student_name}</div>
                <div style={{ color: '#f59e0b' }}>{r.hours_pending}h · {r.missing_docs} docs missing</div>
              </div>
            )}
          />
          <QueueCard
            title="Bank SLA Risk" icon="fa-university" color="#7c3aed"
            items={live_queues?.sla_risk || []}
            renderRow={r => (
              <div>
                <div style={{ fontWeight: 600, color: '#1a1d4d', marginBottom: 2 }}>{r.bank_name}</div>
                <div style={{ color: r.hours_left < 0 ? '#ef4444' : '#7c3aed' }}>{r.hours_left < 0 ? `${Math.abs(r.hours_left)}h breached` : `${r.hours_left}h left`}</div>
              </div>
            )}
          />
          <QueueCard
            title="Message Failures" icon="fa-times-circle" color="#dc2626"
            items={live_queues?.msg_failures || []}
            renderRow={r => (
              <div>
                <div style={{ fontWeight: 600, color: '#1a1d4d', marginBottom: 2 }}>{r.recipient}</div>
                <div style={{ color: '#dc2626' }}>{r.template} · {r.entity_type}</div>
              </div>
            )}
          />
        </div>
      </div>

      {/* Bank + Staff Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Bank Performance */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d4d', marginBottom: 14 }}>Bank Performance</div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Bank', 'Apps', 'Sanctioned', 'Rejected', 'SLA Breach', 'Rate%'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(bank_performance || []).map((b, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#1a1d4d' }}>{b.bank_name}</td>
                  <td style={{ padding: '8px' }}>{b.total_apps}</td>
                  <td style={{ padding: '8px', color: '#16a34a' }}>{b.sanctioned}</td>
                  <td style={{ padding: '8px', color: '#dc2626' }}>{b.rejected}</td>
                  <td style={{ padding: '8px', color: b.sla_breaches > 0 ? '#ef4444' : '#6b7280' }}>{b.sla_breaches}</td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#7b1fa2' }}>{b.sanction_pct}%</td>
                </tr>
              ))}
              {(!bank_performance || bank_performance.length === 0) && (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No data</td></tr>
              )}
            </tbody>
          </table></div>
        </div>

        {/* Staff Performance */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d4d', marginBottom: 14 }}>Staff Performance</div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Name', 'Leads', 'Connected', 'Qualified', 'Cases'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(staff_performance || []).map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#1a1d4d' }}>{s.name}</td>
                  <td style={{ padding: '8px' }}>{s.leads_assigned}</td>
                  <td style={{ padding: '8px', color: '#1e88e5' }}>{s.connected}</td>
                  <td style={{ padding: '8px', color: '#7b1fa2' }}>{s.qualified}</td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#00897b' }}>{s.cases}</td>
                </tr>
              ))}
              {(!staff_performance || staff_performance.length === 0) && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No data</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      </div>

      {/* Campaign Mix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Source Mix */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d4d', marginBottom: 14 }}>Lead Source Mix</div>
          {(campaign_mix?.source_mix || []).map((s, i) => {
            const total = (campaign_mix?.source_mix || []).reduce((a, x) => a + x.leads, 0);
            const pct = total > 0 ? Math.round(s.leads * 100 / total) : 0;
            const colors = ['#1e88e5', '#43a047', '#e53935', '#fb8c00', '#7b1fa2', '#00897b', '#795548', '#546e7a'];
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#374151', fontWeight: 500 }}>{s.source || 'UNKNOWN'}</span>
                  <span style={{ color: '#6b7280' }}>{s.leads} ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                  <div style={{ height: 6, background: colors[i % colors.length], borderRadius: 3, width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
          {(!campaign_mix?.source_mix || campaign_mix.source_mix.length === 0) && (
            <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 12 }}>No lead data</div>
          )}
        </div>

        {/* Top Campaigns */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d4d', marginBottom: 14 }}>Top Campaigns</div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Campaign', 'Leads', 'Cases', 'Conv%'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(campaign_mix?.top_campaigns || []).map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px', color: '#1a1d4d', fontWeight: 500 }}>{c.campaign_name || c.campaign_id || 'N/A'}</td>
                  <td style={{ padding: '8px' }}>{c.leads}</td>
                  <td style={{ padding: '8px', color: '#00897b' }}>{c.cases}</td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#7b1fa2' }}>
                    {c.leads > 0 ? Math.round(c.cases * 100 / c.leads) : 0}%
                  </td>
                </tr>
              ))}
              {(!campaign_mix?.top_campaigns || campaign_mix.top_campaigns.length === 0) && (
                <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No campaign data</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}
