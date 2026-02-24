import { useState, useEffect, useCallback } from 'react';
import { bankAdminApi } from '../../api';

const STATUS_OPTIONS = ['INITIATED','DOCS_PENDING','LOGIN_DONE','UNDER_REVIEW','SANCTIONED','REJECTED','DISBURSED','CLOSED'];
const STATUS_COLORS = {
  INITIATED: '#6b7280', DOCS_PENDING: '#f59e0b', LOGIN_DONE: '#3b82f6',
  UNDER_REVIEW: '#8b5cf6', SANCTIONED: '#10b981', REJECTED: '#ef4444',
  DISBURSED: '#059669', CLOSED: '#9ca3af',
};
const PROOF_TYPES = ['SANCTION_LETTER','REJECTION_PROOF','DISBURSEMENT_PROOF'];

function Tab({ label, active, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 18px', border: 'none', borderBottom: active ? '2px solid #0d7377' : '2px solid transparent',
      background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
      color: active ? '#0d7377' : '#6b7280', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      {count > 0 && <span style={{ background: '#0d7377', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{count}</span>}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
    </div>
  );
}

export default function BankApplicationDetailPage({ appId, bankId, bankRole, onBack }) {
  const [app, setApp] = useState(null);
  const [events, setEvents] = useState([]);
  const [queries, setQueries] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [docReviews, setDocReviews] = useState([]);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Modals
  const [statusModal, setStatusModal] = useState(false);
  const [queryModal, setQueryModal] = useState(false);
  const [proofModal, setProofModal] = useState(false);
  const [docReviewModal, setDocReviewModal] = useState(null); // { doc_code }
  const [selectedQuery, setSelectedQuery] = useState(null);

  // Forms
  const [statusForm, setStatusForm] = useState({ status: '', awaiting_from: '', sanction_amount_paise: '', roi_final: '', rejection_reason: '', notes: '' });
  const [queryForm, setQueryForm] = useState({ title: '', message: '' });
  const [queryReplyForm, setQueryReplyForm] = useState({ message: '', attachment_url: '' });
  const [proofForm, setProofForm] = useState({ proof_type: 'SANCTION_LETTER', file_url: '', notes: '' });
  const [docReviewForm, setDocReviewForm] = useState({ action: 'VERIFIED', rejection_reason_code: '', rejection_note: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [appData, eventsData, queriesData, proofsData, reviewsData, reasonsData] = await Promise.all([
        bankAdminApi.getBankApplication(appId),
        bankAdminApi.getApplicationEvents(appId).catch(() => []),
        bankAdminApi.getQueries(appId).catch(() => []),
        bankAdminApi.getProofs(appId).catch(() => []),
        bankAdminApi.getDocReviews(appId).catch(() => []),
        bankAdminApi.getDocRejectionReasons().catch(() => []),
      ]);
      setApp(appData);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setQueries(Array.isArray(queriesData) ? queriesData : []);
      setProofs(Array.isArray(proofsData) ? proofsData : []);
      setDocReviews(Array.isArray(reviewsData) ? reviewsData : []);
      setRejectionReasons(Array.isArray(reasonsData) ? reasonsData : []);
      if (appData?.status) setStatusForm(f => ({ ...f, status: appData.status }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleStatusUpdate = async () => {
    if (!statusForm.status) return;
    setSaving(true);
    try {
      await bankAdminApi.updateBankApplicationStatus(appId, {
        status: statusForm.status,
        awaiting_from: statusForm.awaiting_from || undefined,
        sanction_amount_paise: statusForm.sanction_amount_paise ? parseInt(statusForm.sanction_amount_paise) : undefined,
        roi_final: statusForm.roi_final ? parseFloat(statusForm.roi_final) : undefined,
        rejection_reason: statusForm.rejection_reason || undefined,
        notes: statusForm.notes || undefined,
      });
      setStatusModal(false);
      fetchAll();
    } catch (e) {
      alert('Error: ' + (e.message || 'Failed'));
    } finally { setSaving(false); }
  };

  const handleCreateQuery = async () => {
    if (!queryForm.title || !queryForm.message) return;
    setSaving(true);
    try {
      await bankAdminApi.createQuery(appId, queryForm);
      setQueryModal(false);
      setQueryForm({ title: '', message: '' });
      fetchAll();
    } catch (e) {
      alert('Error creating query');
    } finally { setSaving(false); }
  };

  const handleReplyQuery = async () => {
    if (!selectedQuery || !queryReplyForm.message) return;
    setSaving(true);
    try {
      await bankAdminApi.addQueryMessage(selectedQuery.id, queryReplyForm);
      setQueryReplyForm({ message: '', attachment_url: '' });
      const updated = await bankAdminApi.getQuery(selectedQuery.id);
      setSelectedQuery(updated);
      fetchAll();
    } catch (e) {
      alert('Error sending reply');
    } finally { setSaving(false); }
  };

  const handleUploadProof = async () => {
    if (!proofForm.file_url) return;
    setSaving(true);
    try {
      await bankAdminApi.uploadProof(appId, proofForm);
      setProofModal(false);
      setProofForm({ proof_type: 'SANCTION_LETTER', file_url: '', notes: '' });
      fetchAll();
    } catch (e) {
      alert('Error uploading proof');
    } finally { setSaving(false); }
  };

  const handleDocReview = async () => {
    if (!docReviewModal?.doc_code) return;
    setSaving(true);
    try {
      await bankAdminApi.reviewDoc(appId, { doc_code: docReviewModal.doc_code, ...docReviewForm });
      setDocReviewModal(null);
      setDocReviewForm({ action: 'VERIFIED', rejection_reason_code: '', rejection_note: '' });
      fetchAll();
    } catch (e) {
      alert('Error: ' + (e.message || 'Failed'));
    } finally { setSaving(false); }
  };

  const openQuery = async (q) => {
    try {
      const full = await bankAdminApi.getQuery(q.id);
      setSelectedQuery(full);
    } catch { setSelectedQuery(q); }
  };

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }}></i>
    </div>
  );

  if (!app) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <button onClick={onBack} style={{ fontSize: 13, color: '#0d7377', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20 }}>← Back</button>
      <p style={{ color: '#ef4444' }}>Application not found.</p>
    </div>
  );

  const slaDate = app.sla_due_at ? new Date(app.sla_due_at) : null;
  const now = new Date();
  const slaBreached = slaDate && slaDate < now && !['SANCTIONED','REJECTED','DISBURSED','CLOSED'].includes(app.status);

  // Unique doc codes from reviews
  const reviewedDocs = {};
  docReviews.forEach(r => {
    if (!reviewedDocs[r.doc_code] || new Date(r.reviewed_at) > new Date(reviewedDocs[r.doc_code].reviewed_at)) {
      reviewedDocs[r.doc_code] = r;
    }
  });

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{ fontSize: 13, color: '#0d7377', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <i className="fas fa-arrow-left" style={{ marginRight: 6 }}></i>Back to Applications
      </button>

      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '18px 24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: slaBreached ? '4px solid #ef4444' : '4px solid #0d7377' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontFamily: 'monospace', fontWeight: 700 }}>
              {app.case_id ? `NX-${app.case_id.slice(0,6).toUpperCase()}` : app.id.slice(0,8).toUpperCase()}
              {slaBreached && <span style={{ marginLeft: 8, background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>SLA BREACH</span>}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{app.student_name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#6b7280' }}>
              <span><i className="fas fa-globe" style={{ marginRight: 4, color: '#0d7377' }}></i>{app.country || '—'}</span>
              <span><i className="fas fa-university" style={{ marginRight: 4, color: '#0d7377' }}></i>{app.university || '—'}</span>
              <span><i className="fas fa-tag" style={{ marginRight: 4, color: '#0d7377' }}></i>{app.product_name || '—'}</span>
              {app.branch_name && <span><i className="fas fa-code-branch" style={{ marginRight: 4, color: '#0d7377' }}></i>{app.branch_name}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 20, background: (STATUS_COLORS[app.status] || '#9ca3af') + '20', color: STATUS_COLORS[app.status] || '#9ca3af' }}>
              {app.status?.replace(/_/g,' ')}
            </span>
            {slaDate && (
              <span style={{ fontSize: 12, color: slaBreached ? '#dc2626' : '#6b7280' }}>
                SLA: {slaDate.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
              </span>
            )}
            {app.awaiting_from && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0d7377', background: '#e0f2f1', padding: '3px 10px', borderRadius: 10 }}>
                Awaiting: {app.awaiting_from}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setStatusModal(true)}
            style={{ padding: '7px 14px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <i className="fas fa-edit" style={{ marginRight: 5 }}></i>Update Status
          </button>
          <button onClick={() => setQueryModal(true)}
            style={{ padding: '7px 14px', background: '#fff', color: '#0d7377', border: '1px solid #0d7377', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <i className="fas fa-question-circle" style={{ marginRight: 5 }}></i>Raise Query
          </button>
          <button onClick={() => setProofModal(true)}
            style={{ padding: '7px 14px', background: '#fff', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <i className="fas fa-upload" style={{ marginRight: 5 }}></i>Upload Proof
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'documents', label: 'Documents', count: Object.keys(reviewedDocs).length },
            { key: 'queries', label: 'Queries', count: queries.filter(q => q.status === 'OPEN').length },
            { key: 'timeline', label: 'Timeline', count: events.length },
            { key: 'proofs', label: 'Proofs', count: proofs.length },
          ].map(t => (
            <Tab key={t.key} label={t.label} active={activeTab === t.key} onClick={() => setActiveTab(t.key)} count={t.count || 0} />
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <Section title="Student Snapshot">
                  <InfoRow label="Name" value={app.student_name} />
                  <InfoRow label="Phone" value={app.student_phone} />
                  <InfoRow label="Email" value={app.student_email} />
                  <InfoRow label="Country" value={app.country} />
                  <InfoRow label="University" value={app.university} />
                  <InfoRow label="Course" value={app.course} />
                  <InfoRow label="Intake" value={app.intake} />
                  <InfoRow label="Loan Amount" value={app.loan_amount_paise ? `₹${(app.loan_amount_paise / 100).toLocaleString()}` : null} />
                </Section>
                <Section title="Loan Details">
                  <InfoRow label="Product" value={app.product_name} />
                  <InfoRow label="Loan Type" value={app.loan_type} />
                  <InfoRow label="Sanction Amount" value={app.sanction_amount_paise ? `₹${(app.sanction_amount_paise / 100).toLocaleString()}` : null} />
                  <InfoRow label="ROI Final" value={app.roi_final ? `${app.roi_final}%` : null} />
                  <InfoRow label="Disbursed Amount" value={app.disbursed_amount_paise ? `₹${(app.disbursed_amount_paise / 100).toLocaleString()}` : null} />
                  {app.rejection_reason && <InfoRow label="Rejection Reason" value={app.rejection_reason} />}
                </Section>
              </div>
              <div>
                <Section title="Bank Assignment">
                  <InfoRow label="Branch" value={app.branch_name ? `${app.branch_name} (${app.city || ''})` : null} />
                  <InfoRow label="Officer" value={app.officer_name} />
                  <InfoRow label="Officer Phone" value={app.officer_phone} />
                  <InfoRow label="Priority" value={app.priority} />
                </Section>
                <Section title="Next Action (Bank-side)">
                  <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, color: '#0d7377', fontWeight: 700, marginBottom: 6 }}>
                      Awaiting: <span style={{ color: '#374151' }}>{app.awaiting_from}</span>
                    </div>
                    {slaDate && (
                      <div style={{ fontSize: 12, color: slaBreached ? '#dc2626' : '#6b7280', fontWeight: slaBreached ? 700 : 400 }}>
                        SLA Due: {slaDate.toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        {slaBreached && ' — BREACHED'}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                      Last update: {app.last_bank_update_at ? new Date(app.last_bank_update_at).toLocaleDateString('en-IN') : 'Not yet updated'}
                    </div>
                  </div>
                </Section>
                <Section title="Timeline Summary">
                  <InfoRow label="Submitted" value={app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-IN') : null} />
                  <InfoRow label="Created" value={app.created_at ? new Date(app.created_at).toLocaleDateString('en-IN') : null} />
                  <InfoRow label="Open Queries" value={queries.filter(q => q.status === 'OPEN').length} />
                  <InfoRow label="Proofs Uploaded" value={proofs.length} />
                </Section>
              </div>
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Document Checklist</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{Object.keys(reviewedDocs).length} reviewed</div>
              </div>

              {docReviews.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
                  <i className="fas fa-folder-open" style={{ fontSize: 28, marginBottom: 10, display: 'block' }}></i>
                  No document reviews yet. Use "Review Doc" button below to verify or reject documents.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      {['Document','Action','Reason','Note','Reviewed By','Date',''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {docReviews.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#374151', fontFamily: 'monospace' }}>{r.doc_code}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: r.action === 'VERIFIED' ? '#d1fae5' : '#fee2e2', color: r.action === 'VERIFIED' ? '#065f46' : '#dc2626' }}>
                            {r.action}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{r.rejection_reason_code || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{r.rejection_note || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{r.reviewed_by_name || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>
                          {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button onClick={() => { setDocReviewModal({ doc_code: r.doc_code }); setDocReviewForm({ action: 'VERIFIED', rejection_reason_code: '', rejection_note: '' }); }}
                            style={{ fontSize: 11, padding: '3px 8px', background: '#e0f2f1', color: '#0d7377', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
                            Re-review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ marginTop: 16 }}>
                <button onClick={() => { setDocReviewModal({ doc_code: '' }); setDocReviewForm({ action: 'VERIFIED', rejection_reason_code: '', rejection_note: '' }); }}
                  style={{ padding: '8px 16px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Review a Document
                </button>
              </div>
            </div>
          )}

          {/* QUERIES TAB */}
          {activeTab === 'queries' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedQuery ? '1fr 1fr' : '1fr', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Queries ({queries.length})</div>
                  <button onClick={() => setQueryModal(true)}
                    style={{ padding: '6px 14px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <i className="fas fa-plus" style={{ marginRight: 5 }}></i>New Query
                  </button>
                </div>
                {queries.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
                    <i className="fas fa-comments" style={{ fontSize: 28, marginBottom: 10, display: 'block' }}></i>
                    No queries raised yet
                  </div>
                ) : queries.map(q => (
                  <div key={q.id} onClick={() => openQuery(q)}
                    style={{ padding: '12px 16px', border: `1px solid ${selectedQuery?.id === q.id ? '#0d7377' : '#e5e7eb'}`, borderRadius: 8, marginBottom: 8, cursor: 'pointer', background: selectedQuery?.id === q.id ? '#e0f2f1' : '#fff', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{q.title}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: q.status === 'OPEN' ? '#fef3c7' : q.status === 'CLOSED' ? '#f3f4f6' : '#d1fae5', color: q.status === 'OPEN' ? '#92400e' : q.status === 'CLOSED' ? '#6b7280' : '#065f46' }}>
                        {q.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{q.message?.slice(0, 80)}{q.message?.length > 80 ? '...' : ''}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      By {q.raised_by_name || q.raised_by_actor_type} · {q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN') : ''}
                    </div>
                  </div>
                ))}
              </div>

              {selectedQuery && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ background: '#f9fafb', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{selectedQuery.title}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {selectedQuery.status !== 'CLOSED' && (
                        <button onClick={async () => { await bankAdminApi.closeQuery(selectedQuery.id); fetchAll(); setSelectedQuery(null); }}
                          style={{ fontSize: 11, padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>
                          Close Query
                        </button>
                      )}
                      <button onClick={() => setSelectedQuery(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16 }}>×</button>
                    </div>
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto', padding: 16 }}>
                    <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0d7377', marginBottom: 4 }}>Original query — {selectedQuery.raised_by_name}</div>
                      <div style={{ fontSize: 13, color: '#374151' }}>{selectedQuery.message}</div>
                    </div>
                    {(selectedQuery.messages || []).map(m => (
                      <div key={m.id} style={{ background: m.actor_type === 'BANK' ? '#e0f2f1' : '#fafafa', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: m.actor_type === 'BANK' ? '#0d7377' : '#6b7280', marginBottom: 4 }}>
                          {m.actor_name || m.actor_type} · {m.created_at ? new Date(m.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
                        </div>
                        <div style={{ fontSize: 13, color: '#374151' }}>{m.message}</div>
                        {m.attachment_url && <a href={m.attachment_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0d7377' }}>View Attachment</a>}
                      </div>
                    ))}
                  </div>
                  {selectedQuery.status !== 'CLOSED' && (
                    <div style={{ padding: 16, borderTop: '1px solid #e5e7eb' }}>
                      <textarea
                        placeholder="Type your reply..."
                        value={queryReplyForm.message}
                        onChange={e => setQueryReplyForm(f => ({ ...f, message: e.target.value }))}
                        style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                      />
                      <button onClick={handleReplyQuery} disabled={saving || !queryReplyForm.message}
                        style={{ marginTop: 8, padding: '7px 16px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Send Reply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Application Timeline ({events.length} events)</div>
              {events.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
                  <i className="fas fa-history" style={{ fontSize: 28, marginBottom: 10, display: 'block' }}></i>
                  No events logged yet
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#e5e7eb' }}></div>
                  {[...events].reverse().map((e, i) => {
                    const details = (() => { try { return JSON.parse(e.details); } catch { return {}; } })();
                    const iconMap = {
                      STATUS_CHANGE: 'fa-exchange-alt',
                      DOC_VERIFIED: 'fa-check-circle',
                      DOC_REJECTED: 'fa-times-circle',
                      QUERY_RAISED: 'fa-question-circle',
                      PROOF_UPLOADED: 'fa-upload',
                      ASSIGNED: 'fa-user-check',
                      APPLICATION_CREATED: 'fa-plus-circle',
                      PACK_DOWNLOADED: 'fa-download',
                    };
                    const colorMap = {
                      STATUS_CHANGE: '#3b82f6',
                      DOC_VERIFIED: '#10b981',
                      DOC_REJECTED: '#ef4444',
                      QUERY_RAISED: '#f59e0b',
                      PROOF_UPLOADED: '#7c3aed',
                      ASSIGNED: '#0d7377',
                      APPLICATION_CREATED: '#10b981',
                    };
                    return (
                      <div key={e.id} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: colorMap[e.event_type] || '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: -12, zIndex: 1 }}>
                          <i className={`fas ${iconMap[e.event_type] || 'fa-circle'}`} style={{ color: '#fff', fontSize: 10 }}></i>
                        </div>
                        <div style={{ flex: 1, background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                              {e.event_type?.replace(/_/g,' ')}
                              {details.from && details.to && (
                                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>
                                  {details.from} → {details.to}
                                </span>
                              )}
                              {details.doc_code && <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 6, fontFamily: 'monospace' }}>{details.doc_code}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: 8 }}>
                              {e.created_at ? new Date(e.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
                            </div>
                          </div>
                          {details.by && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>By {details.by}</div>}
                          {details.notes && <div style={{ fontSize: 12, color: '#374151', marginTop: 4, fontStyle: 'italic' }}>"{details.notes}"</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PROOFS TAB */}
          {activeTab === 'proofs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Proof Documents ({proofs.length})</div>
                <button onClick={() => setProofModal(true)}
                  style={{ padding: '6px 14px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <i className="fas fa-upload" style={{ marginRight: 5 }}></i>Upload Proof
                </button>
              </div>
              {proofs.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  <i className="fas fa-file-upload" style={{ fontSize: 32, marginBottom: 10, display: 'block' }}></i>
                  No proofs uploaded yet
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {proofs.map(p => (
                    <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{p.proof_type?.replace(/_/g,' ')}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: p.status === 'VERIFIED' ? '#d1fae5' : p.status === 'REJECTED' ? '#fee2e2' : '#fef3c7', color: p.status === 'VERIFIED' ? '#065f46' : p.status === 'REJECTED' ? '#dc2626' : '#92400e' }}>
                          {p.status}
                        </span>
                      </div>
                      <a href={p.file_url} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 12, color: '#0d7377', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-external-link-alt" style={{ marginRight: 4 }}></i>View File
                      </a>
                      {p.notes && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontStyle: 'italic' }}>{p.notes}</div>}
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        Uploaded by {p.uploaded_by_name || p.uploaded_by_actor_type} · {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : ''}
                      </div>
                      {p.status === 'PENDING_VERIFY' && ['BANK_SUPER_ADMIN','BANK_REGION_HEAD','BANK_BRANCH_MANAGER'].includes(bankRole) && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                          <button onClick={async () => { await bankAdminApi.verifyProof(p.id, { status: 'VERIFIED' }); fetchAll(); }}
                            style={{ flex: 1, padding: '5px 0', background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            Verify
                          </button>
                          <button onClick={async () => { await bankAdminApi.verifyProof(p.id, { status: 'REJECTED' }); fetchAll(); }}
                            style={{ flex: 1, padding: '5px 0', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}

      {/* Update Status Modal */}
      {statusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Update Application Status</div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Status *</label>
            <select value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 12 }}>
              <option value="">Select status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Awaiting From</label>
            <select value={statusForm.awaiting_from} onChange={e => setStatusForm(f => ({ ...f, awaiting_from: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 12 }}>
              <option value="">Unchanged</option>
              <option value="BANK">Bank</option>
              <option value="STUDENT">Student</option>
              <option value="NEXTHARA">Nexthara</option>
            </select>
            {['SANCTIONED','DISBURSED'].includes(statusForm.status) && (
              <>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Sanction Amount (₹)</label>
                <input type="number" value={statusForm.sanction_amount_paise ? statusForm.sanction_amount_paise / 100 : ''} onChange={e => setStatusForm(f => ({ ...f, sanction_amount_paise: e.target.value ? parseFloat(e.target.value) * 100 : '' }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} placeholder="e.g. 1500000" />
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>ROI (%)</label>
                <input type="number" step="0.01" value={statusForm.roi_final} onChange={e => setStatusForm(f => ({ ...f, roi_final: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} placeholder="e.g. 10.5" />
              </>
            )}
            {statusForm.status === 'REJECTED' && (
              <>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Rejection Reason</label>
                <input value={statusForm.rejection_reason} onChange={e => setStatusForm(f => ({ ...f, rejection_reason: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} placeholder="Reason for rejection" />
              </>
            )}
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Notes (optional)</label>
            <textarea value={statusForm.notes} onChange={e => setStatusForm(f => ({ ...f, notes: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, minHeight: 70, resize: 'vertical', boxSizing: 'border-box', marginBottom: 20 }} placeholder="Any notes..." />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setStatusModal(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleStatusUpdate} disabled={saving || !statusForm.status} style={{ padding: '8px 20px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raise Query Modal */}
      {queryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Raise Query</div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Title *</label>
            <input value={queryForm.title} onChange={e => setQueryForm(f => ({ ...f, title: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }} placeholder="e.g. ITR document clarification" />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Message *</label>
            <textarea value={queryForm.message} onChange={e => setQueryForm(f => ({ ...f, message: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, minHeight: 100, resize: 'vertical', boxSizing: 'border-box', marginBottom: 20 }} placeholder="Describe the issue or query..." />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setQueryModal(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreateQuery} disabled={saving || !queryForm.title || !queryForm.message} style={{ padding: '8px 20px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Sending...' : 'Raise Query'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Proof Modal */}
      {proofModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Upload Proof Document</div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Proof Type *</label>
            <select value={proofForm.proof_type} onChange={e => setProofForm(f => ({ ...f, proof_type: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 14 }}>
              {PROOF_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>File URL *</label>
            <input value={proofForm.file_url} onChange={e => setProofForm(f => ({ ...f, file_url: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }} placeholder="https://..." />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Notes</label>
            <input value={proofForm.notes} onChange={e => setProofForm(f => ({ ...f, notes: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 20, boxSizing: 'border-box' }} placeholder="Optional notes..." />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setProofModal(false)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUploadProof} disabled={saving || !proofForm.file_url} style={{ padding: '8px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Uploading...' : 'Upload Proof'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doc Review Modal */}
      {docReviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Review Document</div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Document Code *</label>
            <input value={docReviewModal.doc_code} onChange={e => setDocReviewModal(d => ({ ...d, doc_code: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 14, boxSizing: 'border-box', fontFamily: 'monospace' }} placeholder="e.g. PASSPORT, ITR, OFFER_LETTER" />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Action *</label>
            <select value={docReviewForm.action} onChange={e => setDocReviewForm(f => ({ ...f, action: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 14 }}>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
            {docReviewForm.action === 'REJECTED' && (
              <>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Rejection Reason *</label>
                <select value={docReviewForm.rejection_reason_code} onChange={e => setDocReviewForm(f => ({ ...f, rejection_reason_code: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 14 }}>
                  <option value="">Select reason</option>
                  {rejectionReasons.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              </>
            )}
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Note (optional)</label>
            <input value={docReviewForm.rejection_note} onChange={e => setDocReviewForm(f => ({ ...f, rejection_note: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, marginBottom: 20, boxSizing: 'border-box' }} placeholder="Additional note..." />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDocReviewModal(null)} style={{ padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDocReview} disabled={saving || !docReviewModal.doc_code} style={{ padding: '8px 20px', background: docReviewForm.action === 'REJECTED' ? '#ef4444' : '#10b981', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : (docReviewForm.action === 'REJECTED' ? 'Mark Rejected' : 'Mark Verified')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
