import { useState, useEffect } from 'react';
import { adminApi } from '../../api';

const SUB_TABS = [
  { key: 'leads', label: 'Leads', icon: 'fa-funnel-dollar' },
  { key: 'cases', label: 'Cases', icon: 'fa-briefcase' },
  { key: 'banks', label: 'Banks', icon: 'fa-university' },
  { key: 'staff', label: 'Staff', icon: 'fa-users' },
  { key: 'campaigns', label: 'Campaigns', icon: 'fa-bullhorn' },
];

function StatCard({ label, value, color = '#1a1d4d', suffix = '' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value ?? '—'}{suffix}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{label}</div>
    </div>
  );
}

function DataTable({ columns, rows, emptyMsg = 'No data' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 'max-content' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {columns.map(c => <th key={c.key} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: '8px 12px', color: c.bold ? '#1a1d4d' : '#4b5563', fontWeight: c.bold ? 600 : 400 }}>
                  {c.render ? c.render(r[c.key], r) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
          {(!rows || rows.length === 0) && <tr><td colSpan={columns.length} style={{ padding: 28, textAlign: 'center', color: '#9ca3af' }}>{emptyMsg}</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}

function LeadsReport({ days }) {
  const [data, setData] = useState(null);
  useEffect(() => { adminApi.getLeadReport(days).then(setData).catch(() => {}); }, [days]);
  if (!data) return <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin"></i></div>;
  const total = (data.funnel || []).reduce((a, x) => a + x.count, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        <StatCard label="Total Leads" value={total} color="#1e88e5" />
        <StatCard label="Converted to Case" value={(data.funnel || []).find(f => f.stage === 'CASE_CREATED')?.count || 0} color="#00897b" />
        <StatCard label="Dropped / Lost" value={(data.funnel || []).filter(f => ['DROPPED','LOST','DUPLICATE'].includes(f.stage)).reduce((a, x) => a + x.count, 0)} color="#e53935" />
        <StatCard label="Campaigns" value={(data.top_campaigns || []).length} color="#7b1fa2" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <DataTable columns={[
          { key: 'source', label: 'Source', bold: true },
          { key: 'total', label: 'Leads' },
          { key: 'converted', label: 'Converted', render: v => <span style={{ color: '#16a34a', fontWeight: 600 }}>{v}</span> },
          { key: 'total', label: 'Conv%', render: (v, r) => <span style={{ color: '#7b1fa2', fontWeight: 600 }}>{v > 0 ? Math.round(r.converted * 100 / v) : 0}%</span> },
        ]} rows={data.by_source} />
        <DataTable columns={[
          { key: 'stage', label: 'Stage', bold: true },
          { key: 'count', label: 'Count', render: v => <span style={{ fontWeight: 700, color: '#1a1d4d' }}>{v}</span> },
        ]} rows={data.funnel} />
      </div>
      <DataTable columns={[
        { key: 'campaign_name', label: 'Campaign', bold: true, render: (v, r) => v || r.meta_campaign_id || 'N/A' },
        { key: 'leads', label: 'Leads' },
        { key: 'cases', label: 'Cases', render: v => <span style={{ color: '#00897b', fontWeight: 600 }}>{v}</span> },
        { key: 'leads', label: 'Conv%', render: (v, r) => v > 0 ? Math.round(r.cases * 100 / v) + '%' : '0%' },
      ]} rows={data.top_campaigns} />
    </div>
  );
}

function CasesReport({ days }) {
  const [data, setData] = useState(null);
  useEffect(() => { adminApi.getCaseReport(days).then(setData).catch(() => {}); }, [days]);
  if (!data) return <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin"></i></div>;
  const { summary = {} } = data;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        <StatCard label="Total Cases" value={summary.total} color="#1e88e5" />
        <StatCard label="Sanctioned" value={summary.sanctioned} color="#00897b" />
        <StatCard label="Disbursed" value={summary.disbursed} color="#43a047" />
        <StatCard label="Rejected" value={summary.rejected} color="#e53935" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <DataTable columns={[
          { key: 'bank', label: 'Bank', bold: true },
          { key: 'apps', label: 'Applications' },
          { key: 'sanctioned', label: 'Sanctioned', render: v => <span style={{ color: '#16a34a', fontWeight: 600 }}>{v}</span> },
          { key: 'apps', label: 'Rate', render: (v, r) => v > 0 ? Math.round(r.sanctioned * 100 / v) + '%' : '0%' },
        ]} rows={data.by_bank} />
        <DataTable columns={[
          { key: 'status', label: 'Status', bold: true },
          { key: 'count', label: 'Count', render: v => <span style={{ fontWeight: 700, color: '#1a1d4d' }}>{v}</span> },
        ]} rows={data.by_status} />
      </div>
    </div>
  );
}

function BanksReport() {
  const [data, setData] = useState(null);
  useEffect(() => { adminApi.getBankReport().then(setData).catch(() => {}); }, []);
  if (!data) return <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin"></i></div>;
  return (
    <DataTable columns={[
      { key: 'name', label: 'Bank', bold: true },
      { key: 'total_apps', label: 'Total Apps' },
      { key: 'sanctioned', label: 'Sanctioned', render: v => <span style={{ color: '#16a34a', fontWeight: 600 }}>{v}</span> },
      { key: 'rejected', label: 'Rejected', render: v => <span style={{ color: '#dc2626', fontWeight: 600 }}>{v}</span> },
      { key: 'disbursed', label: 'Disbursed', render: v => <span style={{ color: '#43a047', fontWeight: 600 }}>{v}</span> },
      { key: 'sla_breaches', label: 'SLA Breaches', render: v => <span style={{ color: v > 0 ? '#ef4444' : '#6b7280', fontWeight: v > 0 ? 700 : 400 }}>{v}</span> },
      { key: 'avg_days_to_sanction', label: 'Avg Days', render: v => v ? `${v}d` : '—' },
    ]} rows={data.banks} />
  );
}

function StaffReport({ days }) {
  const [data, setData] = useState(null);
  useEffect(() => { adminApi.getStaffReport(days).then(setData).catch(() => {}); }, [days]);
  if (!data) return <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin"></i></div>;
  return (
    <DataTable columns={[
      { key: 'name', label: 'Staff', bold: true },
      { key: 'role', label: 'Role' },
      { key: 'leads_assigned', label: 'Leads Assigned' },
      { key: 'connected', label: 'Connected', render: v => <span style={{ color: '#1e88e5', fontWeight: 600 }}>{v}</span> },
      { key: 'qualified', label: 'Qualified', render: v => <span style={{ color: '#7b1fa2', fontWeight: 600 }}>{v}</span> },
      { key: 'cases_created', label: 'Cases', render: v => <span style={{ color: '#00897b', fontWeight: 700 }}>{v}</span> },
      { key: 'leads_assigned', label: 'Conv%', render: (v, r) => v > 0 ? Math.round(r.cases_created * 100 / v) + '%' : '0%' },
    ]} rows={data.staff} />
  );
}

function CampaignsReport({ days }) {
  const [data, setData] = useState(null);
  useEffect(() => { adminApi.getCampaignReport(days).then(setData).catch(() => {}); }, [days]);
  if (!data) return <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin"></i></div>;
  return (
    <DataTable columns={[
      { key: 'campaign_name', label: 'Campaign', bold: true, render: (v, r) => v || r.meta_campaign_id || 'N/A' },
      { key: 'source', label: 'Source' },
      { key: 'leads', label: 'Leads' },
      { key: 'cases', label: 'Cases', render: v => <span style={{ color: '#00897b', fontWeight: 600 }}>{v}</span> },
      { key: 'lost', label: 'Lost', render: v => <span style={{ color: '#dc2626' }}>{v}</span> },
      { key: 'avg_intent', label: 'Avg Intent', render: v => v ? `${v}` : '—' },
      { key: 'leads', label: 'Conv%', render: (v, r) => v > 0 ? Math.round(r.cases * 100 / v) + '%' : '0%' },
    ]} rows={data.campaigns} />
  );
}

function ScheduledReportsTab() {
  const [subs, setSubs] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ report_type: 'leads', schedule: 'WEEKLY' });

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.getReportSubscriptions(), adminApi.getReportRuns()]).then(([s, r]) => {
      setSubs(s || []); setRuns(r || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const addSub = async () => {
    await adminApi.createReportSubscription(form);
    setShowAdd(false); load();
  };

  const deleteSub = async (id) => {
    if (!window.confirm('Delete subscription?')) return;
    await adminApi.deleteReportSubscription(id); load();
  };

  const runNow = async (type) => {
    await adminApi.runReport(type, {}); load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Subscriptions */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>Scheduled Report Subscriptions</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => runNow('leads')} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>Run All Now</button>
            <button onClick={() => setShowAdd(true)} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>+ Add Schedule</button>
          </div>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['Report Type', 'Schedule', 'Recipient', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.report_type}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{s.schedule}</span></td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{s.user_id || 'All Admins'}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>Active</span></td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => deleteSub(s.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Remove</button>
                  </td>
                </tr>
              ))}
              {!subs.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>No scheduled reports</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Runs */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>Recent Report Runs</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['ID', 'Type', 'Status', 'Created By', 'Started', 'Completed'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {runs.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{r.id}</td>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>{r.report_type}</td>
                <td style={{ padding: '8px 12px' }}><span style={{ background: r.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7', color: r.status === 'COMPLETED' ? '#166534' : '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{r.status}</span></td>
                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{r.created_by}</td>
                <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 11 }}>{r.started_at?.slice(0,16)}</td>
                <td style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 11 }}>{r.completed_at?.slice(0,16) || '—'}</td>
              </tr>
            ))}
            {!runs.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>No runs yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a1d4d' }}>Schedule Report</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select value={form.report_type} onChange={e => setForm(f => ({...f, report_type: e.target.value}))} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
                {['leads', 'cases', 'banks', 'staff', 'campaigns'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Report</option>)}
              </select>
              <select value={form.schedule} onChange={e => setForm(f => ({...f, schedule: e.target.value}))} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
                {['DAILY', 'WEEKLY', 'MONTHLY'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={addSub} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SUB_TABS_EXTRA = [
  { key: 'leads', label: 'Leads', icon: 'fa-funnel-dollar' },
  { key: 'cases', label: 'Cases', icon: 'fa-briefcase' },
  { key: 'banks', label: 'Banks', icon: 'fa-university' },
  { key: 'staff', label: 'Staff', icon: 'fa-users' },
  { key: 'campaigns', label: 'Campaign ROI', icon: 'fa-bullhorn' },
  { key: 'scheduled', label: 'Scheduled', icon: 'fa-calendar-check' },
];
const REPORT_COMPONENTS = { leads: LeadsReport, cases: CasesReport, banks: BanksReport, staff: StaffReport, campaigns: CampaignsReport, scheduled: ScheduledReportsTab };

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState('leads');
  const [days, setDays] = useState(30);
  const ActiveComp = REPORT_COMPONENTS[activeTab];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1d4d' }}>Reports & Analytics</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Comprehensive reporting across all modules</div>
        </div>
        {activeTab !== 'banks' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid', fontSize: 12, cursor: 'pointer', fontWeight: days === d ? 700 : 400, background: days === d ? '#1a1d4d' : '#fff', color: days === d ? '#fff' : '#374151', borderColor: days === d ? '#1a1d4d' : '#d1d5db' }}>
                {d}d
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
        {SUB_TABS_EXTRA.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            color: activeTab === t.key ? '#1a1d4d' : '#6b7280',
            borderBottom: `2px solid ${activeTab === t.key ? '#1a1d4d' : 'transparent'}`,
            marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className={`fas ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      <ActiveComp days={days} />
    </div>
  );
}
