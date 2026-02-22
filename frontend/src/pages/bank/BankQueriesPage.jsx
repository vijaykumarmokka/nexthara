import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatDate } from '../../constants';
import StatusBadge from '../../components/Common/StatusBadge';
import SLATag from '../../components/Common/SLATag';

export default function BankQueriesPage({ onOpenApp }) {
  const [apps, setApps] = useState(null);

  function load() {
    api.getApplications({ status: 'QUERY_RAISED', limit: 50 })
      .then(r => setApps(r.data)).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Queries</h2>
          <div className="subtitle">Cases with open queries awaiting student response</div>
        </div>
        <button className="btn btn-outline" onClick={load}><i className="fas fa-sync-alt"></i> Refresh</button>
      </div>
      <div className="table-container">
        <div className="table-header">
          <h3>Open Queries</h3>
          <span className="results-count">{apps ? `${apps.length} cases` : '...'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Student</th>
              <th>University</th>
              <th>Sub Status / Docs Requested</th>
              <th>SLA</th>
              <th>Date Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {!apps ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#999' }}>Loading...</td></tr>
            ) : apps.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <i className="fas fa-check-circle" style={{ fontSize: 24, display: 'block', marginBottom: 8, color: 'var(--status-green)' }}></i>
                No open queries
              </td></tr>
            ) : apps.map(app => (
              <tr key={app.id}>
                <td><span className="app-id" onClick={() => onOpenApp(app.id)}>{app.id}</span></td>
                <td>
                  <div className="student-name">{app.student_name}</div>
                  <div className="student-sub">{app.student_email}</div>
                  {app.student_phone && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      <i className="fas fa-phone" style={{ marginRight: 3, fontSize: 10 }}></i>{app.student_phone}
                    </div>
                  )}
                </td>
                <td style={{ fontSize: 13 }}>{app.university}</td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200 }}>{app.sub_status || '—'}</td>
                <td><SLATag days={app.sla_days} awaiting={app.awaiting_from} status={app.status} /></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(app.updated_at)}</td>
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
