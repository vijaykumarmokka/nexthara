import { useEffect, useState, useCallback } from 'react';
import { api, documentsApi, coApplicantsApi } from '../../api';
import { STATUS_CONFIG, SUB_STATUS_MAP, formatCurrency, formatDate, formatDateTime } from '../../constants';
import StatusBadge from '../../components/Common/StatusBadge';
import AwaitingPill from '../../components/Common/AwaitingPill';
import SLATag from '../../components/Common/SLATag';
import FollowUpPanel from '../../components/Communication/FollowUpPanel';
import toast from 'react-hot-toast';

const QUERY_TYPES = [
  'Missing Documents', 'Clarification Required', 'Additional Information Needed',
  'Income Verification', 'Collateral Query', 'Co-applicant Details',
];
const DOCS_LIST = [
  'ITR (2 years)', 'Bank Statement (6 months)', 'Salary Slips (3 months)',
  'Passport Copy', 'Offer Letter / Admission Letter', 'CIBIL Report',
  'Collateral Documents', 'Co-applicant KYC', 'Property Valuation Report', 'Employment Proof',
];
const PROOF_TYPES = [
  'Sanction Letter', 'Rejection Note / Screenshot',
  'Agreement Signed Proof', 'Disbursement Proof',
];
const CLOSE_REQUIRED_STATUSES = ['CLOSED', 'DROPPED', 'EXPIRED', 'REJECTED', 'LOGIN_REJECTED'];
const CRITICAL_STATUSES = ['SANCTIONED', 'REJECTED', 'DISBURSED', 'AGREEMENT_SIGNED'];
const DOC_TABS = ['Admission Docs', 'Student KYC', 'Co-applicant Docs', 'Financial Docs', 'Other'];
const TIMELINE_FILTERS = ['All', 'Status', 'Query', 'Docs', 'Proof'];

export default function BankApplicationDetail({ appId, onClose, onUpdated }) {
  const [app, setApp]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [activePanel, setActivePanel] = useState(null);

  // Update status form
  const [form, setForm]   = useState({});
  const [saving, setSaving] = useState(false);

  // Raise query form
  const [queryType, setQueryType]       = useState(QUERY_TYPES[0]);
  const [queryDocs, setQueryDocs]       = useState([]);
  const [queryRemarks, setQueryRemarks] = useState('');
  const [queryDue, setQueryDue]         = useState('');
  const [sendingQuery, setSendingQuery] = useState(false);

  // Upload proof form
  const [proofType, setProofType]         = useState(PROOF_TYPES[0]);
  const [proofRemarks, setProofRemarks]   = useState('');
  const [proofFile, setProofFile]         = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Documents tab
  const [docTab, setDocTab]   = useState('Admission Docs');
  const [docs, setDocs]       = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [invalidDocId, setInvalidDocId] = useState(null);
  const [invalidReason, setInvalidReason] = useState('');

  // Co-applicants
  const [coApps, setCoApps]   = useState(null);
  const [showCoForm, setShowCoForm] = useState(false);
  const [coForm, setCoForm]   = useState({ name: '', relation: '', phone: '', email: '', income: '', employment_type: '' });
  const [savingCo, setSavingCo] = useState(false);

  // Timeline filters
  const [timelineFilter, setTimelineFilter] = useState('All');

  const loadApp = useCallback(() => {
    setLoading(true);
    api.getApplication(appId).then(data => {
      setApp(data);
      setForm({
        status: data.status,
        sub_status: data.sub_status,
        awaiting_from: data.awaiting_from,
        priority: data.priority,
        student_phone: data.student_phone || '',
        country: data.country || '',
        intake: data.intake || '',
        loan_amount_requested: data.loan_amount_requested || '',
        collateral: data.collateral || 'NA',
        loan_type: data.loan_type || 'NA',
        bank_application_ref: data.bank_application_ref || '',
        sanction_amount: data.sanction_amount || '',
        roi: data.roi || '',
        tenure: data.tenure || '',
        processing_fee: data.processing_fee || '',
        margin_percent: data.margin_percent || '',
        sanction_accepted_date: data.sanction_accepted_date || '',
        agreement_date: data.agreement_date || '',
        disbursement_request_date: data.disbursement_request_date || '',
        disbursed_amount: data.disbursed_amount || '',
        disbursement_mode: data.disbursement_mode || 'University',
        rejection_reason: data.rejection_reason || '',
        relook_possible: data.relook_possible || 'No',
        close_reason: data.close_reason || '',
        notes: '',
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [appId]);

  const loadDocs = useCallback(() => {
    setDocsLoading(true);
    documentsApi.getDocuments(appId).then(setDocs).catch(() => setDocs([])).finally(() => setDocsLoading(false));
  }, [appId]);

  const loadCoApps = useCallback(() => {
    coApplicantsApi.getCoApplicants(appId).then(setCoApps).catch(() => setCoApps([]));
  }, [appId]);

  useEffect(() => { if (appId) { loadApp(); loadDocs(); loadCoApps(); } }, [appId, loadApp, loadDocs, loadCoApps]);

  const onStatusChange = (status) => {
    const cfg = STATUS_CONFIG[status];
    setForm(f => ({
      ...f, status,
      awaiting_from: cfg?.awaiting !== 'Closed' ? cfg?.awaiting : f.awaiting_from,
      sub_status: SUB_STATUS_MAP[status] ? SUB_STATUS_MAP[status][0] : '-',
    }));
  };

  async function handleSaveStatus() {
    if (CLOSE_REQUIRED_STATUSES.includes(form.status) && !form.close_reason && !app.close_reason) {
      toast.error('Please enter a close/rejection reason');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.sanction_amount) payload.sanction_amount = Number(payload.sanction_amount);
      if (payload.roi) payload.roi = Number(payload.roi);
      if (payload.tenure) payload.tenure = Number(payload.tenure);
      if (payload.processing_fee) payload.processing_fee = Number(payload.processing_fee);
      if (payload.margin_percent) payload.margin_percent = Number(payload.margin_percent);
      if (payload.disbursed_amount) payload.disbursed_amount = Number(payload.disbursed_amount);
      if (payload.loan_amount_requested) payload.loan_amount_requested = Number(payload.loan_amount_requested);
      await api.updateApplication(appId, payload);
      toast.success(`Case ${appId} updated`);
      setActivePanel(null);
      loadApp();
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
    setSaving(false);
  }

  async function handleSendQuery() {
    if (!queryRemarks.trim()) { toast.error('Please add remarks'); return; }
    setSendingQuery(true);
    const queryNote = `[QUERY] Type: ${queryType}${queryDocs.length ? ' | Docs: ' + queryDocs.join(', ') : ''}${queryDue ? ' | Due: ' + queryDue : ''} | Remarks: ${queryRemarks}`;
    try {
      await api.updateApplication(appId, { status: 'QUERY_RAISED', awaiting_from: 'Student', notes: queryNote });
      toast.success('Query raised — status set to Query Raised');
      setActivePanel(null);
      setQueryRemarks(''); setQueryDocs([]); setQueryDue('');
      loadApp();
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to raise query');
    }
    setSendingQuery(false);
  }

  async function handleUploadProof() {
    setUploadingProof(true);
    try {
      if (proofFile) {
        await documentsApi.uploadFile(appId, proofFile, {
          doc_name: proofType,
          doc_category: 'Other',
          owner: 'Staff',
          label: proofRemarks || '',
        });
      }
      await api.updateApplication(appId, {
        notes: `[PROOF] ${proofType}${proofRemarks ? ' — ' + proofRemarks : ''}${proofFile ? ' (file uploaded)' : ''}`,
        last_update_source: 'Portal',
      });
      toast.success(proofFile ? 'Proof uploaded and recorded' : 'Proof recorded successfully');
      setActivePanel(null);
      setProofRemarks('');
      setProofFile(null);
      loadApp();
      loadDocs();
    } catch (err) {
      toast.error(err.message || 'Failed to upload proof');
    }
    setUploadingProof(false);
  }

  async function handleDownloadAllDocs() {
    if (!docs || docs.length === 0) { toast.error('No documents for this case'); return; }
    const withFiles = docs.filter(d => d.file_path);
    if (withFiles.length === 0) { toast.error('No uploaded files — documents have no attached files'); return; }
    const token = localStorage.getItem('nexthara_token');
    const tid = toast.loading(`Downloading ${withFiles.length} file${withFiles.length !== 1 ? 's' : ''}…`);
    let count = 0;
    for (const doc of withFiles) {
      try {
        const url = documentsApi.fileUrl(appId, doc.id, true);
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const blob = await r.blob();
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = doc.doc_name || 'document';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          count++;
          await new Promise(res => setTimeout(res, 400));
        }
      } catch {}
    }
    toast.success(`Downloaded ${count} file${count !== 1 ? 's' : ''}`, { id: tid });
  }

  async function handleViewDoc(doc) {
    if (!doc.file_path) { toast.error('No file attached to this document'); return; }
    const token = localStorage.getItem('nexthara_token');
    const url = documentsApi.fileUrl(appId, doc.id, false);
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('File not found');
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      toast.error('Could not open file');
    }
  }

  async function handleDocStatus(docId, status, remarks) {
    try {
      await documentsApi.updateDocument(appId, docId, { status, remarks });
      toast.success(`Document marked as ${status}`);
      loadDocs();
    } catch {
      toast.error('Update failed');
    }
  }

  async function handleMarkInvalid() {
    if (!invalidReason.trim()) { toast.error('Please enter a reason'); return; }
    await handleDocStatus(invalidDocId, 'Invalid', invalidReason);
    setInvalidDocId(null);
    setInvalidReason('');
  }

  async function handleSaveCoApplicant() {
    if (!coForm.name.trim()) { toast.error('Name is required'); return; }
    setSavingCo(true);
    try {
      await coApplicantsApi.addCoApplicant(appId, { ...coForm, income: coForm.income ? Number(coForm.income) : null });
      toast.success('Co-applicant added');
      setShowCoForm(false);
      setCoForm({ name: '', relation: '', phone: '', email: '', income: '', employment_type: '' });
      loadCoApps();
    } catch {
      toast.error('Failed to add co-applicant');
    }
    setSavingCo(false);
  }

  async function handleDeleteCoApplicant(coId) {
    try {
      await coApplicantsApi.deleteCoApplicant(appId, coId);
      toast.success('Co-applicant removed');
      loadCoApps();
    } catch {
      toast.error('Failed to remove co-applicant');
    }
  }

  function toggleQueryDoc(doc) {
    setQueryDocs(d => d.includes(doc) ? d.filter(x => x !== doc) : [...d, doc]);
  }

  const isCritical = CRITICAL_STATUSES.includes(form.status);
  const isSanction = ['SANCTIONED', 'CONDITIONAL_SANCTION'].includes(form.status);
  const isRejected = ['LOGIN_REJECTED', 'REJECTED'].includes(form.status);
  const isDisbursed = form.status === 'DISBURSED';
  const isCloseRequired = CLOSE_REQUIRED_STATUSES.includes(form.status);

  const filteredHistory = app?.history?.filter(h => {
    if (timelineFilter === 'All') return true;
    const t = (h.entry_type || 'status').toLowerCase();
    if (timelineFilter === 'Status') return t === 'status';
    if (timelineFilter === 'Query') return t === 'query' || (h.notes || '').includes('[QUERY]');
    if (timelineFilter === 'Docs') return t === 'docs' || (h.notes || '').includes('[DOC]');
    if (timelineFilter === 'Proof') return t === 'proof' || (h.notes || '').includes('[PROOF]');
    return true;
  }) || [];

  const docsInTab = docs ? docs.filter(d => d.doc_category === docTab) : [];

  function docStatusBadge(status) {
    const cls = status === 'Verified' ? 'green' : status === 'Received' ? 'blue' : status === 'Invalid' ? 'red' : 'grey';
    return <span className={`badge badge-${cls}`}>{status}</span>;
  }

  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal bank-modal">
        {/* ─── Sticky Header ─── */}
        <div className="bank-modal-header">
          <div className="bank-modal-header-left">
            <div className="bank-case-id">{appId}</div>
            {app && <>
              <div className="bank-student-name">{app.student_name}</div>
              <span className="bank-header-sep">·</span>
              <span className="bank-header-email" title="Copy email"
                onClick={() => { navigator.clipboard.writeText(app.student_email); toast.success('Email copied'); }}>
                <i className="fas fa-envelope" style={{ marginRight: 4 }}></i>{app.student_email}
                <i className="fas fa-copy" style={{ marginLeft: 6, opacity: 0.5 }}></i>
              </span>
              {app.student_phone && (
                <>
                  <span className="bank-header-sep">·</span>
                  <span className="bank-header-email" title="Copy phone"
                    onClick={() => { navigator.clipboard.writeText(app.student_phone); toast.success('Phone copied'); }}>
                    <i className="fas fa-phone" style={{ marginRight: 4 }}></i>{app.student_phone}
                    <i className="fas fa-copy" style={{ marginLeft: 6, opacity: 0.5 }}></i>
                  </span>
                </>
              )}
            </>}
          </div>
          <div className="bank-modal-header-right">
            <button className="btn btn-sm btn-outline" onClick={handleDownloadAllDocs}>
              <i className="fas fa-file-archive"></i> Download Pack
            </button>
            <button className="btn btn-sm btn-outline" style={{ color: '#e65100', borderColor: '#e65100' }} onClick={() => setActivePanel('raise-query')}>
              <i className="fas fa-question-circle"></i> Raise Query
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => { setActivePanel('update-status'); setActiveTab('status'); }}>
              <i className="fas fa-edit"></i> Update Status
            </button>
            <button className="btn btn-sm btn-outline" onClick={() => setActivePanel('upload-proof')}>
              <i className="fas fa-upload"></i> Upload Proof
            </button>
            <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
          </div>
        </div>

        {/* ─── Status row + tabs ─── */}
        {app && (
          <div className="bank-status-bar">
            <StatusBadge status={app.status} />
            <AwaitingPill awaiting={app.awaiting_from} />
            <SLATag days={app.sla_days} awaiting={app.awaiting_from} status={app.status} />
            {app.bank_application_ref && <span className="bank-ref-tag">Ref: {app.bank_application_ref}</span>}
            <div className="bank-tabs" style={{ marginLeft: 'auto' }}>
              {[['summary','Summary'],['documents','Documents'],['co-applicants','Co-applicants'],['status','Update Status'],['timeline','Timeline'],['followup','Follow-up']].map(([k,l]) => (
                <button key={k} className={`bank-tab ${activeTab === k && !activePanel ? 'active' : ''}`}
                  onClick={() => { setActiveTab(k); setActivePanel(null); }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Body ─── */}
        <div className="modal-body bank-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }}></i>
              <p style={{ marginTop: 12 }}>Loading case...</p>
            </div>
          ) : !app ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Application not found</div>
          ) : (
            <>
              {/* ── RAISE QUERY PANEL ── */}
              {activePanel === 'raise-query' && (
                <div className="bank-panel">
                  <div className="bank-panel-header">
                    <h4><i className="fas fa-question-circle" style={{ marginRight: 8, color: '#e65100' }}></i> Raise Query / Request Documents</h4>
                    <button className="btn btn-sm btn-outline" onClick={() => setActivePanel(null)}><i className="fas fa-arrow-left"></i> Back</button>
                  </div>
                  <div className="bank-panel-note">After sending, status will auto-update to <strong>Query Raised</strong> and awaiting will be set to <strong>Student</strong>.</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Query Type</label>
                      <select className="form-control" value={queryType} onChange={e => setQueryType(e.target.value)}>
                        {QUERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Due Date (optional)</label>
                      <input type="date" className="form-control" value={queryDue} onChange={e => setQueryDue(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Documents Required (multi-select)</label>
                    <div className="bank-doc-checklist">
                      {DOCS_LIST.map(doc => (
                        <label key={doc} className="bank-doc-check-item">
                          <input type="checkbox" checked={queryDocs.includes(doc)} onChange={() => toggleQueryDoc(doc)} />
                          <span>{doc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Remarks <span style={{ color: 'red' }}>*</span></label>
                    <textarea className="form-control" rows={3} placeholder="Describe what's needed and why..." value={queryRemarks} onChange={e => setQueryRemarks(e.target.value)} />
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-outline" onClick={() => setActivePanel(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSendQuery} disabled={sendingQuery}>
                      <i className={`fas ${sendingQuery ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                      {sendingQuery ? 'Sending...' : 'Send Query'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── UPLOAD PROOF PANEL ── */}
              {activePanel === 'upload-proof' && (
                <div className="bank-panel">
                  <div className="bank-panel-header">
                    <h4><i className="fas fa-upload" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i> Upload Proof</h4>
                    <button className="btn btn-sm btn-outline" onClick={() => setActivePanel(null)}><i className="fas fa-arrow-left"></i> Back</button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Proof Type</label>
                    <select className="form-control" value={proofType} onChange={e => setProofType(e.target.value)}>
                      {PROOF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">File Upload</label>
                    <div className="bank-file-upload" style={proofFile ? { borderColor: '#2e7d32', background: '#f0fdf4' } : {}}>
                      <i className={`fas ${proofFile ? 'fa-check-circle' : 'fa-cloud-upload-alt'}`} style={proofFile ? { color: '#2e7d32' } : {}}></i>
                      <span>{proofFile ? proofFile.name : 'Click to upload or drag & drop'}</span>
                      <small>PDF, JPG, PNG — max 10MB</small>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setProofFile(f); } }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Remarks</label>
                    <textarea className="form-control" rows={2} placeholder="Any additional remarks..." value={proofRemarks} onChange={e => setProofRemarks(e.target.value)} />
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-outline" onClick={() => setActivePanel(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleUploadProof} disabled={uploadingProof}>
                      <i className={`fas ${uploadingProof ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                      {uploadingProof ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── UPDATE STATUS PANEL ── */}
              {(activePanel === 'update-status' || (activeTab === 'status' && !activePanel)) && activePanel !== 'raise-query' && activePanel !== 'upload-proof' && (
                <div className="bank-panel">
                  <div className="bank-panel-header">
                    <h4><i className="fas fa-edit" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i> Update Status</h4>
                    {activePanel && <button className="btn btn-sm btn-outline" onClick={() => setActivePanel(null)}><i className="fas fa-arrow-left"></i> Back</button>}
                  </div>

                  {isCritical && (
                    <div className="bank-panel-warning">
                      <i className="fas fa-shield-alt"></i>
                      <strong>Guardrail:</strong> Status <strong>{STATUS_CONFIG[form.status]?.label}</strong> requires proof or Nexthara confirmation.
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Main Status</label>
                      <select className="form-control" value={form.status} onChange={e => onStatusChange(e.target.value)}>
                        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                          <option key={k} value={k}>{cfg.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sub Status</label>
                      <select className="form-control" value={form.sub_status} onChange={e => setForm(f => ({ ...f, sub_status: e.target.value }))}>
                        {SUB_STATUS_MAP[form.status]
                          ? SUB_STATUS_MAP[form.status].map(s => <option key={s} value={s}>{s}</option>)
                          : <option value="-">-</option>}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Awaiting From</label>
                      <select className="form-control" value={form.awaiting_from} onChange={e => setForm(f => ({ ...f, awaiting_from: e.target.value }))}>
                        <option>Student</option><option>Bank</option><option>Nexthara</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Priority</label>
                      <select className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                        <option>Normal</option><option>High</option><option>Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank Application Ref</label>
                    <input className="form-control" value={form.bank_application_ref} onChange={e => setForm(f => ({ ...f, bank_application_ref: e.target.value }))} placeholder="e.g. SBI-OCAS-00112" />
                  </div>

                  {isSanction && (
                    <>
                      <div className="form-row">
                        <div className="form-group"><label className="form-label">Sanction Amount (₹)</label><input type="number" className="form-control" value={form.sanction_amount} onChange={e => setForm(f => ({ ...f, sanction_amount: e.target.value }))} placeholder="e.g. 2500000" /></div>
                        <div className="form-group"><label className="form-label">ROI (%)</label><input type="text" className="form-control" value={form.roi} onChange={e => setForm(f => ({ ...f, roi: e.target.value }))} placeholder="e.g. 9.5" /></div>
                        <div className="form-group"><label className="form-label">Tenure (months)</label><input type="number" className="form-control" value={form.tenure} onChange={e => setForm(f => ({ ...f, tenure: e.target.value }))} placeholder="e.g. 36" /></div>
                        <div className="form-group"><label className="form-label">Processing Fee (%)</label><input type="text" className="form-control" value={form.processing_fee} onChange={e => setForm(f => ({ ...f, processing_fee: e.target.value }))} placeholder="e.g. 1.0" /></div>
                        <div className="form-group"><label className="form-label">Margin (%)</label><input type="number" className="form-control" value={form.margin_percent} onChange={e => setForm(f => ({ ...f, margin_percent: e.target.value }))} placeholder="e.g. 15" /></div>
                      </div>
                      <div className="form-row">
                        <div className="form-group"><label className="form-label">Sanction Accepted Date</label><input type="date" className="form-control" value={form.sanction_accepted_date} onChange={e => setForm(f => ({ ...f, sanction_accepted_date: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Agreement Date</label><input type="date" className="form-control" value={form.agreement_date} onChange={e => setForm(f => ({ ...f, agreement_date: e.target.value }))} /></div>
                      </div>
                    </>
                  )}
                  {isRejected && (
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Rejection Reason</label><input className="form-control" value={form.rejection_reason} onChange={e => setForm(f => ({ ...f, rejection_reason: e.target.value }))} placeholder="Reason" /></div>
                      <div className="form-group"><label className="form-label">Relook Possible?</label><select className="form-control" value={form.relook_possible} onChange={e => setForm(f => ({ ...f, relook_possible: e.target.value }))}><option>No</option><option>Yes</option></select></div>
                    </div>
                  )}
                  {isDisbursed && (
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Disbursed Amount (₹)</label><input type="number" className="form-control" value={form.disbursed_amount} onChange={e => setForm(f => ({ ...f, disbursed_amount: e.target.value }))} placeholder="Amount" /></div>
                      <div className="form-group"><label className="form-label">Disbursement Mode</label><select className="form-control" value={form.disbursement_mode} onChange={e => setForm(f => ({ ...f, disbursement_mode: e.target.value }))}><option>University</option><option>Student Account</option></select></div>
                      <div className="form-group"><label className="form-label">Disbursement Request Date</label><input type="date" className="form-control" value={form.disbursement_request_date} onChange={e => setForm(f => ({ ...f, disbursement_request_date: e.target.value }))} /></div>
                    </div>
                  )}
                  {isCloseRequired && (
                    <div className="form-group">
                      <label className="form-label">Close / Drop Reason <span style={{ color: 'red' }}>*</span></label>
                      <input className="form-control" value={form.close_reason} onChange={e => setForm(f => ({ ...f, close_reason: e.target.value }))} placeholder="Reason for closing/dropping this case (required)" />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Remarks / Notes</label>
                    <textarea className="form-control" rows={3} placeholder="Add any notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-outline" onClick={() => { setActivePanel(null); setActiveTab('summary'); }}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSaveStatus} disabled={saving}>
                      <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i> {saving ? 'Saving...' : 'Update Status'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── MARK INVALID MODAL ── */}
              {invalidDocId && (
                <div className="bank-panel" style={{ border: '2px solid #d32f2f' }}>
                  <div className="bank-panel-header">
                    <h4 style={{ color: '#d32f2f' }}><i className="fas fa-times-circle" style={{ marginRight: 8 }}></i> Mark Document Invalid</h4>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reason for invalidity <span style={{ color: 'red' }}>*</span></label>
                    <input className="form-control" value={invalidReason} onChange={e => setInvalidReason(e.target.value)} placeholder="e.g. Blurred, Expired, Incorrect document" />
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-outline" onClick={() => { setInvalidDocId(null); setInvalidReason(''); }}>Cancel</button>
                    <button className="btn btn-outline" style={{ color: '#d32f2f', borderColor: '#d32f2f' }} onClick={handleMarkInvalid}>Confirm Invalid</button>
                  </div>
                </div>
              )}

              {/* ── SUMMARY TAB ── */}
              {activeTab === 'summary' && !activePanel && !invalidDocId && (
                <div>
                  {/* Student & Education */}
                  <div className="bank-summary-section">
                    <div className="bank-summary-section-title"><i className="fas fa-user-graduate"></i> Student & Education</div>
                    <div className="bank-summary-grid">
                      <div><label>Student Name</label><div>{app.student_name}</div></div>
                      <div><label>Email</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {app.student_email}
                          <button className="btn-icon" style={{ width: 24, height: 24, fontSize: 11 }} onClick={() => { navigator.clipboard.writeText(app.student_email); toast.success('Copied'); }} title="Copy email">
                            <i className="fas fa-copy"></i>
                          </button>
                        </div>
                      </div>
                      <div><label>Phone</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {app.student_phone || '—'}
                          {app.student_phone && (
                            <button className="btn-icon" style={{ width: 24, height: 24, fontSize: 11 }} onClick={() => { navigator.clipboard.writeText(app.student_phone); toast.success('Phone copied'); }} title="Copy phone">
                              <i className="fas fa-copy"></i>
                            </button>
                          )}
                        </div>
                      </div>
                      <div><label>University</label><div>{app.university}</div></div>
                      <div><label>Course</label><div>{app.course}</div></div>
                      <div><label>Country</label><div>{app.country || '—'}</div></div>
                      <div><label>Intake</label><div>{app.intake || '—'}</div></div>
                    </div>
                  </div>

                  {/* Loan Details */}
                  <div className="bank-summary-section">
                    <div className="bank-summary-section-title"><i className="fas fa-rupee-sign"></i> Loan Details</div>
                    <div className="bank-summary-grid">
                      <div><label>Bank</label><div>{app.bank}</div></div>
                      <div><label>Loan Amount Requested</label><div>{app.loan_amount_requested ? formatCurrency(app.loan_amount_requested) : '—'}</div></div>
                      <div><label>Collateral</label><div>{app.collateral || '—'}</div></div>
                      <div><label>Loan Type</label><div>{app.loan_type || '—'}</div></div>
                      <div><label>Bank Application Ref</label><div>{app.bank_application_ref || '—'}</div></div>
                      {app.sanction_amount && <>
                        <div><label>Sanctioned Amount</label><div style={{ fontWeight: 600, color: 'var(--status-green)' }}>{formatCurrency(app.sanction_amount)}</div></div>
                        <div><label>ROI</label><div>{app.roi ? `${app.roi}%` : '—'}</div></div>
                        <div><label>Tenure</label><div>{app.tenure ? `${app.tenure} months` : '—'}</div></div>
                        <div><label>Processing Fee</label><div>{app.processing_fee ? `${app.processing_fee}%` : '—'}</div></div>
                        <div><label>Margin</label><div>{app.margin_percent ? `${app.margin_percent}%` : '—'}</div></div>
                        <div><label>Sanction Accepted</label><div>{app.sanction_accepted_date ? formatDate(app.sanction_accepted_date) : '—'}</div></div>
                        <div><label>Agreement Date</label><div>{app.agreement_date ? formatDate(app.agreement_date) : '—'}</div></div>
                      </>}
                      {app.disbursed_amount && <>
                        <div><label>Disbursed Amount</label><div style={{ fontWeight: 600, color: 'var(--sbi-accent)' }}>{formatCurrency(app.disbursed_amount)}</div></div>
                        <div><label>Disbursement Mode</label><div>{app.disbursement_mode}</div></div>
                        <div><label>Disbursement Request Date</label><div>{app.disbursement_request_date ? formatDate(app.disbursement_request_date) : '—'}</div></div>
                        <div><label>Disbursed Date</label><div>{app.disbursed_date ? formatDate(app.disbursed_date) : '—'}</div></div>
                      </>}
                      {app.close_reason && (
                        <div style={{ gridColumn: '1 / -1' }}><label>Close/Drop Reason</label><div style={{ color: '#d32f2f' }}>{app.close_reason}</div></div>
                      )}
                    </div>
                  </div>

                  {/* Status Snapshot */}
                  <div className="bank-summary-section">
                    <div className="bank-summary-section-title"><i className="fas fa-info-circle"></i> Status Snapshot</div>
                    <div className="bank-summary-grid">
                      <div><label>Current Status</label><div><StatusBadge status={app.status} /></div></div>
                      <div><label>Sub Status</label><div>{app.sub_status || '—'}</div></div>
                      <div><label>Awaiting From</label><div><AwaitingPill awaiting={app.awaiting_from} /></div></div>
                      <div><label>SLA Timer</label><div><SLATag days={app.sla_days} awaiting={app.awaiting_from} status={app.status} /> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({app.sla_days}d)</span></div></div>
                      <div><label>Priority</label><div>{app.priority}</div></div>
                      <div><label>Last Updated</label><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDateTime(app.updated_at)}</div></div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── DOCUMENTS TAB ── */}
              {activeTab === 'documents' && !activePanel && !invalidDocId && (
                <div>
                  <div className="bank-doc-tab-nav">
                    {DOC_TABS.map(t => (
                      <button key={t} className={`bank-doc-tab ${docTab === t ? 'active' : ''}`} onClick={() => setDocTab(t)}>{t}</button>
                    ))}
                  </div>
                  {docsLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#999' }}><i className="fas fa-spinner fa-spin"></i> Loading documents...</div>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      {docsInTab.length === 0 ? (
                        <div className="bank-doc-placeholder">
                          <i className="fas fa-file-alt" style={{ fontSize: 36, color: 'var(--border-color)', marginBottom: 12 }}></i>
                          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No documents in {docTab} yet</div>
                        </div>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Document</th>
                              <th>Owner</th>
                              <th>Status</th>
                              <th>Uploaded By</th>
                              <th>Date</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docsInTab.map(doc => (
                              <tr key={doc.id}>
                                <td style={{ fontWeight: 500, fontSize: 13 }}>{doc.doc_name}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{doc.owner}</td>
                                <td>{docStatusBadge(doc.status)}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.uploaded_by || '—'}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.uploaded_at ? formatDate(doc.uploaded_at) : '—'}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-sm btn-outline" onClick={() => handleViewDoc(doc)} title="View">
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    {doc.status !== 'Verified' && (
                                      <button className="btn btn-sm btn-outline" style={{ color: '#2e7d32', borderColor: '#2e7d32' }} onClick={() => handleDocStatus(doc.id, 'Verified', null)} title="Mark Verified">
                                        <i className="fas fa-check"></i>
                                      </button>
                                    )}
                                    {doc.status !== 'Received' && doc.status !== 'Verified' && (
                                      <button className="btn btn-sm btn-outline" style={{ color: '#1565c0', borderColor: '#1565c0' }} onClick={() => handleDocStatus(doc.id, 'Received', null)} title="Mark Received">
                                        <i className="fas fa-inbox"></i>
                                      </button>
                                    )}
                                    {doc.status !== 'Invalid' && (
                                      <button className="btn btn-sm btn-outline" style={{ color: '#d32f2f', borderColor: '#d32f2f' }} onClick={() => { setInvalidDocId(doc.id); setActivePanel(null); }} title="Mark Invalid">
                                        <i className="fas fa-times"></i>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10 }}>
                        <button className="btn btn-outline btn-sm" onClick={handleDownloadAllDocs}>
                          <i className="fas fa-file-archive"></i> Download All Files
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── CO-APPLICANTS TAB ── */}
              {activeTab === 'co-applicants' && !activePanel && !invalidDocId && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ margin: 0 }}><i className="fas fa-users" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i> Co-Applicants</h4>
                    <button className="btn btn-sm btn-outline" onClick={() => setShowCoForm(f => !f)}>
                      <i className={`fas fa-${showCoForm ? 'minus' : 'plus'}`}></i> {showCoForm ? 'Cancel' : 'Add Co-applicant'}
                    </button>
                  </div>
                  {showCoForm && (
                    <div className="bank-panel" style={{ marginBottom: 16 }}>
                      <div className="form-row">
                        <div className="form-group"><label className="form-label">Name <span style={{ color: 'red' }}>*</span></label><input className="form-control" value={coForm.name} onChange={e => setCoForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></div>
                        <div className="form-group"><label className="form-label">Relation</label><select className="form-control" value={coForm.relation} onChange={e => setCoForm(f => ({ ...f, relation: e.target.value }))}><option value="">Select</option>{['Father','Mother','Spouse','Sibling','Guardian','Other'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={coForm.phone} onChange={e => setCoForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" /></div>
                        <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={coForm.email} onChange={e => setCoForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" /></div>
                        <div className="form-group"><label className="form-label">Annual Income (₹)</label><input type="number" className="form-control" value={coForm.income} onChange={e => setCoForm(f => ({ ...f, income: e.target.value }))} placeholder="e.g. 800000" /></div>
                        <div className="form-group"><label className="form-label">Employment</label><select className="form-control" value={coForm.employment_type} onChange={e => setCoForm(f => ({ ...f, employment_type: e.target.value }))}><option value="">Select</option>{['Salaried','Self-Employed','Business Owner','Retired'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                      </div>
                      <div className="form-actions">
                        <button className="btn btn-primary" onClick={handleSaveCoApplicant} disabled={savingCo}>
                          <i className={`fas ${savingCo ? 'fa-spinner fa-spin' : 'fa-save'}`}></i> {savingCo ? 'Saving...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}
                  {!coApps ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>
                  ) : coApps.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                      <i className="fas fa-user-plus" style={{ fontSize: 28, display: 'block', marginBottom: 8 }}></i>
                      No co-applicants added yet
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr><th>Name</th><th>Relation</th><th>Phone</th><th>Email</th><th>Income</th><th>Employment</th><th></th></tr>
                      </thead>
                      <tbody>
                        {coApps.map(co => (
                          <tr key={co.id}>
                            <td style={{ fontWeight: 500 }}>{co.name}</td>
                            <td style={{ fontSize: 13 }}>{co.relation || '—'}</td>
                            <td style={{ fontSize: 13 }}>{co.phone || '—'}</td>
                            <td style={{ fontSize: 13 }}>{co.email || '—'}</td>
                            <td style={{ fontSize: 13 }}>{co.income ? formatCurrency(co.income) : '—'}</td>
                            <td style={{ fontSize: 13 }}>{co.employment_type || '—'}</td>
                            <td>
                              <button className="btn btn-sm btn-outline" style={{ color: '#d32f2f', borderColor: '#d32f2f' }} onClick={() => handleDeleteCoApplicant(co.id)} title="Remove">
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ── FOLLOW-UP TAB ── */}
              {activeTab === 'followup' && !activePanel && !invalidDocId && (
                <div style={{ paddingTop: 8 }}>
                  {app.awaiting_from === 'Bank' && (
                    <div style={{ background: '#fce4ec', border: '1px solid #f48fb1', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className="fas fa-exclamation-circle" style={{ color: '#c62828', fontSize: 18 }}></i>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#c62828' }}>Pending from Bank</div>
                        <div style={{ fontSize: 12, color: '#546e7a' }}>This case is currently waiting on the bank for action. Please update or respond.</div>
                      </div>
                    </div>
                  )}
                  <FollowUpPanel appId={appId} app={app} />
                </div>
              )}

              {/* ── TIMELINE TAB ── */}
              {activeTab === 'timeline' && !activePanel && !invalidDocId && (
                <div style={{ paddingTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h4 style={{ margin: 0 }}><i className="fas fa-history" style={{ marginRight: 8 }}></i> Activity Timeline</h4>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {TIMELINE_FILTERS.map(f => (
                        <button key={f} className={`bank-chip${timelineFilter === f ? ' active' : ''}`} style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setTimelineFilter(f)}>{f}</button>
                      ))}
                    </div>
                  </div>
                  {filteredHistory.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No history entries for this filter</div>
                  ) : filteredHistory.map((h, i) => {
                    const cfg = STATUS_CONFIG[h.status];
                    const isCurrent = i === 0 && timelineFilter === 'All';
                    const entryType = h.entry_type || 'status';
                    const icon = entryType === 'query' ? 'fa-question-circle' : entryType === 'proof' ? 'fa-upload' : entryType === 'docs' ? 'fa-file-alt' : (isCurrent ? 'fa-circle' : 'fa-check');
                    const dotColor = entryType === 'query' ? 'amber' : entryType === 'proof' ? 'blue' : entryType === 'docs' ? 'grey' : (cfg?.color || 'grey');
                    return (
                      <div key={h.id} className="timeline-item">
                        <div className={`timeline-dot ${dotColor}`}>
                          <i className={`fas ${icon}`}></i>
                        </div>
                        <div className="timeline-content">
                          <div className="title">{cfg?.label || h.status}</div>
                          <div className="subtitle">{h.notes || '—'} {h.sub_status && h.sub_status !== '-' ? `(${h.sub_status})` : ''}</div>
                          <div className="time">
                            <i className="fas fa-clock"></i> {formatDateTime(h.created_at)} · {h.changed_by}
                            {h.awaiting_from && h.awaiting_from !== 'Closed' && (
                              <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>→ {h.awaiting_from}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
