import { useState, useEffect } from 'react';
import { adminApi } from '../../api';

const STAGE_COLOR = {
  NEW: '#3b82f6', CONTACT_ATTEMPTED: '#f59e0b', CONNECTED: '#8b5cf6',
  QUALIFIED: '#06b6d4', DOCS_REQUESTED: '#f97316', DOCS_RECEIVED: '#22c55e',
  CASE_CREATED: '#1a1d4d', DROPPED: '#ef4444', LOST: '#dc2626', DUPLICATE: '#9ca3af',
};

function KPICard({ label, value, sub, color = '#1a1d4d' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Funnel({ data }) {
  const max = Math.max(...(data || []).map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(data || []).map(d => (
        <div key={d.stage} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 130, fontSize: 11, fontWeight: 600, color: '#374151', textAlign: 'right', flexShrink: 0 }}>{d.stage}</div>
          <div style={{ flex: 1, height: 20, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.count / max) * 100}%`, background: STAGE_COLOR[d.stage] || '#6b7280', borderRadius: 4, transition: 'width 0.3s', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
              <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{d.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const VIEWS = ['Leads', 'Cases'];

export default function AdminLeadsCasesMonitorPage() {
  const [view, setView] = useState('Leads');
  const [leadsData, setLeadsData] = useState(null);
  const [casesData, setCasesData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.getLeadsMonitor({ days }),
      adminApi.getCasesMonitor({ days }),
    ]).then(([l, c]) => { setLeadsData(l); setCasesData(c); }).finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1d4d' }}>Leads & Cases Monitor</h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Director-level pipeline visibility</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
            {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 24 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            background: 'none', border: 'none', padding: '10px 24px', cursor: 'pointer',
            fontSize: 14, fontWeight: view === v ? 700 : 500,
            color: view === v ? '#1a1d4d' : '#6b7280',
            borderBottom: `2px solid ${view === v ? '#1a1d4d' : 'transparent'}`,
            marginBottom: -2,
          }}>{v}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading...</div>}

      {/* LEADS VIEW */}
      {!loading && view === 'Leads' && leadsData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Funnel + Source */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>Lead Stage Funnel</h3>
              <Funnel data={leadsData.funnel} />
            </div>
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>By Source</h3>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead><tr style={{ color: '#6b7280', fontSize: 11 }}><th style={{ textAlign: 'left', padding: '4px 0' }}>Source</th><th style={{ textAlign: 'right' }}>Leads</th></tr></thead>
                <tbody>
                  {(leadsData.by_source || []).map(s => (
                    <tr key={s.lead_source_type} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 0', fontWeight: 500 }}>{s.lead_source_type || 'Unknown'}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#1a1d4d' }}>{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staff Performance */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>Staff Lead Performance</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Staff', 'Leads Assigned', 'Converted', 'Conversion %'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(leadsData.by_staff || []).map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.name}</td>
                    <td style={{ padding: '10px 12px' }}>{s.leads}</td>
                    <td style={{ padding: '10px 12px', color: '#22c55e', fontWeight: 700 }}>{s.converted}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', maxWidth: 100 }}>
                          <div style={{ height: '100%', background: '#22c55e', width: `${s.leads > 0 ? Math.round(s.converted*100/s.leads) : 0}%` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{s.leads > 0 ? Math.round(s.converted*100/s.leads) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {!leadsData.by_staff?.length && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>No staff data</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Stuck Leads */}
          {(leadsData.stuck_leads || []).length > 0 && (
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #fee2e2', padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#ef4444' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }}></i>Stuck Leads (&gt;48h no update)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    {['Lead', 'Stage', 'Assigned To', 'Time Stuck'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#991b1b', borderBottom: '1px solid #fee2e2' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leadsData.stuck_leads.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{l.full_name}</td>
                      <td style={{ padding: '8px 12px' }}><span style={{ background: STAGE_COLOR[l.stage] + '20', color: STAGE_COLOR[l.stage], padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{l.stage}</span></td>
                      <td style={{ padding: '8px 12px', color: '#6b7280' }}>{l.assigned_name || 'Unassigned'}</td>
                      <td style={{ padding: '8px 12px' }}><span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{l.hours_stuck}h</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CASES VIEW */}
      {!loading && view === 'Cases' && casesData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* KPI Cards */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <KPICard label="Total Cases" value={casesData.summary?.total} color="#1a1d4d" />
            <KPICard label="Sanctioned" value={casesData.summary?.sanctioned} color="#22c55e" />
            <KPICard label="Rejected" value={casesData.summary?.rejected} color="#ef4444" />
            <KPICard label="Disbursed" value={casesData.summary?.disbursed} color="#3b82f6" />
            <KPICard label="Total Disbursed" value={casesData.summary?.total_disbursed ? `₹${(casesData.summary.total_disbursed/100000).toFixed(1)}L` : '—'} color="#8b5cf6" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* By Status */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>Cases by Status</h3>
              <table style={{ width: '100%', fontSize: 13 }}>
                <tbody>
                  {(casesData.by_status || []).map(s => (
                    <tr key={s.status} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 0', fontWeight: 500 }}>{s.status}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#1a1d4d' }}>{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By Bank */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>Cases by Bank</h3>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead><tr style={{ color: '#6b7280', fontSize: 11 }}>
                  <th style={{ textAlign: 'left', padding: '4px 0' }}>Bank</th>
                  <th style={{ textAlign: 'right' }}>Apps</th>
                  <th style={{ textAlign: 'right' }}>Sanctioned</th>
                </tr></thead>
                <tbody>
                  {(casesData.by_bank || []).map(b => (
                    <tr key={b.bank} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 0' }}>{b.bank}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>{b.apps}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{b.sanctioned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SLA Risk */}
          {(casesData.sla_risk || []).length > 0 && (
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#f97316' }}>SLA Risk Radar</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#fff7ed' }}>
                    {['App ID', 'Student', 'Bank', 'Status', 'SLA Due', 'Time Left'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#92400e', borderBottom: '1px solid #fed7aa' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {casesData.sla_risk.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{r.id}</td>
                      <td style={{ padding: '8px 12px' }}>{r.student_name || '-'}</td>
                      <td style={{ padding: '8px 12px' }}>{r.bank_name}</td>
                      <td style={{ padding: '8px 12px' }}><span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{r.status}</span></td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280' }}>{r.sla_due_at?.slice(0,10)}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ background: r.hours_left < 0 ? '#fee2e2' : '#fef3c7', color: r.hours_left < 0 ? '#991b1b' : '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                          {r.hours_left < 0 ? `${Math.abs(r.hours_left)}h breached` : `${r.hours_left}h left`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
