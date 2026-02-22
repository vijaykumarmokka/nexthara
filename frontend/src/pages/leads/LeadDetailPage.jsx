import { useState, useEffect, useCallback } from 'react';
import { leadsApi } from '../../api';
import toast from 'react-hot-toast';

const STAGE_COLORS = {
  NEW:               { color: '#1565c0', bg: '#e3f2fd' },
  CONTACT_ATTEMPTED: { color: '#7b1fa2', bg: '#f3e5f5' },
  CONNECTED:         { color: '#512da8', bg: '#ede7f6' },
  QUALIFIED:         { color: '#f57f17', bg: '#fff8e1' },
  DOCS_REQUESTED:    { color: '#00695c', bg: '#e0f7fa' },
  DOCS_RECEIVED:     { color: '#00695c', bg: '#e0f2f1' },
  CASE_CREATED:      { color: '#2e7d32', bg: '#e8f5e9' },
  DROPPED:           { color: '#546e7a', bg: '#eceff1' },
  LOST:              { color: '#bf360c', bg: '#fbe9e7' },
  DUPLICATE:         { color: '#757575', bg: '#f5f5f5' },
};

const SOURCE_LABELS = {
  META_LEAD_FORM: 'Meta Lead Form', META_WHATSAPP: 'Meta WhatsApp',
  WEBSITE_FORM: 'Website Form', EVENT: 'Event', ADMISSION_CRM: 'Admission CRM',
  MANUAL_ENTRY: 'Manual Entry', IMPORT_CSV: 'Import CSV',
  WALK_IN: 'Walk-in', REFERRAL: 'Referral', API: 'API',
};

const TIMELINE_ICONS = {
  CREATED:       { icon: '✦', color: '#1565c0' },
  CALL:          { icon: '📞', color: '#2e7d32' },
  NOTE:          { icon: '📝', color: '#6a1b9a' },
  STAGE_CHANGE:  { icon: '→', color: '#f57f17' },
  QUALIFICATION: { icon: '✓', color: '#00695c' },
  QUALIFIED:     { icon: '⭐', color: '#f57f17' },
  FOLLOWUP:      { icon: '⏰', color: '#1565c0' },
  FOLLOWUP_DONE: { icon: '✅', color: '#2e7d32' },
  DROPPED:       { icon: '✕', color: '#c62828' },
  CASE_CREATED:  { icon: '🎉', color: '#2e7d32' },
  MERGE:         { icon: '🔗', color: '#6a1b9a' },
};

function StageBadge({ stage }) {
  const cfg = STAGE_COLORS[stage] || { color: '#666', bg: '#f5f5f5' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
      {stage}
    </span>
  );
}

function formatLoan(paise) {
  if (!paise) return '—';
  const lakh = paise / 10000000;
  return lakh >= 1 ? `₹${lakh.toFixed(1)}L` : `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function formatDT(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#222', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

function ActionBtn({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: color + '14', color, border: `1.5px solid ${color}40`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
      onMouseEnter={e => e.currentTarget.style.background = color + '28'}
      onMouseLeave={e => e.currentTarget.style.background = color + '14'}>
      {icon} {label}
    </button>
  );
}

function ModalWrap({ title, onClose, children, width = 420 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function LeadDetailPage({ leadId, onClose, onOpenCase }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCallModal, setShowCallModal]       = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showEditModal, setShowEditModal]       = useState(false);
  const [showQualModal, setShowQualModal]       = useState(false);
  const [showStageModal, setShowStageModal]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    leadsApi.getLead(leadId).then(setData).catch(() => toast.error('Failed to load lead')).finally(() => setLoading(false));
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  const handleDrop = async () => {
    if (!window.confirm('Mark this lead as DROPPED?')) return;
    try {
      await leadsApi.drop(leadId, 'Manually dropped');
      load();
      toast.success('Lead marked as Dropped');
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 40 }}>Loading lead…</div>
    </div>
  );

  if (!data) return null;
  const { lead, qualification, timeline, followups, mapping } = data;
  const stageCfg    = STAGE_COLORS[lead.stage] || { color: '#666', bg: '#f5f5f5' };
  const isLocked    = lead.is_locked || lead.stage === 'CASE_CREATED';
  const showConvert = ['QUALIFIED', 'DOCS_RECEIVED'].includes(lead.stage) && !isLocked;
  const isOverdue   = lead.next_followup_at && new Date(lead.next_followup_at) < new Date();
  const isMetaSrc   = ['META_LEAD_FORM', 'META_WHATSAPP', 'META'].includes(lead.lead_source_type || lead.source);
  const isAdmSrc    = lead.lead_source_type === 'ADMISSION_CRM' || !!lead.admission_case_id;
  const isEventSrc  = lead.lead_source_type === 'EVENT' || !!lead.event_registration_id;

  const TABS = [
    { key: 'overview',   label: 'Overview' },
    { key: 'qualify',    label: 'Qualification' },
    { key: 'timeline',   label: 'Timeline' },
    { key: 'campaign',   label: 'Campaign Data' },
    ...(isAdmSrc  ? [{ key: 'admission', label: 'Admission Sync' }] : []),
    ...(isEventSrc ? [{ key: 'event',    label: 'Event Info' }]    : []),
    { key: 'followups',  label: `Followups (${followups.filter(f => f.status === 'SCHEDULED').length})` },
    { key: 'case',       label: mapping ? '✅ Case Link' : '→ Case Link' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 20, overflowY: 'auto' }}>
      <div style={{ background: '#f0f2f5', borderRadius: 12, width: '95vw', maxWidth: 1200, minHeight: '80vh', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', position: 'relative', display: 'flex', flexDirection: 'column' }}>

        {/* Modal Header */}
        <div style={{ background: '#1a237e', color: '#fff', padding: '14px 24px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>{lead.id}</div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{lead.full_name}</span>
            <StageBadge stage={lead.stage} />
            {isLocked && <span style={{ background: '#ffd54f', color: '#333', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8 }}>🔒 LOCKED</span>}
            {lead.intent_score >= 80 && <span style={{ background: '#c62828', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8 }}>🔥 HOT {lead.intent_score}</span>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        {/* Banners */}
        {lead.stage === 'NEW' && !lead.last_activity_at && (
          <div style={{ background: '#fff3e0', borderBottom: '1px solid #ffe0b2', padding: '8px 24px', color: '#e65100', fontSize: 13 }}>
            ⚠ This lead has not been contacted yet.
          </div>
        )}
        {isOverdue && (
          <div style={{ background: '#ffebee', borderBottom: '1px solid #ef9a9a', padding: '8px 24px', color: '#c62828', fontSize: 13 }}>
            🚨 Follow-up overdue! Scheduled: {new Date(lead.next_followup_at).toLocaleString('en-IN')}
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ background: '#fff', borderBottom: '2px solid #e8eaf6', padding: '0 24px', display: 'flex', gap: 0, flexShrink: 0, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '12px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 400, color: activeTab === tab.key ? '#1a237e' : '#666', borderBottom: `3px solid ${activeTab === tab.key ? '#1a237e' : 'transparent'}`, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', gap: 16 }}>
              {/* Left: Lead Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card title="Lead Info">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Full Name"     value={lead.full_name} />
                    <Field label="Phone"         value={<a href={`tel:${lead.phone_e164}`} style={{ color: '#1565c0' }}>{lead.phone_e164}</a>} />
                    <Field label="Email"         value={lead.email || '—'} />
                    <Field label="City"          value={lead.city || '—'} />
                    <Field label="Source"        value={SOURCE_LABELS[lead.lead_source_type] || lead.lead_source_type || lead.source || '—'} />
                    <Field label="Intent Score"  value={lead.intent_score != null ? `${lead.intent_score}/100${lead.intent_score >= 80 ? ' 🔥' : ''}` : '—'} />
                    <Field label="Country"       value={lead.country || '—'} />
                    <Field label="Course"        value={lead.course || '—'} />
                    <Field label="Intake"        value={lead.intake || '—'} />
                    <Field label="Loan Amount"   value={formatLoan(lead.loan_amount_paise)} />
                    <Field label="Priority"      value={lead.priority} />
                    <Field label="Assigned To"   value={lead.assigned_staff_name || '—'} />
                    <Field label="Created"       value={formatDT(lead.created_at)} />
                    <Field label="Last Activity" value={formatDT(lead.last_activity_at)} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <ActionBtn icon="📞" label="Call" color="#1a237e" onClick={() => window.open(`tel:${lead.phone_e164}`)} />
                    <ActionBtn icon="💬" label="WhatsApp" color="#25D366" onClick={() => window.open(`https://wa.me/${lead.phone_e164.replace('+','')}`)} />
                    {!isLocked && <ActionBtn icon="✏️" label="Edit" color="#555" onClick={() => setShowEditModal(true)} />}
                    {!isLocked && <ActionBtn icon="🗂️" label="Qualification" color="#6a1b9a" onClick={() => setShowQualModal(true)} />}
                    {!isLocked && <ActionBtn icon="📞" label="Log Call" color="#2e7d32" onClick={() => setShowCallModal(true)} />}
                    {!isLocked && <ActionBtn icon="✕" label="Drop" color="#c62828" onClick={handleDrop} />}
                  </div>
                </Card>

                {/* Quick Message Templates */}
                <Card title="Quick Message Templates">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: '📨 Send Intro', msg: `Hi ${lead.full_name}, I'm reaching out from Nexthara regarding your education loan inquiry.` },
                      { label: '📋 Eligibility Checklist', msg: `Hi ${lead.full_name}, please share: Admission letter, Mark sheets (10th/12th/UG), Income proof, Bank statements.` },
                      { label: '🔗 Document Upload Link', msg: `Hi ${lead.full_name}, please upload your documents at: [portal link]` },
                      { label: '⏰ Reminder', msg: `Hi ${lead.full_name}, just a reminder for your follow-up call at the scheduled time.` },
                    ].map(t => (
                      <button key={t.label} onClick={() => navigator.clipboard?.writeText(t.msg).then(() => toast.success('Copied!'))}
                        style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: '#f5f6fa', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#1a237e' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right: Stage + Next Action + Convert */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card title="Current Stage">
                  <div style={{ background: stageCfg.bg, borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: stageCfg.color }}>{lead.stage}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Owner: {lead.assigned_staff_name || 'Unassigned'}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Priority: <strong>{lead.priority}</strong></div>
                  </div>
                  {!isLocked && (
                    <button onClick={() => setShowStageModal(true)} style={{ marginTop: 10, width: '100%', padding: '8px', background: '#fff', border: '1.5px solid #1a237e', color: '#1a237e', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      Change Stage →
                    </button>
                  )}
                </Card>

                <Card title="Next Follow-up">
                  {lead.next_followup_at ? (
                    <div style={{ background: isOverdue ? '#ffebee' : '#e8f5e9', borderRadius: 8, padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: isOverdue ? '#c62828' : '#2e7d32', fontSize: 14 }}>
                        {isOverdue ? '🚨 Overdue' : '📅 Upcoming'}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4, color: '#333' }}>
                        {new Date(lead.next_followup_at).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fff3e0', borderRadius: 8, padding: '12px 16px', color: '#e65100', fontSize: 13 }}>
                      No follow-up scheduled. Set one now!
                    </div>
                  )}
                  <button onClick={() => setShowFollowupModal(true)} style={{ marginTop: 10, width: '100%', padding: '8px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    📅 Set / Update Follow-up
                  </button>
                </Card>

                {/* Conversion or Case Link */}
                {showConvert && (
                  <Card title="Convert to Loan Case" highlight>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {[
                        ['Admission verified', !!qualification?.admission_received],
                        ['Basic docs received', lead.stage === 'DOCS_RECEIVED'],
                        ['Loan eligibility ok', !!qualification?.coapp_income_paise],
                        ['Final doc confirmation', false],
                      ].map(([label, done]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <span style={{ color: done ? '#2e7d32' : '#bbb', fontWeight: 700 }}>{done ? '☑' : '□'}</span>
                          <span style={{ color: done ? '#333' : '#999' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setShowConvertModal(true)}
                      style={{ width: '100%', padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                      🎉 Create Loan Case
                    </button>
                  </Card>
                )}

                {mapping && (
                  <Card title="Loan Case">
                    <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#2e7d32', fontSize: 14 }}>✅ Case Created</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>Case ID: <strong>{mapping.case_id}</strong></div>
                      <div style={{ fontSize: 12, color: '#666' }}>By: {mapping.converted_by_staff_name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{formatDT(mapping.converted_at)}</div>
                      {onOpenCase && (
                        <button onClick={() => onOpenCase(mapping.case_id)} style={{ marginTop: 10, padding: '6px 14px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                          Open Case →
                        </button>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ── QUALIFICATION TAB ── */}
          {activeTab === 'qualify' && (
            <div style={{ maxWidth: 700 }}>
              <Card title="Quick Qualification Panel">
                {qualification ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Field label="Admission Received" value={qualification.admission_received ? '✅ Yes' : '❌ No'} />
                    <Field label="University"         value={qualification.university || '—'} />
                    <Field label="Country"            value={qualification.country || '—'} />
                    <Field label="Course"             value={qualification.course || '—'} />
                    <Field label="Loan Amount"        value={formatLoan(qualification.loan_amount_paise)} />
                    <Field label="Co-app Income"      value={formatLoan(qualification.coapp_income_paise)} />
                    <Field label="Collateral"         value={qualification.collateral_available ? '✅ Yes' : '❌ No'} />
                    <Field label="CIBIL Known"        value={qualification.cibil_known ? '✅ Yes' : '❌ No'} />
                    <Field label="Visa Urgency"       value={qualification.visa_urgency || '—'} />
                  </div>
                ) : (
                  <p style={{ color: '#999', fontSize: 13, marginBottom: 12 }}>No qualification data yet.</p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => setShowQualModal(true)} style={{ padding: '7px 16px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {qualification ? '✏️ Update Qualification' : '+ Fill Qualification'}
                  </button>
                  {!isLocked && lead.stage === 'CONNECTED' && (
                    <button onClick={async () => {
                      try { await leadsApi.markQualified(leadId); load(); toast.success('Marked as Qualified!'); }
                      catch (err) { toast.error(err.message); }
                    }} style={{ padding: '7px 16px', background: '#f57f17', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      ⭐ Mark as Qualified
                    </button>
                  )}
                </div>
                {lead.stage === 'QUALIFIED' && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#e0f7fa', borderRadius: 8, fontSize: 13, color: '#00695c', fontWeight: 600 }}>
                    💡 Suggest: Request Initial Documents?
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── TIMELINE TAB ── */}
          {activeTab === 'timeline' && (
            <div style={{ maxWidth: 700 }}>
              <Card title="Communication Timeline">
                {timeline.length === 0 ? (
                  <p style={{ color: '#999', fontSize: 13 }}>No activity yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {timeline.map((item, i) => {
                      const typeCfg = TIMELINE_ICONS[item.type] || { icon: '•', color: '#888' };
                      return (
                        <div key={item.id || i} style={{ display: 'flex', gap: 12, paddingBottom: 12, position: 'relative' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: typeCfg.color + '22', color: typeCfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                              {typeCfg.icon}
                            </div>
                            {i < timeline.length - 1 && <div style={{ width: 2, flex: 1, background: '#e0e0e0', marginTop: 4 }} />}
                          </div>
                          <div style={{ flex: 1, paddingTop: 4 }}>
                            <div style={{ fontSize: 13 }}>{item.note_text?.replace(/^\[[^\]]+\]\s*/, '')}</div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                              {item.staff_name || 'System'} · {formatDT(item.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <AddNoteInline leadId={leadId} onAdded={load} />
              </Card>
            </div>
          )}

          {/* ── CAMPAIGN DATA TAB ── */}
          {activeTab === 'campaign' && (
            <div style={{ maxWidth: 700 }}>
              <Card title="Campaign & Attribution Data">
                {(isMetaSrc || lead.meta_campaign_id || lead.utm_source) ? (
                  <>
                    <h5 style={{ fontSize: 12, color: '#1a237e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 12px' }}>Meta / Campaign IDs</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                      <Field label="Source Type"        value={SOURCE_LABELS[lead.lead_source_type] || lead.lead_source_type || '—'} />
                      <Field label="Source Reference ID" value={lead.source_reference_id || '—'} />
                      <Field label="Meta Campaign ID"   value={lead.meta_campaign_id || '—'} />
                      <Field label="Meta Adset ID"      value={lead.meta_adset_id || '—'} />
                      <Field label="Meta Ad ID"         value={lead.meta_ad_id || '—'} />
                      <Field label="Meta Form ID"       value={lead.meta_form_id || '—'} />
                    </div>
                    {(lead.utm_source || lead.utm_campaign || lead.utm_medium) && (
                      <>
                        <h5 style={{ fontSize: 12, color: '#1a237e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 12px' }}>UTM Parameters</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Field label="UTM Source"   value={lead.utm_source || '—'} />
                          <Field label="UTM Campaign" value={lead.utm_campaign || '—'} />
                          <Field label="UTM Medium"   value={lead.utm_medium || '—'} />
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ color: '#999', fontSize: 13 }}>
                    No campaign / attribution data for this lead.
                    {lead.campaign_name && <div style={{ marginTop: 8 }}><Field label="Campaign Name" value={lead.campaign_name} /></div>}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── ADMISSION SYNC TAB (conditional) ── */}
          {activeTab === 'admission' && (
            <div style={{ maxWidth: 700 }}>
              <Card title="Admission CRM Sync">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Admission Case ID"   value={lead.admission_case_id || '—'} />
                  <Field label="Sync Status"         value={lead.admission_sync_status || '—'} />
                  <Field label="Lead Source Type"    value={SOURCE_LABELS[lead.lead_source_type] || lead.lead_source_type || '—'} />
                </div>
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#e8f5e9', borderRadius: 8, fontSize: 13, color: '#2e7d32' }}>
                  ✅ This lead was synced from the Admission CRM system.
                  {lead.admission_case_id && <div>Linked case: <strong>{lead.admission_case_id}</strong></div>}
                </div>
              </Card>
            </div>
          )}

          {/* ── EVENT INFO TAB (conditional) ── */}
          {activeTab === 'event' && (
            <div style={{ maxWidth: 700 }}>
              <Card title="Event Registration Info">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Event Registration ID" value={lead.event_registration_id || '—'} />
                  <Field label="Lead Source Type"      value={SOURCE_LABELS[lead.lead_source_type] || lead.lead_source_type || '—'} />
                </div>
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#ede7f6', borderRadius: 8, fontSize: 13, color: '#512da8' }}>
                  🎟️ This lead registered via an event.
                </div>
              </Card>
            </div>
          )}

          {/* ── FOLLOWUPS TAB ── */}
          {activeTab === 'followups' && (
            <div style={{ maxWidth: 700 }}>
              <Card title="Scheduled Follow-ups">
                {followups.filter(f => f.status === 'SCHEDULED').length === 0 ? (
                  <p style={{ color: '#999', fontSize: 13, marginBottom: 12 }}>No follow-ups scheduled.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {followups.filter(f => f.status === 'SCHEDULED').map(f => {
                      const isPast = new Date(f.scheduled_at) < new Date();
                      return (
                        <div key={f.id} style={{ background: isPast ? '#fff5f5' : '#f5f6fa', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', border: `1px solid ${isPast ? '#ef9a9a' : '#e0e0e0'}` }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: isPast ? '#c62828' : '#1a237e' }}>{f.type} {isPast ? '— OVERDUE' : ''}</div>
                            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{new Date(f.scheduled_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                            {f.note && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{f.note}</div>}
                          </div>
                          <button onClick={async () => {
                            try { await leadsApi.completeFollowup(leadId, f.id); load(); toast.success('Follow-up completed'); }
                            catch (err) { toast.error(err.message); }
                          }} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', background: '#fff' }}>
                            ✓ Done
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {followups.filter(f => f.status === 'COMPLETED').length > 0 && (
                  <>
                    <h5 style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', margin: '16px 0 8px' }}>Completed</h5>
                    {followups.filter(f => f.status === 'COMPLETED').slice(-3).map(f => (
                      <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 12, color: '#888' }}>
                        <span style={{ color: '#2e7d32' }}>✅</span>
                        <span>{f.type}</span>
                        <span>·</span>
                        <span>{formatDT(f.scheduled_at)}</span>
                      </div>
                    ))}
                  </>
                )}

                <button onClick={() => setShowFollowupModal(true)}
                  style={{ marginTop: 16, padding: '9px 20px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  📅 + Add Follow-up
                </button>
              </Card>
            </div>
          )}

          {/* ── CASE LINK TAB ── */}
          {activeTab === 'case' && (
            <div style={{ maxWidth: 700 }}>
              {mapping ? (
                <Card title="Linked Loan Case">
                  <div style={{ background: '#e8f5e9', borderRadius: 10, padding: 20 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#2e7d32', marginBottom: 8 }}>✅ Case Created</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="Case ID"         value={mapping.case_id} />
                      <Field label="Converted By"    value={mapping.converted_by_staff_name} />
                      <Field label="Converted At"    value={formatDT(mapping.converted_at)} />
                    </div>
                    {onOpenCase && (
                      <button onClick={() => onOpenCase(mapping.case_id)} style={{ marginTop: 16, padding: '9px 24px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                        Open Loan Case →
                      </button>
                    )}
                  </div>
                </Card>
              ) : (
                <Card title="Convert to Loan Case" highlight={showConvert}>
                  {showConvert ? (
                    <>
                      <div style={{ fontSize: 13, color: '#333', marginBottom: 14 }}>This lead is ready to be converted into a Loan Case.</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {[
                          ['Admission verified', !!qualification?.admission_received],
                          ['Basic docs received', lead.stage === 'DOCS_RECEIVED'],
                          ['Loan eligibility ok', !!qualification?.coapp_income_paise],
                          ['Final doc confirmation', false],
                        ].map(([label, done]) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <span style={{ color: done ? '#2e7d32' : '#bbb', fontWeight: 700 }}>{done ? '☑' : '□'}</span>
                            <span style={{ color: done ? '#333' : '#999' }}>{label}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setShowConvertModal(true)}
                        style={{ width: '100%', padding: '12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                        🎉 Create Loan Case
                      </button>
                    </>
                  ) : (
                    <div style={{ color: '#999', fontSize: 13 }}>
                      Lead must be in <strong>QUALIFIED</strong> or <strong>DOCS_RECEIVED</strong> stage to convert to a case.
                      <br /><br />
                      Current stage: <StageBadge stage={lead.stage} />
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {showCallModal     && <CallModal      leadId={leadId} onClose={() => setShowCallModal(false)}     onDone={() => { setShowCallModal(false);     load(); }} />}
      {showFollowupModal && <FollowupModal  leadId={leadId} onClose={() => setShowFollowupModal(false)} onDone={() => { setShowFollowupModal(false); load(); }} />}
      {showConvertModal  && <ConvertModal   leadId={leadId} lead={lead} onClose={() => setShowConvertModal(false)} onDone={(caseId) => { setShowConvertModal(false); load(); if (onOpenCase) onOpenCase(caseId); }} />}
      {showEditModal     && <EditLeadModal  lead={lead} onClose={() => setShowEditModal(false)} onDone={() => { setShowEditModal(false); load(); }} />}
      {showQualModal     && <QualificationModal leadId={leadId} existing={qualification} onClose={() => setShowQualModal(false)} onDone={() => { setShowQualModal(false); load(); }} />}
      {showStageModal    && <StageModal     leadId={leadId} currentStage={lead.stage} onClose={() => setShowStageModal(false)} onDone={() => { setShowStageModal(false); load(); }} />}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, children, highlight }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 18, boxShadow: highlight ? '0 2px 8px rgba(46,125,50,0.15)' : '0 1px 4px rgba(0,0,0,0.07)', border: highlight ? '1.5px solid #a5d6a7' : 'none' }}>
      <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1a237e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</h4>
      {children}
    </div>
  );
}

// ─── Inline note adder ────────────────────────────────────────────────────────
function AddNoteInline({ leadId, onAdded }) {
  const [text, setText]     = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try { await leadsApi.addNote(leadId, text); setText(''); onAdded(); toast.success('Note added'); }
    catch (err) { toast.error(err.message); }
    setSaving(false);
  };
  return (
    <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a note…"
        style={{ flex: 1, padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13 }}
        onKeyDown={e => e.key === 'Enter' && submit()} />
      <button onClick={submit} disabled={saving}
        style={{ padding: '8px 16px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
        {saving ? '…' : 'Add'}
      </button>
    </div>
  );
}

const inputStyle   = { width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 7, fontSize: 13, marginBottom: 10, boxSizing: 'border-box' };
const labelStyle   = { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 };
const btnPrimary   = { padding: '9px 20px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 };
const btnSecondary = { padding: '9px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 13 };

// ─── Call Modal ───────────────────────────────────────────────────────────────
function CallModal({ leadId, onClose, onDone }) {
  const [form, setForm] = useState({ call_status: 'ATTEMPTED', duration_seconds: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await leadsApi.logCall(leadId, { ...form, duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null });
      toast.success('Call logged');
      onDone();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  return (
    <ModalWrap title="Log Call" onClose={onClose}>
      <label style={labelStyle}>Call Status</label>
      <select style={inputStyle} value={form.call_status} onChange={e => setForm(f => ({...f, call_status: e.target.value}))}>
        <option value="ATTEMPTED">Attempted (No Answer)</option>
        <option value="CONNECTED">Connected</option>
        <option value="VOICEMAIL">Voicemail Left</option>
        <option value="BUSY">Busy</option>
      </select>
      <label style={labelStyle}>Duration (seconds)</label>
      <input style={inputStyle} type="number" value={form.duration_seconds} onChange={e => setForm(f => ({...f, duration_seconds: e.target.value}))} placeholder="120" />
      <label style={labelStyle}>Notes</label>
      <textarea style={{...inputStyle, height: 70}} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Call summary…" />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={submit} disabled={saving} style={btnPrimary}>{saving ? '…' : 'Log Call'}</button>
      </div>
    </ModalWrap>
  );
}

// ─── Follow-up Modal ──────────────────────────────────────────────────────────
function FollowupModal({ leadId, onClose, onDone }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setMinutes(0, 0, 0);
  const [form, setForm] = useState({ type: 'CALL', scheduled_at: tomorrow.toISOString().slice(0, 16), note: '' });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.scheduled_at) return toast.error('Please set date/time');
    setSaving(true);
    try {
      await leadsApi.setFollowup(leadId, { ...form, scheduled_at: new Date(form.scheduled_at).toISOString() });
      toast.success('Follow-up scheduled');
      onDone();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  return (
    <ModalWrap title="Schedule Follow-up" onClose={onClose}>
      <label style={labelStyle}>Type</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {['CALL','WHATSAPP','EMAIL','REMINDER'].map(t => (
          <button key={t} onClick={() => setForm(f => ({...f, type: t}))}
            style={{ flex: 1, padding: '7px 4px', border: `1.5px solid ${form.type === t ? '#1a237e' : '#ddd'}`, background: form.type === t ? '#e8eaf6' : '#fff', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: form.type === t ? 700 : 400 }}>
            {t}
          </button>
        ))}
      </div>
      <label style={labelStyle}>Date & Time</label>
      <input style={inputStyle} type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({...f, scheduled_at: e.target.value}))} />
      <label style={labelStyle}>Notes</label>
      <input style={inputStyle} value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} placeholder="Call after documents uploaded…" />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={submit} disabled={saving} style={btnPrimary}>{saving ? '…' : 'Save Follow-up'}</button>
      </div>
    </ModalWrap>
  );
}

// ─── Qualification Modal ──────────────────────────────────────────────────────
function QualificationModal({ leadId, existing, onClose, onDone }) {
  const [form, setForm] = useState({
    admission_received:  existing?.admission_received ?? false,
    university:          existing?.university || '',
    country:             existing?.country || '',
    course:              existing?.course || '',
    loan_amount_paise:   existing?.loan_amount_paise ? existing.loan_amount_paise / 100 : '',
    coapp_income_paise:  existing?.coapp_income_paise ? existing.coapp_income_paise / 100 : '',
    collateral_available: existing?.collateral_available ?? false,
    cibil_known:         existing?.cibil_known ?? false,
    visa_urgency:        existing?.visa_urgency || 'NORMAL',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const submit = async () => {
    setSaving(true);
    try {
      await leadsApi.saveQualification(leadId, {
        ...form,
        loan_amount_paise:  form.loan_amount_paise  ? Math.round(parseFloat(form.loan_amount_paise)  * 100) : null,
        coapp_income_paise: form.coapp_income_paise ? Math.round(parseFloat(form.coapp_income_paise) * 100) : null,
      });
      toast.success('Qualification saved');
      onDone();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  return (
    <ModalWrap title="Quick Qualification Panel" onClose={onClose}>
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <input type="checkbox" checked={form.admission_received} onChange={e => set('admission_received', e.target.checked)} id="adm" />
          <label htmlFor="adm" style={{ fontSize: 13, fontWeight: 600 }}>Admission Received?</label>
        </div>
        <label style={labelStyle}>University</label>
        <input style={inputStyle} value={form.university} onChange={e => set('university', e.target.value)} placeholder="Coventry University" />
        <label style={labelStyle}>Country</label>
        <input style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)} />
        <label style={labelStyle}>Course</label>
        <input style={inputStyle} value={form.course} onChange={e => set('course', e.target.value)} />
        <label style={labelStyle}>Loan Amount (₹)</label>
        <input style={inputStyle} type="number" value={form.loan_amount_paise} onChange={e => set('loan_amount_paise', e.target.value)} placeholder="2500000" />
        <label style={labelStyle}>Co-app Income (₹ approx)</label>
        <input style={inputStyle} type="number" value={form.coapp_income_paise} onChange={e => set('coapp_income_paise', e.target.value)} placeholder="900000" />
        <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.collateral_available} onChange={e => set('collateral_available', e.target.checked)} /> Collateral?
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.cibil_known} onChange={e => set('cibil_known', e.target.checked)} /> CIBIL Known?
          </label>
        </div>
        <label style={labelStyle}>Visa Urgency</label>
        <select style={inputStyle} value={form.visa_urgency} onChange={e => set('visa_urgency', e.target.value)}>
          <option value="NORMAL">Normal</option>
          <option value="URGENT">Urgent</option>
          <option value="VERY_URGENT">Very Urgent</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={submit} disabled={saving} style={btnPrimary}>{saving ? '…' : 'Save Qualification'}</button>
      </div>
    </ModalWrap>
  );
}

// ─── Convert Modal ────────────────────────────────────────────────────────────
function ConvertModal({ leadId, lead, onClose, onDone }) {
  const [form, setForm] = useState({ branch_id: '', case_owner_id: '', student_phone: lead.phone_e164 || '', student_email: lead.email || '' });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const result = await leadsApi.convert(leadId, form);
      toast.success(`Loan Case ${result.case_id} created!`);
      onDone(result.case_id);
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  return (
    <ModalWrap title="Create Loan Case" onClose={onClose}>
      <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
        <strong>{lead.full_name}</strong> · {lead.country || ''} · {lead.course || ''}
      </div>
      <label style={labelStyle}>Select Branch</label>
      <select style={inputStyle} value={form.branch_id} onChange={e => setForm(f => ({...f, branch_id: e.target.value}))}>
        <option value="">Select branch…</option>
        <option value="SBI">SBI</option><option value="HDFC">HDFC</option><option value="ICICI">ICICI</option>
        <option value="AXIS">Axis Bank</option><option value="UNION">Union Bank</option><option value="BOB">Bank of Baroda</option>
      </select>
      <label style={labelStyle}>Confirm Student Phone</label>
      <input style={inputStyle} value={form.student_phone} onChange={e => setForm(f => ({...f, student_phone: e.target.value}))} />
      <label style={labelStyle}>Confirm Student Email</label>
      <input style={inputStyle} type="email" value={form.student_email} onChange={e => setForm(f => ({...f, student_email: e.target.value}))} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={submit} disabled={saving} style={{...btnPrimary, background: '#2e7d32'}}>
          {saving ? '…' : '✓ Confirm & Create Case'}
        </button>
      </div>
    </ModalWrap>
  );
}

// ─── Stage Modal ──────────────────────────────────────────────────────────────
function StageModal({ leadId, currentStage, onClose, onDone }) {
  const VALID_NEXT = {
    NEW:               ['CONTACT_ATTEMPTED', 'DROPPED', 'LOST', 'DUPLICATE'],
    CONTACT_ATTEMPTED: ['CONNECTED', 'DROPPED', 'LOST', 'DUPLICATE'],
    CONNECTED:         ['QUALIFIED', 'DROPPED', 'LOST', 'DUPLICATE'],
    QUALIFIED:         ['DOCS_REQUESTED', 'DROPPED', 'LOST', 'DUPLICATE'],
    DOCS_REQUESTED:    ['DOCS_RECEIVED', 'DROPPED', 'LOST', 'DUPLICATE'],
    DOCS_RECEIVED:     ['CASE_CREATED', 'DROPPED', 'LOST', 'DUPLICATE'],
  };
  const options = VALID_NEXT[currentStage] || [];
  const [stage, setStage]   = useState(options[0] || '');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!stage) return;
    setSaving(true);
    try {
      await leadsApi.updateLead(leadId, { stage });
      toast.success(`Stage updated to ${stage}`);
      onDone();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  if (options.length === 0) return (
    <ModalWrap title="Change Stage" onClose={onClose}>
      <p style={{ color: '#666', fontSize: 13 }}>No further stage transitions from <strong>{currentStage}</strong>.</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onClose} style={btnSecondary}>Close</button>
      </div>
    </ModalWrap>
  );
  return (
    <ModalWrap title="Change Stage" onClose={onClose}>
      <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>Current: <StageBadge stage={currentStage} /></p>
      <label style={labelStyle}>Move to:</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {options.map(s => {
          const cfg = STAGE_COLORS[s] || { color: '#666', bg: '#f5f5f5' };
          return (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `2px solid ${stage === s ? cfg.color : '#e0e0e0'}`, borderRadius: 8, cursor: 'pointer', background: stage === s ? cfg.bg : '#fff' }}>
              <input type="radio" name="stage" value={s} checked={stage === s} onChange={() => setStage(s)} />
              <StageBadge stage={s} />
            </label>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={submit} disabled={saving || !stage} style={btnPrimary}>{saving ? '…' : 'Update Stage'}</button>
      </div>
    </ModalWrap>
  );
}

// ─── Edit Lead Modal ──────────────────────────────────────────────────────────
function EditLeadModal({ lead, onClose, onDone }) {
  const [form, setForm] = useState({
    full_name:         lead.full_name,
    phone_e164:        lead.phone_e164,
    email:             lead.email || '',
    city:              lead.city || '',
    country:           lead.country || '',
    course:            lead.course || '',
    intake:            lead.intake || '',
    loan_amount_paise: lead.loan_amount_paise ? lead.loan_amount_paise / 100 : '',
    priority:          lead.priority,
    intent_score:      lead.intent_score != null ? lead.intent_score : 50,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const submit = async () => {
    setSaving(true);
    try {
      const data = { ...form, loan_amount_paise: form.loan_amount_paise ? Math.round(parseFloat(form.loan_amount_paise) * 100) : null, intent_score: parseInt(form.intent_score) || 50 };
      await leadsApi.updateLead(lead.id, data);
      toast.success('Lead updated');
      onDone();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  return (
    <ModalWrap title="Edit Lead" onClose={onClose}>
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <label style={labelStyle}>Full Name</label><input style={inputStyle} value={form.full_name} onChange={e => set('full_name', e.target.value)} />
        <label style={labelStyle}>Phone (E.164)</label><input style={inputStyle} value={form.phone_e164} onChange={e => set('phone_e164', e.target.value)} />
        <label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        <label style={labelStyle}>City</label><input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} />
        <label style={labelStyle}>Country</label>
        <select style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)}>
          <option value="">Select…</option><option>UK</option><option>USA</option><option>Canada</option><option>Australia</option><option>Ireland</option><option>Germany</option>
        </select>
        <label style={labelStyle}>Course</label><input style={inputStyle} value={form.course} onChange={e => set('course', e.target.value)} />
        <label style={labelStyle}>Intake</label><input style={inputStyle} value={form.intake} onChange={e => set('intake', e.target.value)} />
        <label style={labelStyle}>Loan Amount (₹)</label><input style={inputStyle} type="number" value={form.loan_amount_paise} onChange={e => set('loan_amount_paise', e.target.value)} />
        <label style={labelStyle}>Priority</label>
        <select style={inputStyle} value={form.priority} onChange={e => set('priority', e.target.value)}>
          <option>NORMAL</option><option>HIGH</option><option>URGENT</option>
        </select>
        <label style={labelStyle}>Intent Score (0–100)</label>
        <input style={inputStyle} type="number" min="0" max="100" value={form.intent_score} onChange={e => set('intent_score', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={submit} disabled={saving} style={btnPrimary}>{saving ? '…' : 'Save Changes'}</button>
      </div>
    </ModalWrap>
  );
}
