import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatDate, formatCurrency } from '../../constants';
import StatusBadge from '../../components/Common/StatusBadge';
import SLATag from '../../components/Common/SLATag';
import toast from 'react-hot-toast';

function generateSanctionLetterHTML(app) {
  const fmt = v => v || '—';
  const curr = v => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
  return `<!DOCTYPE html>
<html><head><title>Sanction Letter — ${app.id}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; font-size: 14px; color: #212121; }
  .letterhead { text-align: center; border-bottom: 3px double #1a237e; padding-bottom: 20px; margin-bottom: 30px; }
  .bank-name { font-size: 22px; font-weight: 900; color: #1a237e; }
  .bank-sub { color: #666; font-size: 12px; margin-top: 4px; }
  .date-line { text-align: right; margin-bottom: 20px; color: #555; font-size: 13px; }
  .subject { font-weight: bold; margin: 24px 0 16px; text-decoration: underline; font-size: 15px; }
  .body-text { line-height: 1.8; margin: 12px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  td { padding: 10px 14px; border: 1px solid #e0e0e0; font-size: 13px; }
  td:first-child { background: #f5f7ff; font-weight: 600; width: 42%; color: #1a237e; }
  .sig { margin-top: 60px; }
  .footer { margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 10px; font-size: 11px; color: #aaa; text-align: center; }
  @media print { body { margin: 0; } }
</style></head>
<body>
<div class="letterhead">
  <div class="bank-name">${fmt(app.bank)}</div>
  <div class="bank-sub">Education Loan Division — Nexthara Managed Portfolio</div>
</div>
<div class="date-line">Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
<div>To,<br><strong>${fmt(app.student_name)}</strong><br>${fmt(app.student_email)}</div>
<div class="subject">Subject: Sanction of Education Loan — Ref: ${app.bank_application_ref || app.id}</div>
<div class="body-text">Dear ${fmt(app.student_name)},</div>
<div class="body-text">We are pleased to inform you that your Education Loan application has been <strong>sanctioned</strong>. Please find the details below:</div>
<table>
  <tr><td>Applicant Name</td><td>${fmt(app.student_name)}</td></tr>
  <tr><td>University / Institution</td><td>${fmt(app.university)}</td></tr>
  <tr><td>Course</td><td>${fmt(app.course)}</td></tr>
  <tr><td>Country</td><td>${fmt(app.country)}</td></tr>
  <tr><td>Intake</td><td>${fmt(app.intake)}</td></tr>
  <tr><td>Loan Amount Sanctioned</td><td><strong>${curr(app.sanction_amount)}</strong></td></tr>
  <tr><td>Rate of Interest (p.a.)</td><td>${app.roi ? app.roi + '%' : '—'}</td></tr>
  <tr><td>Tenure</td><td>${app.tenure ? app.tenure + ' months' : '—'}</td></tr>
  <tr><td>Processing Fee</td><td>${app.processing_fee ? app.processing_fee + '%' : '—'}</td></tr>
  <tr><td>Margin Money</td><td>${app.margin_percent ? app.margin_percent + '%' : '—'}</td></tr>
  <tr><td>Collateral</td><td>${fmt(app.collateral)}</td></tr>
  <tr><td>Bank Application Reference</td><td>${fmt(app.bank_application_ref)}</td></tr>
  <tr><td>Sanction Status</td><td><strong>${(app.status || '').replace(/_/g, ' ')}</strong></td></tr>
</table>
<div class="body-text">This sanction is subject to the following conditions:
  <ol>
    <li>Submission of all required original documents within 15 days</li>
    <li>Execution of Loan Agreement within 30 days of this letter</li>
    <li>Verification and mortgage of collateral security (if applicable)</li>
    <li>Compliance with all applicable terms and conditions of the bank</li>
  </ol>
</div>
<div class="body-text">Please visit your nearest branch or contact your loan officer to complete the documentation process. For queries, contact Nexthara at support@nexthara.in.</div>
<div class="sig">
  <p>Yours Faithfully,</p><br><br>
  <p>________________________________</p>
  <p><strong>Authorised Signatory</strong></p>
  <p>${fmt(app.bank)} — Education Loan Division</p>
</div>
<div class="footer">This is a computer-generated document. Processed via Nexthara Dashboard. Case ID: ${app.id}. Confidential.</div>
</body></html>`;
}

function handleDownloadSanctionLetter(app) {
  if (!app.sanction_amount) {
    toast.error('No sanction amount on record for this case');
    return;
  }
  const html = generateSanctionLetterHTML(app);
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { toast.error('Please allow popups to generate sanction letter'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

const SANCTION_STATUSES = ['SANCTIONED', 'CONDITIONAL_SANCTION', 'SANCTION_ACCEPTED'];

function studentAcceptedLabel(status) {
  if (status === 'SANCTION_ACCEPTED' || status === 'AGREEMENT_SIGNED') return { text: 'Yes', cls: 'green' };
  if (status === 'SANCTIONED' || status === 'CONDITIONAL_SANCTION') return { text: 'Pending', cls: 'amber' };
  return { text: 'No', cls: 'red' };
}

function nextStep(status) {
  if (status === 'SANCTIONED') return 'Awaiting student acceptance of sanction letter';
  if (status === 'CONDITIONAL_SANCTION') return 'Student to fulfil conditions and accept';
  if (status === 'SANCTION_ACCEPTED') return 'Proceed to agreement signing';
  return '—';
}

export default function BankSanctionsPage({ onOpenApp }) {
  const [apps, setApps] = useState(null);

  function load() {
    api.getApplications({ stage: 5, limit: 50 })
      .then(r => {
        const filtered = r.data.filter(a => SANCTION_STATUSES.includes(a.status));
        setApps(filtered);
      }).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Sanctions</h2>
          <div className="subtitle">Sanctioned cases and next steps</div>
        </div>
        <button className="btn btn-outline" onClick={load}><i className="fas fa-sync-alt"></i> Refresh</button>
      </div>
      <div className="table-container">
        <div className="table-header">
          <h3>Sanctioned Applications</h3>
          <span className="results-count">{apps ? `${apps.length} cases` : '...'}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Student</th>
              <th>University</th>
              <th>Status</th>
              <th>Sanction Amount</th>
              <th>ROI / Tenure</th>
              <th>Sanctioned Date</th>
              <th>Student Accepted?</th>
              <th>Next Step</th>
              <th>SLA</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {!apps ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#999' }}>Loading...</td></tr>
            ) : apps.length === 0 ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <i className="fas fa-inbox" style={{ fontSize: 24, display: 'block', marginBottom: 8 }}></i>
                No sanctioned applications yet
              </td></tr>
            ) : apps.map(app => {
              const accepted = studentAcceptedLabel(app.status);
              return (
                <tr key={app.id}>
                  <td><span className="app-id" onClick={() => onOpenApp(app.id)}>{app.id}</span></td>
                  <td>
                    <div className="student-name">{app.student_name}</div>
                    <div className="student-sub">{app.student_email}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{app.university}</td>
                  <td><StatusBadge status={app.status} /></td>
                  <td style={{ fontWeight: 600, color: 'var(--status-green)' }}>{app.sanction_amount ? formatCurrency(app.sanction_amount) : '—'}</td>
                  <td style={{ fontSize: 12 }}>{app.roi ? `${app.roi}%` : '—'} {app.tenure ? `/ ${app.tenure}m` : ''}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(app.updated_at)}</td>
                  <td>
                    <span className={`badge badge-${accepted.cls}`}>{accepted.text}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 180 }}>{nextStep(app.status)}</td>
                  <td><SLATag days={app.sla_days} awaiting={app.awaiting_from} status={app.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => handleDownloadSanctionLetter(app)} title="Download sanction letter">
                        <i className="fas fa-file-download"></i>
                      </button>
                      <button className="btn btn-sm btn-primary" onClick={() => onOpenApp(app.id)}>
                        Open <i className="fas fa-arrow-right" style={{ marginLeft: 4 }}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
