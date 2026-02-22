import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatDate, formatCurrency } from '../../constants';
import StatusBadge from '../../components/Common/StatusBadge';
import AwaitingPill from '../../components/Common/AwaitingPill';
import SLATag from '../../components/Common/SLATag';
import toast from 'react-hot-toast';

const DATE_FILTERS = [
  { key: '7',  label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '0',  label: 'All Time' },
];

export default function BankDashboard({ onOpenApp }) {
  const [stats, setStats]       = useState(null);
  const [counts, setCounts]     = useState(null);
  const [workQueue, setWorkQueue] = useState(null);
  const [dateFilter, setDateFilter] = useState('30');

  function load() {
    api.getStats().then(setStats).catch(() => {});
    api.getSidebarCounts().then(setCounts).catch(() => {});
    loadWorkQueue('30');
  }

  function loadWorkQueue(days) {
    const params = { awaiting: 'Bank', limit: 10, sort_by: 'sla_days', sort_dir: 'desc' };
    if (days !== '0') params.days_ago = days;
    api.getApplications(params).then(r => setWorkQueue(r.data)).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  function handleDateFilter(key) {
    setDateFilter(key);
    loadWorkQueue(key);
  }

  const kpis = (stats && counts) ? [
    { label: 'Total Assigned',       value: stats.total,           cls: 'blue',   icon: 'fa-folder-open',          footer: 'All cases assigned to you' },
    { label: 'Awaiting Bank Action', value: stats.awaitingBank,    cls: 'amber',  icon: 'fa-clock',                footer: 'Requires your response' },
    { label: 'Awaiting Student',     value: stats.awaitingStudent, cls: 'green',  icon: 'fa-user-graduate',        footer: 'Student to provide docs' },
    { label: 'Sanctioned',           value: stats.sanctioned,      cls: 'green',  icon: 'fa-check-circle',         footer: `${stats.total ? ((stats.sanctioned/stats.total)*100).toFixed(1) : 0}% conversion` },
    { label: 'Rejected',             value: stats.rejected,        cls: 'red',    icon: 'fa-times-circle',         footer: `${stats.total ? ((stats.rejected/stats.total)*100).toFixed(1) : 0}% rejection rate` },
    { label: 'SLA Risk',             value: counts.slaWarning,     cls: 'amber',  icon: 'fa-exclamation-triangle', footer: '≥70% of SLA limit reached' },
    { label: 'SLA Breach',           value: counts.slaBreach,      cls: 'purple', icon: 'fa-fire',                 footer: 'Exceeded SLA — escalate now' },
  ] : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Bank Dashboard</h2>
          <div className="subtitle">Your assigned applications at a glance</div>
        </div>
        <button className="btn btn-outline" onClick={load}><i className="fas fa-sync-alt"></i> Refresh</button>
      </div>

      {/* KPI Cards */}
      <div className="bank-kpi-grid">
        {kpis ? kpis.map(card => (
          <div key={card.label} className={`kpi-card ${card.cls}`}>
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-value">{card.value ?? '—'}</div>
            <div className="kpi-footer neutral">
              <i className={`fas ${card.icon}`}></i> {card.footer}
            </div>
          </div>
        )) : Array(7).fill(0).map((_, i) => (
          <div key={i} className="kpi-card blue" style={{ opacity: 0.4 }}>Loading...</div>
        ))}
      </div>

      {/* Work Queue */}
      <div className="card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
        <div className="table-header" style={{ padding: '16px 20px' }}>
          <h3><i className="fas fa-tasks" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i> Work Queue — Pending Bank Action</h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {DATE_FILTERS.map(f => (
              <button
                key={f.key}
                className={`bank-chip${dateFilter === f.key ? ' active' : ''}`}
                style={{ padding: '3px 10px', fontSize: 12 }}
                onClick={() => handleDateFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {!workQueue ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>
        ) : (
          <table className="app-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Student</th>
                <th>Status</th>
                <th>Awaiting</th>
                <th>SLA</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {workQueue.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#999' }}>
                  <i className="fas fa-check-circle" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--status-green)' }}></i>
                  All caught up — no pending bank actions!
                </td></tr>
              ) : workQueue.map(app => (
                <tr key={app.id}>
                  <td><span className="app-id" onClick={() => onOpenApp(app.id)}>{app.id}</span></td>
                  <td>
                    <div className="student-name">{app.student_name}</div>
                    <div className="student-sub">{app.course}</div>
                    {app.student_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        <i className="fas fa-phone" style={{ fontSize: 10 }}></i>
                        {app.student_phone}
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', fontSize: 10 }}
                          onClick={() => { navigator.clipboard.writeText(app.student_phone); toast.success('Phone copied'); }}>
                          <i className="fas fa-copy"></i>
                        </button>
                      </div>
                    )}
                  </td>
                  <td><StatusBadge status={app.status} /></td>
                  <td><AwaitingPill awaiting={app.awaiting_from} /></td>
                  <td><SLATag days={app.sla_days} awaiting={app.awaiting_from} status={app.status} /></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(app.updated_at)}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => onOpenApp(app.id)}>
                      Open <i className="fas fa-arrow-right" style={{ marginLeft: 4 }}></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
