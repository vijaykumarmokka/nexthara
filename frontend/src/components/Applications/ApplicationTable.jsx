import StatusBadge from '../Common/StatusBadge';
import AwaitingPill from '../Common/AwaitingPill';
import SLATag from '../Common/SLATag';
import PriorityDot from '../Common/PriorityDot';
import BankLogo from '../Common/BankLogo';
import { formatDate } from '../../constants';

// Status-specific SLA breach thresholds (mirrors backend SLA_BREACH_EXPR)
const SLA_BREACH_DAYS = {
  NOT_CONNECTED: 2, CONTACTED: 2, YET_TO_CONNECT: 2,
  LOGIN_SUBMITTED: 3, LOGIN_IN_PROGRESS: 3, LOGIN_REJECTED: 3, DUPLICATE_LOGIN: 3,
  DOCS_PENDING: 4, DOCS_SUBMITTED: 4, DOCS_VERIFICATION: 4,
  UNDER_REVIEW: 7, CREDIT_CHECK_IN_PROGRESS: 7, FIELD_VERIFICATION: 7,
  QUERY_RAISED: 5,
  SANCTIONED: 2, CONDITIONAL_SANCTION: 2, REJECTED: 2,
  SANCTION_ACCEPTED: 5, AGREEMENT_SIGNED: 5,
  DISBURSEMENT_PENDING: 7, DISBURSED: 7,
};

function isSlaBreached(app) {
  if (app.awaiting_from === 'Closed') return false;
  const threshold = SLA_BREACH_DAYS[app.status];
  return threshold !== undefined && app.sla_days > threshold;
}

function getRowClass(app) {
  if (!isSlaBreached(app)) return '';
  return app.awaiting_from === 'Bank' ? 'escalate' : 'sla-risk';
}

function RowTag({ app }) {
  if (!isSlaBreached(app)) return null;
  return app.awaiting_from === 'Bank'
    ? <span className="escalate-tag">Escalate</span>
    : <span className="sla-risk-tag">SLA Risk</span>;
}

export default function ApplicationTable({ applications, total, page, pages, onPageChange, onSelectApp }) {
  if (!applications) return <div className="table-container" style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>;

  return (
    <div className="table-container">
      <div className="table-header">
        <h3>Bank Applications</h3>
        <span className="results-count">Showing {applications.length} of {total} applications</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Student</th>
            <th>Bank / Lender</th>
            <th>Main Status</th>
            <th>Sub Status</th>
            <th>Awaiting</th>
            <th>SLA</th>
            <th>Priority</th>
            <th>Owner</th>
            <th>Updated</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {applications.length === 0 ? (
            <tr>
              <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <i className="fas fa-inbox" style={{ fontSize: 24, display: 'block', marginBottom: 10 }}></i>
                No applications found
              </td>
            </tr>
          ) : applications.map(app => (
            <tr key={app.id} className={getRowClass(app)}>
              <td><span className="app-id" onClick={() => onSelectApp(app.id)}>{app.id}</span></td>
              <td>
                <div className="student-name">{app.student_name}</div>
                <div className="student-sub">{app.course}</div>
              </td>
              <td><BankLogo bank={app.bank} /></td>
              <td>
                <StatusBadge status={app.status} />
                <RowTag app={app} />
              </td>
              <td style={{ fontSize: 12, color: '#666', maxWidth: 140 }}>{app.sub_status}</td>
              <td><AwaitingPill awaiting={app.awaiting_from} /></td>
              <td><SLATag days={app.sla_days} awaiting={app.awaiting_from} /></td>
              <td><PriorityDot priority={app.priority} /></td>
              <td style={{ fontSize: 12, color: '#6b7280' }}>{app.assigned_to || <span style={{ color: '#d1d5db' }}>—</span>}</td>
              <td style={{ fontSize: 12 }}>{formatDate(app.updated_at)}</td>
              <td>
                <button className="btn btn-sm btn-outline" onClick={() => onSelectApp(app.id)} title="View Details">
                  <i className="fas fa-eye"></i>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="pagination">
          <div className="info">Page {page} of {pages} ({total} total)</div>
          <div className="pagination-btns">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}><i className="fas fa-chevron-left"></i></button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
              const p = i + 1;
              return <button key={p} className={page === p ? 'active' : ''} onClick={() => onPageChange(p)}>{p}</button>;
            })}
            <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}><i className="fas fa-chevron-right"></i></button>
          </div>
        </div>
      )}
    </div>
  );
}
