import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatDate, formatCurrency } from '../../constants';
import StatusBadge from '../../components/Common/StatusBadge';
import SLATag from '../../components/Common/SLATag';

export default function BankDisbursementsPage({ onOpenApp }) {
  const [apps, setApps] = useState(null);

  function load() {
    api.getApplications({ stage: 6, limit: 50 })
      .then(r => setApps(r.data)).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Disbursements</h2>
          <div className="subtitle">Post-sanction agreement & disbursement tracking</div>
        </div>
        <button className="btn btn-outline" onClick={load}><i className="fas fa-sync-alt"></i> Refresh</button>
      </div>
      <div className="table-container">
        <div className="table-header">
          <h3>Post Sanction Cases</h3>
          <span className="results-count">{apps ? `${apps.length} cases` : '...'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Student</th>
              <th>University</th>
              <th>Status</th>
              <th>Sanction Amt</th>
              <th>Agreement Date</th>
              <th>Disb. Request</th>
              <th>Disbursed Amt</th>
              <th>Disbursed Date</th>
              <th>Mode</th>
              <th>SLA</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {!apps ? (
              <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#999' }}>Loading...</td></tr>
            ) : apps.length === 0 ? (
              <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <i className="fas fa-inbox" style={{ fontSize: 24, display: 'block', marginBottom: 8 }}></i>
                No post-sanction applications
              </td></tr>
            ) : apps.map(app => (
              <tr key={app.id}>
                <td><span className="app-id" onClick={() => onOpenApp(app.id)}>{app.id}</span></td>
                <td>
                  <div className="student-name">{app.student_name}</div>
                  <div className="student-sub">{app.student_email}</div>
                </td>
                <td style={{ fontSize: 13 }}>{app.university}</td>
                <td><StatusBadge status={app.status} /></td>
                <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-green)' }}>{app.sanction_amount ? formatCurrency(app.sanction_amount) : '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.agreement_date ? formatDate(app.agreement_date) : '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.disbursement_request_date ? formatDate(app.disbursement_request_date) : '—'}</td>
                <td style={{ fontWeight: 600, color: 'var(--sbi-accent)' }}>{app.disbursed_amount ? formatCurrency(app.disbursed_amount) : '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.disbursed_date ? formatDate(app.disbursed_date) : '—'}</td>
                <td style={{ fontSize: 12 }}>{app.disbursement_mode || '—'}</td>
                <td><SLATag days={app.sla_days} awaiting={app.awaiting_from} status={app.status} /></td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => onOpenApp(app.id)}>
                    Open <i className="fas fa-arrow-right" style={{ marginLeft: 4 }}></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
