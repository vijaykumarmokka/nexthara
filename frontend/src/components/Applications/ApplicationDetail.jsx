import { useEffect, useState, useCallback, useRef } from 'react';
import { api, documentsApi, packsApi, usersApi, crmApi } from '../../api';
import {
  STATUS_CONFIG, SUB_STATUS_MAP, SLA_THRESHOLD_BY_STATUS,
  CLOSE_REASON_CODES, DOC_CHECKLIST,
  formatCurrency, formatDateTime, formatDate,
} from '../../constants';
import StatusBadge from '../Common/StatusBadge';
import AwaitingPill from '../Common/AwaitingPill';
import SLATag from '../Common/SLATag';
import PriorityDot from '../Common/PriorityDot';
import BankLogo from '../Common/BankLogo';
import FollowUpPanel from '../Communication/FollowUpPanel';
import ProfileTab from './ProfileTab';
import ChecklistTab from './ChecklistTab';
import toast from 'react-hot-toast';

// ─── PRINT / PACK GENERATOR ──────────────────────────────────────
function generatePackHTML(app, docs = []) {
  const fmt = v => v || '—';
  const curr = v => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
  const date = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  return `<!DOCTYPE html>
<html><head><title>Application Pack — ${app.id}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 32px; font-size: 13px; color: #212121; }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a237e; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 900; color: #1a237e; }
  .hdr-right { text-align: right; font-size: 12px; color: #666; }
  h2 { color: #1565c0; font-size: 15px; margin: 20px 0 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .field { padding: 7px 12px 7px 0; border-bottom: 1px solid #f5f5f5; }
  .lbl { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.4px; }
  .val { font-weight: 600; color: #1a1a1a; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
  th { background: #e8eaf6; padding: 7px 10px; text-align: left; font-size: 11px; color: #1a237e; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; background: #e3f2fd; color: #1565c0; }
  .footer { margin-top: 32px; border-top: 1px solid #e0e0e0; padding-top: 8px; font-size: 10px; color: #aaa; text-align: center; }
  @media print { body { padding: 0; } }
</style></head>
<body>
<div class="hdr">
  <div><div class="logo">NEXTHARA</div><div style="font-size:12px;color:#666;margin-top:4px">Education Loan Management Platform</div></div>
  <div class="hdr-right">
    <div class="badge">${app.id}</div>
    <div style="margin-top:6px">Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    <div>Status: <strong>${(app.status || '').replace(/_/g, ' ')}</strong></div>
  </div>
</div>
<h1 style="margin:0 0 4px;font-size:18px;color:#1a237e">${fmt(app.student_name)}</h1>
<div style="font-size:12px;color:#555;margin-bottom:20px">${fmt(app.student_email)} &nbsp;·&nbsp; ${fmt(app.student_phone)} &nbsp;·&nbsp; ${fmt(app.bank)}</div>

<h2>Student &amp; Academic Details</h2>
<div class="grid">
  <div class="field"><div class="lbl">University</div><div class="val">${fmt(app.university)}</div></div>
  <div class="field"><div class="lbl">Course</div><div class="val">${fmt(app.course)}</div></div>
  <div class="field"><div class="lbl">Country</div><div class="val">${fmt(app.country)}</div></div>
  <div class="field"><div class="lbl">Intake</div><div class="val">${fmt(app.intake)}</div></div>
  <div class="field"><div class="lbl">Collateral</div><div class="val">${fmt(app.collateral)}</div></div>
  <div class="field"><div class="lbl">Loan Type</div><div class="val">${fmt(app.loan_type)}</div></div>
</div>

<h2>Loan Details</h2>
<div class="grid">
  <div class="field"><div class="lbl">Lender / Bank</div><div class="val">${fmt(app.bank)}</div></div>
  <div class="field"><div class="lbl">Bank App Ref</div><div class="val">${fmt(app.bank_application_ref)}</div></div>
  <div class="field"><div class="lbl">Loan Requested</div><div class="val">${curr(app.loan_amount_requested)}</div></div>
  ${app.sanction_amount ? `
  <div class="field"><div class="lbl">Sanction Amount</div><div class="val">${curr(app.sanction_amount)}</div></div>
  <div class="field"><div class="lbl">ROI</div><div class="val">${app.roi ? app.roi + '%' : '—'}</div></div>
  <div class="field"><div class="lbl">Tenure</div><div class="val">${app.tenure ? app.tenure + ' months' : '—'}</div></div>
  <div class="field"><div class="lbl">Processing Fee</div><div class="val">${app.processing_fee ? app.processing_fee + '%' : '—'}</div></div>
  <div class="field"><div class="lbl">Margin</div><div class="val">${app.margin_percent ? app.margin_percent + '%' : '—'}</div></div>
  ` : '<div class="field"><div class="lbl">Sanction</div><div class="val">Not yet sanctioned</div></div>'}
</div>

<h2>Current Status</h2>
<div class="grid">
  <div class="field"><div class="lbl">Status</div><div class="val">${(app.status || '').replace(/_/g, ' ')}</div></div>
  <div class="field"><div class="lbl">Awaiting From</div><div class="val">${fmt(app.awaiting_from)}</div></div>
  <div class="field"><div class="lbl">Priority</div><div class="val">${fmt(app.priority)}</div></div>
  <div class="field"><div class="lbl">SLA Days Open</div><div class="val">${app.sla_days != null ? app.sla_days + ' days' : '—'}</div></div>
  <div class="field"><div class="lbl">Case Created</div><div class="val">${date(app.created_at)}</div></div>
  <div class="field"><div class="lbl">Last Updated</div><div class="val">${date(app.updated_at)}</div></div>
</div>

${docs.length > 0 ? `
<h2>Documents (${docs.length} total)</h2>
<table>
<thead><tr><th>Document</th><th>Category</th><th>Status</th><th>Owner</th><th>Uploaded</th></tr></thead>
<tbody>
${docs.map(d => `<tr><td>${d.doc_name}${d.label ? ` (${d.label})` : ''}</td><td>${d.doc_category}</td><td>${d.status}</td><td>${d.owner || '—'}</td><td>${date(d.uploaded_at)}</td></tr>`).join('')}
</tbody></table>` : ''}

${app.history && app.history.length > 0 ? `
<h2>Status History (last ${Math.min(app.history.length, 10)})</h2>
<table>
<thead><tr><th>Date</th><th>Status</th><th>Awaiting</th><th>By</th><th>Notes</th></tr></thead>
<tbody>
${app.history.slice(0, 10).map(h => `<tr><td>${date(h.created_at)}</td><td>${(h.status || '').replace(/_/g, ' ')}</td><td>${h.awaiting_from || '—'}</td><td>${h.changed_by || '—'}</td><td style="max-width:200px;word-break:break-word">${(h.notes || '—').substring(0, 100)}</td></tr>`).join('')}
</tbody></table>` : ''}

<div class="footer">Generated by Nexthara Dashboard · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · Confidential — for internal use only</div>
</body></html>`;
}

// ─── BANK TYPE MAP ────────────────────────────────────────────────
const BANK_TYPE_MAP = {
  SBI: 'PSU', PNB: 'PSU', 'Bank of Baroda': 'PSU', 'Canara Bank': 'PSU', 'Union Bank': 'PSU',
  HDFC: 'Private', ICICI: 'Private', 'Axis Bank': 'Private', 'IDFC First': 'Private', Kotak: 'Private',
  'Prodigy Finance': 'Intl', MPOWER: 'Intl',
  Credila: 'NBFC', Avanse: 'NBFC', InCred: 'NBFC',
};

const BANK_TYPE_COLOR = {
  PSU:     { bg: '#eff6ff', color: '#1d4ed8', label: 'PSU' },
  NBFC:    { bg: '#faf5ff', color: '#7c3aed', label: 'NBFC' },
  Intl:    { bg: '#f0fdf4', color: '#15803d', label: 'Intl' },
  Private: { bg: '#f9fafb', color: '#4b5563', label: 'Pvt' },
};

// ─── STATUS GROUPS (for grouped dropdowns) ───────────────────────
const STATUS_GROUP = {
  'Pre-Login':  ['NOT_CONNECTED', 'CONTACTED', 'YET_TO_CONNECT'],
  'Login':      ['LOGIN_SUBMITTED', 'LOGIN_IN_PROGRESS', 'LOGIN_REJECTED', 'DUPLICATE_LOGIN'],
  'Documents':  ['DOCS_PENDING', 'DOCS_SUBMITTED', 'DOCS_VERIFICATION'],
  'Credit':     ['UNDER_REVIEW', 'CREDIT_CHECK_IN_PROGRESS', 'FIELD_VERIFICATION', 'QUERY_RAISED'],
  'Decision':   ['CONDITIONAL_SANCTION', 'SANCTIONED', 'REJECTED'],
  'Post':       ['SANCTION_ACCEPTED', 'AGREEMENT_SIGNED', 'DISBURSEMENT_PENDING', 'DISBURSED'],
  'Closed':     ['CLOSED', 'DROPPED', 'EXPIRED'],
};

// ─── TAB DEFINITIONS ─────────────────────────────────────────────
const TABS = [
  { key: 'overview',      label: 'Overview',        icon: 'fa-th-large' },
  { key: 'profile',       label: 'Profile',          icon: 'fa-user' },
  { key: 'checklist',     label: 'Checklist',        icon: 'fa-check-square' },
  { key: 'lenders',       label: 'Bank Apps',        icon: 'fa-university' },
  { key: 'documents',     label: 'Documents',        icon: 'fa-folder-open' },
  { key: 'queries',       label: 'Queries',          icon: 'fa-question-circle' },
  { key: 'pack-history',  label: 'Pack History',     icon: 'fa-box' },
  { key: 'timeline',      label: 'Timeline',         icon: 'fa-history' },
  { key: 'tasks',         label: 'Tasks / Notes',    icon: 'fa-tasks' },
  { key: 'followup',      label: 'Follow-up',        icon: 'fa-bell' },
  { key: 'close',         label: 'Close / Outcome',  icon: 'fa-flag-checkered' },
];

// ─── SLA HELPER ──────────────────────────────────────────────────
function getSLAState(app) {
  if (!app || app.sla_days == null || app.awaiting_from !== 'Bank') return 'ok';
  const max = SLA_THRESHOLD_BY_STATUS[app.status];
  if (!max) return 'ok';
  const ratio = app.sla_days / max;
  if (ratio >= 1) return 'breach';
  if (ratio >= 0.7) return 'warning';
  return 'ok';
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export default function ApplicationDetail({ appId, onClose, onUpdated }) {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadApp = useCallback(() => {
    if (!appId) return;
    setLoading(true);
    api.getApplication(appId)
      .then(data => { setApp(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [appId]);

  useEffect(() => { loadApp(); }, [loadApp]);

  const handleUpdated = useCallback(() => { loadApp(); onUpdated?.(); }, [loadApp, onUpdated]);

  const handleGeneratePack = useCallback(async (sentVia = 'Print', sentTo = '') => {
    if (!app) return;
    let docs = [];
    try { docs = await documentsApi.getDocuments(app.id); } catch {}
    const html = generatePackHTML(app, docs);
    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) { toast.error('Allow popups to generate pack'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
    try {
      await packsApi.createPack(app.id, { sent_via: sentVia, sent_to: sentTo });
      handleUpdated();
    } catch {}
    toast.success('Pack generated!', { icon: '📦' });
  }, [app, handleUpdated]);

  const handleWhatsAppUpdate = useCallback(async () => {
    if (!app) return;
    const phone = (app.student_phone || '').replace(/\D/g, '');
    if (!phone) { toast.error('No phone number on file for this student'); return; }
    const statusLabel = app.status?.replace(/_/g, ' ') || 'Under Review';
    const text = encodeURIComponent(
      `Hi ${app.student_name}, this is an update on your education loan application with ${app.bank}.\n\nCurrent status: ${statusLabel}\nAwaiting: ${app.awaiting_from || '—'}\n\nPlease reach out if you have any questions. – Nexthara Team`
    );
    const dialCode = phone.startsWith('91') ? '' : '91';
    window.open(`https://wa.me/${dialCode}${phone}?text=${text}`, '_blank');
    // Log the WhatsApp outreach to the timeline
    try {
      await api.updateApplication(app.id, {
        notes: `[WHATSAPP] Status update sent to student (${phone}) — status: ${statusLabel}`,
      });
      handleUpdated();
    } catch (_) {}
  }, [app, handleUpdated]);

  // Keyboard hotkeys: A=Add Lender, D=Documents, P=Pack, S=search, Esc=close
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'a' || e.key === 'A') { setActiveTab('lenders'); toast('⌨ A → Lenders tab', { duration: 1200 }); }
      if (e.key === 'd' || e.key === 'D') { setActiveTab('documents'); toast('⌨ D → Documents tab', { duration: 1200 }); }
      if (e.key === 'p' || e.key === 'P') { handleGeneratePack(); }
      if (e.key === 'q' || e.key === 'Q') { setActiveTab('queries'); toast('⌨ Q → Queries tab', { duration: 1200 }); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, handleGeneratePack]);

  if (!appId) return null;

  return (
    <div className="cw-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cw-workspace">

        {/* STICKY HEADER */}
        <CWHeader app={app} loading={loading} onClose={onClose} onTabChange={setActiveTab} onGeneratePack={handleGeneratePack} onWhatsApp={handleWhatsAppUpdate} />

        {/* TAB BAR */}
        <div className="cw-tabbar">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`cw-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <i className={`fas ${t.icon}`}></i>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* HOTKEY HINT */}
        <div className="cw-hotkey-bar">
          <span className="cw-hotkey"><kbd>A</kbd> Lenders</span>
          <span className="cw-hotkey"><kbd>D</kbd> Docs</span>
          <span className="cw-hotkey"><kbd>Q</kbd> Queries</span>
          <span className="cw-hotkey"><kbd>P</kbd> Pack</span>
          <span className="cw-hotkey"><kbd>Esc</kbd> Close</span>
        </div>

        {/* TAB BODY */}
        <div className="cw-body">
          {loading ? (
            <div className="cw-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading case workspace…</p>
            </div>
          ) : !app ? (
            <div className="cw-loading"><p>Application not found</p></div>
          ) : (
            <>
              {activeTab === 'overview'     && <OverviewTab     app={app} onTabChange={setActiveTab} onUpdated={handleUpdated} />}
              {activeTab === 'profile'      && <ProfileTab      app={app} onUpdated={handleUpdated} />}
              {activeTab === 'checklist'    && <ChecklistTab    app={app} />}
              {activeTab === 'lenders'      && <LendersTab      app={app} onUpdated={handleUpdated} />}
              {activeTab === 'documents'    && <DocumentsTab    app={app} onUpdated={handleUpdated} onTabChange={setActiveTab} />}
              {activeTab === 'queries'      && <QueriesTab      app={app} onTabChange={setActiveTab} onUpdated={handleUpdated} />}
              {activeTab === 'pack-history' && <PackHistoryTab  app={app} onGeneratePack={handleGeneratePack} />}
              {activeTab === 'timeline'     && <TimelineTab     app={app} />}
              {activeTab === 'tasks'        && <TasksTab        app={app} />}
              {activeTab === 'followup'     && (
                <div style={{ padding: '16px 0' }}>
                  <FollowUpPanel appId={app.id} app={app} />
                </div>
              )}
              {activeTab === 'close'        && <CloseTab        app={app} onClose={onClose} onUpdated={handleUpdated} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── STICKY HEADER ───────────────────────────────────────────────
function CWHeader({ app, loading, onClose, onTabChange, onGeneratePack, onWhatsApp }) {
  const [show3dot, setShow3dot] = useState(false);
  const menuRef = useRef(null);

  const copy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShow3dot(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const stageColor = app ? (STATUS_CONFIG[app.status]?.color || 'grey') : 'grey';
  const stageLabel = app ? (STATUS_CONFIG[app.status]?.stageLabel || '—') : '—';
  const hasCollateral = app?.collateral && app.collateral !== 'NA' && app.collateral !== 'na';

  return (
    <div className="cw-header">
      {/* Left: Identity */}
      <div className="cw-header-left">
        <div className="cw-student-name">
          {loading ? '…' : (app?.student_name || '—')}
        </div>
        <div className="cw-header-meta">
          {app?.student_email && (
            <span className="cw-meta-chip" onClick={() => copy(app.student_email, 'Email')} title="Copy email">
              <i className="fas fa-envelope"></i> {app.student_email}
            </span>
          )}
          {app?.student_phone && (
            <span className="cw-meta-chip" onClick={() => copy(app.student_phone, 'Phone')} title="Copy phone">
              <i className="fas fa-phone"></i> {app.student_phone}
            </span>
          )}
          {app?.id && (
            <span className="cw-meta-chip" onClick={() => copy(app.id, 'Case Ref')} title="Copy Case Ref">
              <i className="fas fa-hashtag"></i> {app.id}
            </span>
          )}
          {app?.bank_application_ref && (
            <span className="cw-meta-chip" onClick={() => copy(app.bank_application_ref, 'Bank Ref')} title="Copy Bank Ref">
              <i className="fas fa-id-badge"></i> {app.bank_application_ref}
            </span>
          )}
        </div>
      </div>

      {/* Middle: Summary chips */}
      <div className="cw-header-chips">
        {app?.university && <span className="cw-chip">{app.university}</span>}
        {app?.course     && <span className="cw-chip">{app.course}</span>}
        {app?.country    && (
          <span className="cw-chip cw-chip-blue">
            <i className="fas fa-globe" style={{ fontSize: 10 }}></i> {app.country}
          </span>
        )}
        {app?.intake     && (
          <span className="cw-chip">
            <i className="fas fa-calendar-alt" style={{ fontSize: 10 }}></i> {app.intake}
          </span>
        )}
        {hasCollateral && (
          <span className="cw-chip cw-chip-amber">
            <i className="fas fa-home" style={{ fontSize: 10 }}></i> {app.collateral}
          </span>
        )}
        {app?.loan_amount_requested && (
          <span className="cw-chip">
            <i className="fas fa-rupee-sign" style={{ fontSize: 10 }}></i> Req: {formatCurrency(app.loan_amount_requested)}
          </span>
        )}
        {app?.sanction_amount && (
          <span className="cw-chip cw-chip-green">
            <i className="fas fa-check-circle" style={{ fontSize: 10 }}></i> {formatCurrency(app.sanction_amount)}
          </span>
        )}
        <span className={`cw-chip cw-chip-stage cw-chip-${stageColor}`}>
          {stageLabel}
        </span>
      </div>

      {/* Right: Primary actions + 3-dot */}
      <div className="cw-header-actions">
        <button className="btn btn-outline btn-sm" onClick={() => onTabChange('lenders')}
          title="Hotkey: A">
          <i className="fas fa-plus"></i> Add Lender
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => onTabChange('documents')}
          title="Hotkey: D">
          <i className="fas fa-file-alt"></i> Request Docs
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => onGeneratePack?.()}
          title="Hotkey: P — Generates a printable document pack">
          <i className="fas fa-box"></i> Generate Pack
        </button>
        <button className="btn btn-outline btn-sm" onClick={onWhatsApp} title="Send WhatsApp status update to student">
          <i className="fab fa-whatsapp"></i> WA Update
        </button>

        {/* 3-dot menu */}
        <div className="cw-3dot-wrapper" ref={menuRef}>
          <button
            className="cw-3dot-btn"
            onClick={() => setShow3dot(v => !v)}
            title="More actions"
          >
            <i className="fas fa-ellipsis-v"></i>
          </button>
          {show3dot && (
            <div className="cw-3dot-menu">
              <button className="cw-3dot-item" onClick={() => { setShow3dot(false); onGeneratePack?.('Email'); }}>
                <i className="fas fa-file-pdf"></i> Export PDF
              </button>
              <button className="cw-3dot-item" onClick={() => { setShow3dot(false); onTabChange('close'); }}>
                <i className="fas fa-times-circle"></i> Close Case
              </button>
              <button className="cw-3dot-item" onClick={() => { setShow3dot(false); onTabChange('timeline'); }}>
                <i className="fas fa-history"></i> View Audit Log
              </button>
              <button className="cw-3dot-item" onClick={() => { setShow3dot(false); onGeneratePack?.('Print'); }}>
                <i className="fas fa-print"></i> Print
              </button>
            </div>
          )}
        </div>

        <button className="cw-close-btn" onClick={onClose} title="Close workspace (Esc)">
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
}

// ─── TAGS CONFIG ─────────────────────────────────────────────────
const ALL_TAGS = ['Germany', 'UK', 'USA', 'Canada', 'Australia', 'Collateral', 'HighValue', 'Urgent', 'VisaDeadline', 'VIPStudent'];
const TAG_COLORS = {
  Germany: { bg: '#eff6ff', color: '#1d4ed8' },
  UK:      { bg: '#faf5ff', color: '#7c3aed' },
  USA:     { bg: '#fff7ed', color: '#c2410c' },
  Canada:  { bg: '#f0fdf4', color: '#15803d' },
  Australia: { bg: '#fef9c3', color: '#92400e' },
  Collateral: { bg: '#f0fdf4', color: '#15803d' },
  HighValue:  { bg: '#fef9c3', color: '#92400e' },
  Urgent:     { bg: '#fef2f2', color: '#b91c1c' },
  VisaDeadline: { bg: '#fff7ed', color: '#b45309' },
  VIPStudent:   { bg: '#fdf4ff', color: '#7e22ce' },
};

// ─── CONFIDENCE SCORE INLINE EDITOR ──────────────────────────────
function ConfidenceScoreEditor({ app, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(app.confidence_score || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const score = Number(val);
    if (isNaN(score) || score < 0 || score > 100) { toast.error('Enter a value between 0 and 100'); return; }
    setSaving(true);
    try {
      await api.updateApplication(app.id, { confidence_score: score });
      toast.success('Confidence score updated');
      setEditing(false);
      onUpdated?.();
    } catch (_) { toast.error('Could not save'); }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="cw-owner-val" style={{ cursor: 'pointer' }} onClick={() => { setVal(app.confidence_score || ''); setEditing(true); }} title="Click to edit">
        {app.confidence_score ? `${app.confidence_score}%` : <span style={{ color: '#9ca3af' }}>— click to set</span>}
        <i className="fas fa-pencil-alt" style={{ fontSize: 9, marginLeft: 6, color: '#9ca3af' }}></i>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        type="number" min="0" max="100" value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
        style={{ width: 60, fontSize: 12, padding: '2px 6px', border: '1px solid #2563eb', borderRadius: 4 }}
        autoFocus
      />
      <span style={{ fontSize: 12 }}>%</span>
      <button className="btn btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={handleSave} disabled={saving}>{saving ? '…' : '✓'}</button>
      <button className="btn btn-sm btn-outline" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => setEditing(false)}>✕</button>
    </div>
  );
}

/ ─── TAB 1: OVERVIEW ─────────────────────────────────────────────/
function OverviewTab({ app, onTabChange, onUpdated }) {
  const slaState   = getSLAState(app);
  const isActive   = !['CLOSED', 'DROPPED', 'EXPIRED'].includes(app.status);
  const isSanction = ['SANCTIONED', 'CONDITIONAL_SANCTION', 'SANCTION_ACCEPTED',
                       'AGREEMENT_SIGNED', 'DISBURSEMENT_PENDING', 'DISBURSED'].includes(app.status);
  const hasCollateral = app.collateral && app.collateral !== 'NA' && app.collateral !== 'na';

  // Tags state (stored in app.tags as JSON string)
  const [tags, setTags] = useState(() => {
    try { return JSON.parse(app.tags || '[]'); } catch { return []; }
  });
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [users, setUsers] = useState([]);
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    usersApi.getUsers().then(setUsers).catch(() => {});
  }, []);

  const toggleTag = async (tag) => {
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    setTags(next);
    try { await api.updateApplication(app.id, { tags: next }); } catch {}
  };

  const handleReassign = async (userName) => {
    setReassigning(true);
    try {
      await api.updateApplication(app.id, { assigned_to: userName, notes: `Case assigned to ${userName}` });
      toast.success(`Assigned to ${userName}`);
      setShowReassign(false);
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    }
    setReassigning(false);
  };

  // Real docs data for readiness score
  const [docsData, setDocsData] = useState([]);
  useEffect(() => {
    documentsApi.getDocuments(app.id).then(d => setDocsData(d || [])).catch(() => {});
  }, [app.id]);

  const totalDocs   = Object.values(DOC_CHECKLIST).flat().length;
  const receivedCnt = docsData.filter(d => ['Received', 'Verified'].includes(d.status)).length;
  const readinessPct = totalDocs > 0 ? Math.round((receivedCnt / totalDocs) * 100) : 0;

  // Next Best Actions (rule-based)
  const actions = [];
  if (app.status === 'DOCS_PENDING')
    actions.push({ icon: 'fa-file-alt',           text: 'Request docs from student',              color: 'amber', tab: 'documents' });
  if (slaState === 'breach')
    actions.push({ icon: 'fa-exclamation-triangle', text: 'Escalate lender — SLA breached',        color: 'red',   tab: 'lenders'   });
  if (isSanction && !['DISBURSED'].includes(app.status))
    actions.push({ icon: 'fa-check-double',        text: 'Sanction received — compare & proceed', color: 'green', tab: 'close'     });
  if (app.status === 'QUERY_RAISED')
    actions.push({ icon: 'fa-question-circle',     text: 'Open query pending — resolve or remind', color: 'amber', tab: 'queries'  });
  if (slaState === 'warning')
    actions.push({ icon: 'fa-clock',               text: 'SLA at risk — follow up with bank',     color: 'amber', tab: 'lenders'  });
  if (app.status === 'NOT_CONNECTED')
    actions.push({ icon: 'fa-phone',               text: 'Student not yet contacted — reach out',  color: 'grey',  tab: null       });
  if (actions.length === 0)
    actions.push({ icon: 'fa-thumbs-up',           text: 'No pending actions — all clear',         color: 'grey',  tab: null       });

  return (
    <div className="cw-tab-content">

      {/* Student Profile Summary Row */}
      <div className="cw-student-profile-row">
        {app.country && (
          <div className="cw-profile-chip">
            <i className="fas fa-globe"></i>
            <span><b>Country:</b> {app.country}</span>
          </div>
        )}
        {app.intake && (
          <div className="cw-profile-chip">
            <i className="fas fa-calendar-alt"></i>
            <span><b>Intake:</b> {app.intake}</span>
          </div>
        )}
        {app.loan_amount_requested && (
          <div className="cw-profile-chip">
            <i className="fas fa-rupee-sign"></i>
            <span><b>Requested:</b> {formatCurrency(app.loan_amount_requested)}</span>
          </div>
        )}
        {hasCollateral && (
          <div className="cw-profile-chip cw-profile-chip-amber">
            <i className="fas fa-home"></i>
            <span><b>Collateral:</b> {app.collateral}</span>
          </div>
        )}
        {!hasCollateral && (
          <div className="cw-profile-chip cw-profile-chip-grey">
            <i className="fas fa-ban"></i>
            <span>No Collateral</span>
          </div>
        )}
        {app.loan_type && app.loan_type !== 'NA' && (
          <div className="cw-profile-chip">
            <i className="fas fa-file-contract"></i>
            <span><b>Loan Type:</b> {app.loan_type}</span>
          </div>
        )}
        <div className="cw-profile-chip">
          <i className="fas fa-calendar-check"></i>
          <span><b>Created:</b> {formatDate(app.created_at)}</span>
        </div>
      </div>

      {/* Widget row */}
      <div className="cw-overview-widgets">
        <div className="cw-widget" style={{ cursor: 'pointer' }} onClick={() => onTabChange('documents')}>
          <div className="cw-widget-label">Docs Completion</div>
          <div className={`cw-widget-value cw-widget-${readinessPct >= 80 ? 'green' : readinessPct >= 50 ? 'amber' : 'red'}`}>
            {readinessPct}%
          </div>
          <div className="cw-widget-sub">{receivedCnt}/{totalDocs} docs received</div>
          <div style={{ marginTop: 6, height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${readinessPct}%`, height: '100%', background: readinessPct >= 80 ? '#16a34a' : readinessPct >= 50 ? '#f59e0b' : '#dc2626', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
        <div className="cw-widget">
          <div className="cw-widget-label">Active Lenders</div>
          <div className="cw-widget-value">{isActive ? 1 : 0}</div>
          <div className="cw-widget-sub">Lender applications</div>
        </div>
        <div className="cw-widget" style={{ cursor: 'pointer' }} onClick={() => onTabChange('queries')}>
          <div className="cw-widget-label">Open Queries</div>
          <div className={`cw-widget-value cw-widget-${app.status === 'QUERY_RAISED' ? 'amber' : 'grey'}`}>
            {app.status === 'QUERY_RAISED' ? 1 : 0}
          </div>
          <div className="cw-widget-sub">Pending resolution</div>
        </div>
        <div className="cw-widget" style={{ cursor: 'pointer' }} onClick={() => onTabChange('lenders')}>
          <div className="cw-widget-label">SLA Risk</div>
          <div className={`cw-widget-value cw-widget-${slaState === 'breach' ? 'red' : slaState === 'warning' ? 'amber' : 'green'}`}>
            {slaState === 'breach' ? 'Breach' : slaState === 'warning' ? 'Risk' : 'OK'}
          </div>
          <div className="cw-widget-sub">{app.sla_days != null ? `${app.sla_days}d open` : '—'}</div>
        </div>
        <div className="cw-widget" style={{ cursor: 'pointer' }} onClick={() => onTabChange('close')}>
          <div className="cw-widget-label">{app.disbursed_amount ? 'Disbursed' : 'Best Offer'}</div>
          <div className="cw-widget-value cw-widget-green">
            {app.disbursed_amount ? formatCurrency(app.disbursed_amount) : app.sanction_amount ? formatCurrency(app.sanction_amount) : '—'}
          </div>
          <div className="cw-widget-sub">{app.roi ? `${app.roi}% ROI` : 'No sanction yet'}</div>
        </div>
      </div>

      <div className="cw-overview-bottom">
        {/* Next Best Action panel */}
        <div className="cw-panel">
          <div className="cw-panel-title">
            <i className="fas fa-lightbulb"></i> Next Best Actions
          </div>
          <div className="cw-actions-list">
            {actions.map((a, i) => (
              <div key={i} className={`cw-action-item cw-action-${a.color}`}>
                <i className={`fas ${a.icon}`}></i>
                <span>{a.text}</span>
                {a.tab && (
                  <button className="btn btn-sm btn-outline cw-action-btn" onClick={() => onTabChange(a.tab)}>
                    Go →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Owner panel */}
        <div className="cw-panel">
          <div className="cw-panel-title">
            <i className="fas fa-user-tie"></i> Owner &amp; Priority
          </div>
          <div className="cw-owner-grid">
            <div>
              <label>Case Owner</label>
              <div className="cw-owner-val">
                <i className="fas fa-user-circle"></i> {app.assigned_to || 'Unassigned'}
              </div>
            </div>
            <div>
              <label>Priority</label>
              <div className="cw-owner-val">
                <PriorityDot priority={app.priority} /> {app.priority || 'Normal'}
              </div>
            </div>
            <div>
              <label>Bank / Lender</label>
              <div className="cw-owner-val"><BankLogo bank={app.bank} /></div>
            </div>
            <div>
              <label>Confidence Score</label>
              <ConfidenceScoreEditor app={app} onUpdated={onUpdated} />
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', marginBottom: 6 }}>
              Tags
            </label>
            <div className="cw-tag-row" style={{ marginBottom: 6 }}>
              {tags.map(t => {
                const tc = TAG_COLORS[t] || { bg: '#f3f4f6', color: '#374151' };
                return (
                  <span key={t} className="cw-tag" style={{ background: tc.bg, color: tc.color, cursor: 'pointer' }}
                    onClick={() => toggleTag(t)} title="Click to remove">
                    {t} <i className="fas fa-times" style={{ fontSize: 9, marginLeft: 3 }}></i>
                  </span>
                );
              })}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button className="cw-tag" style={{ background: '#f3f4f6', color: '#374151', border: '1px dashed #d1d5db', cursor: 'pointer' }}
                  onClick={() => setShowTagMenu(v => !v)}>
                  <i className="fas fa-plus" style={{ fontSize: 9 }}></i> Tag
                </button>
                {showTagMenu && (
                  <div className="cw-3dot-menu" style={{ top: 28, left: 0, minWidth: 140 }}>
                    {ALL_TAGS.filter(t => !tags.includes(t)).map(t => {
                      const tc = TAG_COLORS[t] || { bg: '#f3f4f6', color: '#374151' };
                      return (
                        <button key={t} className="cw-3dot-item"
                          style={{ color: tc.color }}
                          onClick={() => { toggleTag(t); setShowTagMenu(false); }}>
                          {t}
                        </button>
                      );
                    })}
                    {ALL_TAGS.filter(t => !tags.includes(t)).length === 0 && (
                      <div style={{ padding: '8px 16px', fontSize: 12, color: '#9ca3af' }}>All tags applied</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowReassign(v => !v)}>
              <i className="fas fa-user-edit"></i> Assign Owner
            </button>
            {showReassign && (
              <div className="cw-3dot-menu" style={{ top: 36, left: 0, minWidth: 200, zIndex: 300 }}>
                <div style={{ padding: '8px 12px', fontSize: 11, color: '#9ca3af', borderBottom: '1px solid #f3f4f6' }}>
                  Select team member
                </div>
                {users.filter(u => u.role === 'super_admin' || u.role === 'staff').map(u => (
                  <button
                    key={u.id}
                    className="cw-3dot-item"
                    disabled={reassigning}
                    onClick={() => handleReassign(u.name)}
                  >
                    <i className="fas fa-user-circle"></i> {u.name}
                    {app.assigned_to === u.name && <i className="fas fa-check" style={{ marginLeft: 'auto', color: '#2563eb' }}></i>}
                  </button>
                ))}
                {users.length === 0 && (
                  <div style={{ padding: '8px 12px', fontSize: 12, color: '#9ca3af' }}>No staff users found</div>
                )}
                <button className="cw-3dot-item" onClick={() => setShowReassign(false)} style={{ color: '#6b7280' }}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2: LENDERS ──────────────────────────────────────────────
function LendersTab({ app, onUpdated }) {
  const [viewMode,    setViewMode]   = useState('cards');
  const [drawerOpen,  setDrawerOpen] = useState(false);
  const slaState = getSLAState(app);
  const isClosed = ['CLOSED', 'DROPPED', 'EXPIRED'].includes(app.status);

  return (
    <div className="cw-tab-content">
      <div className="cw-lenders-header">
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('cards')}
          >
            <i className="fas fa-th"></i> Cards
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('table')}
          >
            <i className="fas fa-list"></i> Table
          </button>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setDrawerOpen(true)}
          title="Open lender detail drawer to update lender info"
        >
          <i className="fas fa-plus"></i> Add / Edit Lender
        </button>
      </div>

      {viewMode === 'cards' ? (
        <div className="cw-lender-cards">
          <LenderCard
            app={app}
            slaState={slaState}
            isClosed={isClosed}
            onOpenDrawer={() => setDrawerOpen(true)}
            onUpdated={onUpdated}
          />
        </div>
      ) : (
        <LendersTable app={app} slaState={slaState} isClosed={isClosed} onOpenDrawer={() => setDrawerOpen(true)} />
      )}

      {drawerOpen && (
        <LenderDetailDrawer
          app={app}
          onClose={() => setDrawerOpen(false)}
          onUpdated={() => { setDrawerOpen(false); onUpdated(); }}
        />
      )}
    </div>
  );
}

function LenderCard({ app, slaState, isClosed, onOpenDrawer, onUpdated }) {
  const bankType  = BANK_TYPE_MAP[app.bank] || 'Private';
  const typeStyle = BANK_TYPE_COLOR[bankType] || BANK_TYPE_COLOR.Private;
  const [isWinner, setIsWinner] = useState(app.status === 'SANCTION_ACCEPTED');
  const [markingWinner, setMarkingWinner] = useState(false);
  const [editingRef, setEditingRef] = useState(false);
  const [refValue, setRefValue] = useState(app.bank_application_ref || '');
  const [savingRef, setSavingRef] = useState(false);

  const handleSaveRef = async () => {
    setSavingRef(true);
    try {
      await api.updateApplication(app.id, { bank_application_ref: refValue });
      toast.success('Bank ref updated');
      setEditingRef(false);
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
    setSavingRef(false);
  };

  const handleQuickAction = async (action) => {
    try {
      if (action === 'query') {
        await api.updateApplication(app.id, { status: 'QUERY_RAISED', awaiting_from: 'Student', notes: '[QUERY] Query raised from lender card' });
        toast.success('Status set to Query Raised');
      } else if (action === 'pack') {
        await api.updateApplication(app.id, { notes: '[PACK] Document pack sent to bank' });
        toast.success('Pack sent — logged in timeline');
      } else if (action === 'ping') {
        await api.updateApplication(app.id, { notes: `[PING] Bank ${app.bank} pinged for update` });
        toast.success(`${app.bank} pinged — logged in timeline`);
      }
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  return (
    <div className={`cw-lender-card ${isClosed ? 'cw-lender-closed' : ''} ${isWinner ? 'cw-lender-winner' : ''}`}>
      {/* Card Header */}
      <div className="cw-lcard-header" onClick={onOpenDrawer} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BankLogo bank={app.bank} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="cw-lcard-bank-name">{app.bank}</span>
              <span
                className="cw-bank-type-badge"
                style={{ background: typeStyle.bg, color: typeStyle.color }}
              >
                {typeStyle.label}
              </span>
              {isWinner && (
                <span className="cw-winner-badge">
                  <i className="fas fa-trophy"></i> Winner
                </span>
              )}
            </div>
            <div className="cw-lcard-ref" onClick={e => e.stopPropagation()}>
              {editingRef ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    value={refValue}
                    onChange={e => setRefValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveRef(); if (e.key === 'Escape') setEditingRef(false); }}
                    style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #2563eb', borderRadius: 4, width: 140 }}
                    autoFocus
                  />
                  <button className="btn btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={handleSaveRef} disabled={savingRef}>
                    {savingRef ? '…' : '✓'}
                  </button>
                  <button className="btn btn-sm btn-outline" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => setEditingRef(false)}>✕</button>
                </span>
              ) : (
                <span>
                  Ref: {app.bank_application_ref || '—'}
                  <i
                    className="fas fa-pen cw-edit-icon"
                    title="Edit ref"
                    style={{ marginLeft: 6, cursor: 'pointer', fontSize: 10 }}
                    onClick={e => { e.stopPropagation(); setEditingRef(true); setRefValue(app.bank_application_ref || ''); }}
                  ></i>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="cw-lcard-date">
          <i className="fas fa-calendar-alt" style={{ fontSize: 11, marginRight: 4 }}></i>
          {app.created_at ? formatDate(app.created_at) : '—'}
        </div>
      </div>

      {/* Status Strip */}
      <div className="cw-lcard-status-strip">
        <StatusBadge status={app.status} />
        <AwaitingPill awaiting={app.awaiting_from} />
        <SLATag days={app.sla_days} awaiting={app.awaiting_from} />
        <span className="cw-lcard-update-meta">
          <i className="fas fa-sync-alt" style={{ fontSize: 10 }}></i>
          &nbsp;{app.last_update_source || 'Manual'}
          &nbsp;·&nbsp;
          {formatDateTime(app.updated_at)}
        </span>
      </div>

      {/* Card Body */}
      <div className="cw-lcard-body">
        <div className="cw-lcard-substatus">{app.sub_status || '—'}</div>
        {app.sanction_amount && (
          <div className="cw-lcard-offer">
            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
            {formatCurrency(app.sanction_amount)}
            {app.roi && ` · ${app.roi}% ROI`}
            {app.tenure && ` · ${app.tenure}m`}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="cw-lcard-actions">
        <button className="btn btn-sm btn-outline" onClick={onOpenDrawer}>
          <i className="fas fa-edit"></i> Update Status
        </button>
        <button className="btn btn-sm btn-outline" onClick={() => handleQuickAction('query')} title="Set status to Query Raised">
          <i className="fas fa-question"></i> Raise Query
        </button>
        <button className="btn btn-sm btn-outline" onClick={() => handleQuickAction('pack')} title="Log pack as sent to bank">
          <i className="fas fa-box"></i> Send Pack
        </button>
        <button className="btn btn-sm btn-outline" onClick={() => handleQuickAction('ping')} title="Log a ping to the bank">
          <i className="fas fa-bell"></i> Ping Bank
        </button>
        {!isClosed && !isWinner && app.sanction_amount && (
          <button
            className="btn btn-sm"
            style={{ background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a' }}
            disabled={markingWinner}
            onClick={async () => {
              setMarkingWinner(true);
              try {
                await api.updateApplication(app.id, {
                  status: 'SANCTION_ACCEPTED',
                  notes: `[WINNER] Sanction accepted — ${app.bank} marked as winning lender`,
                });
                setIsWinner(true);
                toast.success(`${app.bank} marked as winner`);
                onUpdated?.();
              } catch (err) {
                toast.error(err.message || 'Failed to mark winner');
              }
              setMarkingWinner(false);
            }}
          >
            <i className="fas fa-trophy"></i> {markingWinner ? 'Saving…' : 'Mark as Winner'}
          </button>
        )}
        {!isClosed && (
          <button
            className="btn btn-sm"
            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
            onClick={() => toast('Use Close / Outcome tab to close this case', { icon: '🔒' })}
          >
            <i className="fas fa-times"></i> Close
          </button>
        )}
      </div>

      {/* Switches */}
      <div className="cw-lcard-switches">
        {/* Safety gate — always ON */}
        <div className="cw-safety-gate">
          <i className="fas fa-shield-alt"></i>
          <span>Critical update safety gate</span>
          <span className="cw-safety-gate-pill">Always ON</span>
        </div>
      </div>
    </div>
  );
}

function LendersTable({ app, slaState, isClosed, onOpenDrawer }) {
  const bankType  = BANK_TYPE_MAP[app.bank] || 'Private';
  const typeStyle = BANK_TYPE_COLOR[bankType] || BANK_TYPE_COLOR.Private;
  return (
    <div className="table-container">
      <table className="app-table">
        <thead>
          <tr>
            <th>Bank</th>
            <th>Type</th>
            <th>Status</th>
            <th>Awaiting</th>
            <th>SLA</th>
            <th>Sub Status</th>
            <th>Bank Ref</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><BankLogo bank={app.bank} /></td>
            <td>
              <span className="cw-bank-type-badge" style={{ background: typeStyle.bg, color: typeStyle.color }}>
                {typeStyle.label}
              </span>
            </td>
            <td><StatusBadge status={app.status} /></td>
            <td><AwaitingPill awaiting={app.awaiting_from} /></td>
            <td><SLATag days={app.sla_days} awaiting={app.awaiting_from} /></td>
            <td style={{ fontSize: 12, color: '#6b7280' }}>{app.sub_status || '—'}</td>
            <td style={{ fontSize: 12 }}>{app.bank_application_ref || '—'}</td>
            <td style={{ fontSize: 12 }}>{formatDateTime(app.updated_at)}</td>
            <td>
              <button className="btn btn-sm btn-outline" onClick={onOpenDrawer}>
                <i className="fas fa-edit"></i> Update
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── LENDER DETAIL DRAWER ────────────────────────────────────────
function LenderDetailDrawer({ app, onClose, onUpdated }) {
  const [section,  setSection]  = useState('status');
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    status:          app.status,
    sub_status:      app.sub_status || '',
    awaiting_from:   app.awaiting_from,
    priority:        app.priority || 'Normal',
    remarks:         '',
    sanction_amount: app.sanction_amount || '',
    roi:             app.roi || '',
    tenure:          app.tenure || '',
    processing_fee:  app.processing_fee || '',
    margin_percent:  app.margin_percent || '',
    conditions:      app.lender_conditions || '',
    close_reason:    app.close_reason || '',
    close_notes:     '',
  });

  const DRAWER_SECTIONS = [
    { key: 'status',  label: 'Status Update'    },
    { key: 'queries', label: 'Query Manager'     },
    { key: 'pack',    label: 'Pack Controls'     },
    { key: 'offer',   label: 'Offer Terms'       },
    { key: 'compare', label: 'Compare Offers'    },
    { key: 'close',   label: 'Close Application' },
  ];

  const onStatusChange = (status) => {
    const cfg = STATUS_CONFIG[status];
    setForm(f => ({
      ...f,
      status,
      awaiting_from: cfg?.awaiting !== 'Closed' ? cfg?.awaiting : f.awaiting_from,
      sub_status:    SUB_STATUS_MAP[status]?.[0] || '',
    }));
  };

  const isSanctionStatus = ['SANCTIONED', 'CONDITIONAL_SANCTION'].includes(form.status);
  const isCritical       = ['SANCTIONED', 'REJECTED', 'DISBURSED', 'AGREEMENT_SIGNED'].includes(form.status);

  const handleSave = async (notifyStudent = false, notifyBank = false) => {
    setSaving(true);
    try {
      const payload = {
        status:        form.status,
        sub_status:    form.sub_status,
        awaiting_from: form.awaiting_from,
        priority:      form.priority,
        notes:         form.remarks,
      };
      if (isSanctionStatus) {
        if (form.sanction_amount) payload.sanction_amount = Number(form.sanction_amount);
        if (form.roi)             payload.roi             = Number(form.roi);
        if (form.tenure)          payload.tenure          = Number(form.tenure);
        if (form.processing_fee)  payload.processing_fee  = Number(form.processing_fee);
        if (form.margin_percent)  payload.margin_percent  = Number(form.margin_percent);
      }
      payload.lender_conditions = form.conditions ?? '';
      await api.updateApplication(app.id, payload);
      const notifMsg = notifyBank ? ' · Bank notified via template' : notifyStudent ? ' · Student notified' : '';
      toast.success(`Updated ${app.id}${notifMsg}`);
      onUpdated();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
    setSaving(false);
  };

  return (
    <div className="cw-drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cw-drawer">
        {/* Drawer header */}
        <div className="cw-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BankLogo bank={app.bank} />
            <div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{app.bank}</span>
              {(() => {
                const bankType  = BANK_TYPE_MAP[app.bank] || 'Private';
                const typeStyle = BANK_TYPE_COLOR[bankType];
                return (
                  <span className="cw-bank-type-badge" style={{ background: typeStyle.bg, color: typeStyle.color, marginLeft: 8 }}>
                    {typeStyle.label}
                  </span>
                );
              })()}
            </div>
          </div>
          <button className="cw-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Section nav */}
        <div className="cw-drawer-nav">
          {DRAWER_SECTIONS.map(s => (
            <button
              key={s.key}
              className={`cw-drawer-nav-item ${section === s.key ? 'active' : ''}`}
              onClick={() => setSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Drawer body */}
        <div className="cw-drawer-body">

          {/* A) Status Update */}
          {section === 'status' && (
            <>
              {/* Safety gate indicator — always on */}
              <div className="cw-safety-gate-bar">
                <i className="fas fa-shield-alt"></i>
                <span>Critical Update Safety Gate</span>
                <span className="cw-safety-gate-pill">Always ON</span>
              </div>

              {isCritical && (
                <div className="bank-panel-warning" style={{ marginBottom: 12 }}>
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>Critical status — Proof upload or supervisor confirmation may be required before this update goes live.</span>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Main Status</label>
                  <select value={form.status} onChange={e => onStatusChange(e.target.value)}>
                    {Object.entries(STATUS_GROUP).map(([group, statuses]) => (
                      <optgroup key={group} label={group}>
                        {statuses.map(s => (
                          <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Sub Status</label>
                  {SUB_STATUS_MAP[form.status] ? (
                    <select value={form.sub_status} onChange={e => setForm(f => ({ ...f, sub_status: e.target.value }))}>
                      {SUB_STATUS_MAP[form.status].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input
                      value={form.sub_status}
                      onChange={e => setForm(f => ({ ...f, sub_status: e.target.value }))}
                      placeholder="Sub status / notes…"
                    />
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Awaiting From</label>
                  <select value={form.awaiting_from} onChange={e => setForm(f => ({ ...f, awaiting_from: e.target.value }))}>
                    <option>Student</option>
                    <option>Bank</option>
                    <option>Nexthara</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option>Normal</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  placeholder="Add remarks…"
                  style={{ minHeight: 70 }}
                />
              </div>
              <div className="form-actions" style={{ marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleSave(false, false)} disabled={saving}>
                  <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                  {saving ? 'Saving…' : 'Save Update'}
                </button>
                <button className="btn btn-outline" onClick={() => handleSave(true, false)} disabled={saving}>
                  <i className="fas fa-user-check"></i> Save + Notify Student
                </button>
                <button className="btn btn-outline" onClick={() => handleSave(false, true)} disabled={saving}
                  style={{ borderColor: '#2563eb', color: '#2563eb' }}>
                  <i className="fas fa-university"></i> Save + Notify Bank
                </button>
              </div>
            </>
          )}

          {/* B) Query Manager */}
          {section === 'queries' && (
            <DrawerQueryManager app={app} onUpdated={onUpdated} />
          )}

          {/* C) Pack Controls */}
          {section === 'pack' && (
            <DrawerPackControls app={app} onUpdated={onUpdated} />
          )}

          {/* D) Offer Terms */}
          {section === 'offer' && (
            isSanctionStatus ? (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Sanctioned Amount (₹)</label>
                    <input type="number" value={form.sanction_amount} onChange={e => setForm(f => ({ ...f, sanction_amount: e.target.value }))} placeholder="e.g. 2500000" />
                  </div>
                  <div className="form-group">
                    <label>ROI (%)</label>
                    <input value={form.roi} onChange={e => setForm(f => ({ ...f, roi: e.target.value }))} placeholder="e.g. 9.5" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tenure (months)</label>
                    <input type="number" value={form.tenure} onChange={e => setForm(f => ({ ...f, tenure: e.target.value }))} placeholder="e.g. 120" />
                  </div>
                  <div className="form-group">
                    <label>Processing Fee (%)</label>
                    <input value={form.processing_fee} onChange={e => setForm(f => ({ ...f, processing_fee: e.target.value }))} placeholder="e.g. 1.0" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Margin (%)</label>
                    <input value={form.margin_percent} onChange={e => setForm(f => ({ ...f, margin_percent: e.target.value }))} placeholder="e.g. 10" />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>Conditions / Special Terms</label>
                  <textarea
                    value={form.conditions}
                    onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))}
                    placeholder="e.g. Collateral to be mortgaged, Co-applicant required, additional documentation needed…"
                    style={{ minHeight: 70 }}
                  />
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={() => handleSave(false, false)} disabled={saving}>
                    <i className="fas fa-save"></i> Save Offer Terms
                  </button>
                  <button className="btn btn-outline" onClick={() => setSection('compare')}>
                    <i className="fas fa-balance-scale"></i> Compare Offers
                  </button>
                </div>
              </>
            ) : (
              <div className="cw-empty-state">
                <i className="fas fa-gavel"></i>
                <p>No offer terms yet.</p>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Status must be SANCTIONED or CONDITIONAL_SANCTION to enter offer terms.</p>
              </div>
            )
          )}

          {/* E) Compare Offers */}
          {section === 'compare' && (
            <OffersComparePanel app={app} />
          )}

          {/* F) Close Lender Application */}
          {section === 'close' && (
            <CloseDrawerSection app={app} form={form} setForm={setForm} onUpdated={onUpdated} />
          )}
        </div>
      </div>
    </div>
  );
}

function CloseDrawerSection({ app, form, setForm, onUpdated }) {
  const [saving, setSaving] = useState(false);

  const handleClose = async () => {
    if (!form.close_reason) { toast.error('Select a close reason'); return; }
    setSaving(true);
    try {
      await api.updateApplication(app.id, {
        status:       'CLOSED',
        close_reason: form.close_reason,
        sub_status:   form.close_reason,
        notes:        form.close_notes,
      });
      toast.success('Lender application closed');
      onUpdated();
    } catch (err) {
      toast.error(err.message || 'Close failed');
    }
    setSaving(false);
  };

  return (
    <>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label>Close Reason (required)</label>
        <select value={form.close_reason} onChange={e => setForm(f => ({ ...f, close_reason: e.target.value }))}>
          <option value="">— Select reason —</option>
          {CLOSE_REASON_CODES.map(r => (
            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label>Notes</label>
        <textarea
          value={form.close_notes}
          onChange={e => setForm(f => ({ ...f, close_notes: e.target.value }))}
          placeholder="Additional notes…"
          style={{ minHeight: 70 }}
        />
      </div>
      <button
        className="btn"
        style={{ background: '#dc2626', color: '#fff', border: 'none' }}
        onClick={handleClose}
        disabled={saving}
      >
        <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-times-circle'}`}></i>
        {saving ? 'Closing…' : 'Close This Application'}
      </button>
    </>
  );
}

// ─── DRAWER: QUERY MANAGER ───────────────────────────────────────
function DrawerQueryManager({ app, onUpdated }) {
  const [type, setType] = useState('Document Request');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!notes.trim()) { toast.error('Please describe the query'); return; }
    setSaving(true);
    try {
      await api.updateApplication(app.id, {
        status: 'QUERY_RAISED',
        awaiting_from: 'Student',
        notes: `[QUERY] Type: ${type} | ${notes}`,
      });
      toast.success('Query raised — status updated to Query Raised');
      setNotes('');
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to create query');
    }
    setSaving(false);
  };

  return (
    <div>
      {app.status === 'QUERY_RAISED' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
          <i className="fas fa-exclamation-triangle" style={{ color: '#d97706', marginRight: 6 }}></i>
          Active query: status is <strong>Query Raised</strong>, awaiting from Student.
        </div>
      )}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label>Query Type</label>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option>Document Request</option>
          <option>Clarification</option>
          <option>Field Verification</option>
          <option>Income Proof</option>
          <option>Other</option>
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label>Query Details / Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe the query…" style={{ minHeight: 70 }} />
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>
        <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
        {saving ? 'Creating…' : 'Create Query & Notify Student'}
      </button>
    </div>
  );
}

// ─── DRAWER: PACK CONTROLS ────────────────────────────────────────
function DrawerPackControls({ app, onUpdated }) {
  const [sentVia, setSentVia] = useState('Bank Portal Upload');
  const [sentTo, setSentTo]   = useState('');
  const [packs, setPacks]     = useState([]);
  const [generating, setGenerating] = useState(false);

  const loadPacks = useCallback(() => {
    packsApi.getPacks(app.id).then(setPacks).catch(() => {});
  }, [app.id]);

  useEffect(() => { loadPacks(); }, [loadPacks]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let docs = [];
      try { docs = await documentsApi.getDocuments(app.id); } catch {}
      const html = generatePackHTML(app, docs);
      const win = window.open('', '_blank', 'width=960,height=800');
      if (!win) { toast.error('Allow popups to generate pack'); setGenerating(false); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
      await packsApi.createPack(app.id, { sent_via: sentVia, sent_to: sentTo });
      toast.success('Pack generated and logged!', { icon: '📦' });
      loadPacks();
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Generation failed');
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label>Send Pack Method</label>
        <select value={sentVia} onChange={e => setSentVia(e.target.value)}>
          <option>Bank Portal Upload</option>
          <option>Email</option>
          <option>Secure Link</option>
          <option>WhatsApp</option>
          <option>Print</option>
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label>Sent To (Bank Officer / Email)</label>
        <input value={sentTo} onChange={e => setSentTo(e.target.value)} placeholder="e.g. loan.officer@bank.in" />
      </div>
      <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
        <i className={`fas ${generating ? 'fa-spinner fa-spin' : 'fa-box'}`}></i>
        {generating ? 'Generating…' : 'Generate & Print Pack'}
      </button>
      {packs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Pack History
          </div>
          {packs.map(p => (
            <div key={p.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', marginBottom: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 600 }}>v{p.version} — {p.docs_count} docs</div>
              <div style={{ color: '#6b7280' }}>Via {p.sent_via}{p.sent_to ? ` → ${p.sent_to}` : ''} · {new Date(p.created_at).toLocaleDateString('en-IN')}</div>
            </div>
          ))}
        </div>
      )}
      {packs.length === 0 && (
        <div style={{ marginTop: 16, color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 12 }}>
          No packs generated yet.
        </div>
      )}
    </div>
  );
}

// ─── DRAWER: OFFERS COMPARE ───────────────────────────────────────
function OffersComparePanel({ app }) {
  const [tenure, setTenure] = useState(app.tenure || 120);
  const P = app.sanction_amount || 0;
  const r = (app.roi || 0) / 12 / 100;
  const n = tenure;
  const emi = P && r && n ? Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : 0;
  const total = emi * n;
  const interest = total - P;
  const curr = v => v ? `₹${Math.round(v).toLocaleString('en-IN')}` : '—';

  if (!app.sanction_amount) {
    return (
      <div className="cw-empty-state">
        <i className="fas fa-gavel"></i>
        <p>No sanctioned offer yet.</p>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>Offer terms will appear here once the bank sanctions the loan.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 4 }}><i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>{app.bank} — Sanctioned Offer</div>
        <div style={{ fontSize: 12, color: '#166534' }}>Amount: {curr(app.sanction_amount)} · ROI: {app.roi ? app.roi + '%' : '—'} · Tenure: {app.tenure ? app.tenure + 'm' : '—'}</div>
      </div>
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label>Adjust Tenure for EMI Comparison (months)</label>
        <input type="range" min="12" max="240" step="12" value={tenure} onChange={e => setTenure(Number(e.target.value))} style={{ width: '100%' }} />
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{tenure} months ({(tenure/12).toFixed(1)} years)</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Monthly EMI', value: curr(emi), color: '#1d4ed8' },
          { label: 'Total Payable', value: curr(total), color: '#374151' },
          { label: 'Total Interest', value: curr(interest), color: '#b91c1c' },
        ].map(c => (
          <div key={c.label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
      {app.processing_fee && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
          Processing Fee: {app.processing_fee}% = {curr(P * app.processing_fee / 100)} (one-time)
        </div>
      )}
      {app.margin_percent && (
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          Margin Money Required: {app.margin_percent}% = {curr(P * app.margin_percent / 100)}
        </div>
      )}
    </div>
  );
}

// ─── TAB 3: DOCUMENTS ────────────────────────────────────────────
const DOC_QUALITY_OPTIONS = ['OK', 'Blurry', 'Expired', 'Mismatch', 'Incomplete'];

function getDocIcon(mime) {
  if (!mime) return 'fa-file-alt';
  if (mime.includes('pdf')) return 'fa-file-pdf';
  if (mime.includes('image')) return 'fa-file-image';
  if (mime.includes('word') || mime.includes('doc')) return 'fa-file-word';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('xls')) return 'fa-file-excel';
  return 'fa-file-alt';
}

function getDocQualityStyle(q) {
  if (q === 'OK') return { color: '#15803d', bg: '#f0fdf4' };
  if (q === 'Blurry' || q === 'Incomplete') return { color: '#b45309', bg: '#fffbeb' };
  if (q === 'Expired' || q === 'Mismatch') return { color: '#b91c1c', bg: '#fef2f2' };
  return { color: '#6b7280', bg: '#f9fafb' };
}

function DocumentsTab({ app, onUpdated, onTabChange }) {
  const [activeGroup, setActiveGroup] = useState(Object.keys(DOC_CHECKLIST)[0]);
  const [docStatus, setDocStatus] = useState({});   // per checklist item: quality flag
  const [docs, setDocs]           = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef              = useRef(null);
  const [uploadMeta, setUploadMeta] = useState({ doc_name: '', doc_category: 'Other', owner: 'Student', label: '' });
  const [showUploadForm, setShowUploadForm] = useState(false);

  const loadDocs = useCallback(() => {
    if (!app?.id) return;
    documentsApi.getDocuments(app.id).then(data => {
      const list = data || [];
      setDocs(list);
      // Restore persisted quality flags from DB into local state
      const qMap = {};
      list.forEach(d => { if (d.quality) qMap[d.doc_name] = d.quality; });
      setDocStatus(qMap);
    }).catch(() => {});
  }, [app?.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // Build checklist checked state from actual uploaded docs
  const checkedMap = {};
  docs.forEach(d => {
    if (['Received', 'Verified'].includes(d.status)) checkedMap[d.doc_name] = d.status;
  });

  const allDocNames = Object.values(DOC_CHECKLIST).flat();
  const totalDocs   = allDocNames.length;
  const receivedCnt = Object.keys(checkedMap).length;
  const verifiedCnt = docs.filter(d => d.status === 'Verified').length;
  const pct         = Math.round((receivedCnt / totalDocs) * 100);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const meta = { ...uploadMeta };
      if (!meta.doc_name) meta.doc_name = file.name.replace(/\.[^.]+$/, '');
      await documentsApi.uploadFile(app.id, file, meta);
      toast.success(`"${meta.doc_name}" uploaded`);
      loadDocs();
      setShowUploadForm(false);
      setUploadMeta({ doc_name: '', doc_category: 'Other', owner: 'Student', label: '' });
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleView = (d) => {
    if (!d.file_path) { toast.error('No file attached — metadata record only'); return; }
    const url = documentsApi.fileUrl(app.id, d.id, false);
    const token = localStorage.getItem('nexthara_token');
    // Open via authenticated fetch → blob URL
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.blob() : Promise.reject(r.statusText))
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      })
      .catch(() => toast.error('Could not open file'));
  };

  const handleDownload = (d) => {
    if (!d.file_path) { toast.error('No file attached — metadata record only'); return; }
    const url = documentsApi.fileUrl(app.id, d.id, true);
    const token = localStorage.getItem('nexthara_token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.blob() : Promise.reject(r.statusText))
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = d.doc_name || 'document';
        a.click();
      })
      .catch(() => toast.error('Download failed'));
  };

  const handleMarkStatus = async (d, newStatus) => {
    try {
      await documentsApi.updateDocument(app.id, d.id, { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      loadDocs();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  const handleShareToggle = async (d) => {
    try {
      await documentsApi.updateDocument(app.id, d.id, { share_with_lender: d.share_with_lender ? 0 : 1 });
      loadDocs();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const setDocQuality = async (docName, val) => {
    setDocStatus(s => ({ ...s, [docName]: val }));
    const docRecord = docs.find(d => d.doc_name === docName);
    if (docRecord) {
      try {
        await api.updateDocument(app.id, docRecord.id, { quality: val });
      } catch (_) { toast.error('Could not save quality flag'); }
    }
  };

  return (
    <div className="cw-tab-content">
      <div className="cw-doc-top-actions">
        <button className="btn btn-primary btn-sm" onClick={() => setShowUploadForm(v => !v)}>
          <i className="fas fa-cloud-upload-alt"></i> {showUploadForm ? 'Cancel Upload' : 'Upload Document'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => {
          const phone = (app.student_phone || '').replace(/\D/g, '');
          if (!phone) { toast.error('No student phone number on file'); return; }
          const allDocNames = Object.values(DOC_CHECKLIST).flat();
          const checkedDocNames = docs.filter(d => ['Received', 'Verified'].includes(d.status)).map(d => d.doc_name);
          const missing = allDocNames.filter(n => !checkedDocNames.includes(n)).slice(0, 8);
          const list = missing.length ? missing.map((d, i) => `${i + 1}. ${d}`).join('\n') : 'Please upload any pending documents.';
          const text = encodeURIComponent(`Hi ${app.student_name}, we need the following documents for your loan application with ${app.bank}:\n\n${list}\n\nPlease upload them in the Nexthara Student Portal. – Nexthara Team`);
          const dialCode = phone.startsWith('91') ? '' : '91';
          window.open(`https://wa.me/${dialCode}${phone}?text=${text}`, '_blank');
        }}>
          <i className="fas fa-paper-plane"></i> Request Missing Docs
        </button>
        <button className="btn btn-outline btn-sm" onClick={async () => {
          let docs2 = [];
          try { docs2 = await documentsApi.getDocuments(app.id); } catch {}
          const html = generatePackHTML(app, docs2);
          const win = window.open('', '_blank', 'width=960,height=800');
          if (!win) { toast.error('Allow popups to generate pack'); return; }
          win.document.write(html);
          win.document.close();
          win.focus();
          setTimeout(() => win.print(), 400);
          try {
            await packsApi.createPack(app.id, { sent_via: 'Print' });
            onUpdated?.();
          } catch {}
          toast.success('Pack generated!', { icon: '📦' });
        }}>
          <i className="fas fa-box"></i> Generate / Update Pack
        </button>
        <button className="btn btn-outline btn-sm" onClick={async () => {
          const phone = (app.student_phone || '').replace(/\D/g, '');
          if (!phone) { toast.error('No student phone number on file'); return; }
          const text = encodeURIComponent(`Hi ${app.student_name}, some of your uploaded documents need to be re-uploaded with better quality. Please log into the Nexthara Student Portal and re-upload the requested documents. – Nexthara Team`);
          const dialCode = phone.startsWith('91') ? '' : '91';
          window.open(`https://wa.me/${dialCode}${phone}?text=${text}`, '_blank');
          try {
            await api.updateApplication(app.id, { notes: '[DOC] Re-upload request sent to student via WhatsApp' });
            onUpdated?.();
          } catch {}
          toast.success('Re-upload request sent via WhatsApp');
        }}>
          <i className="fas fa-redo"></i> Re-upload Request
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="cw-panel cw-upload-panel" style={{ marginBottom: 16 }}>
          <div className="cw-panel-title"><i className="fas fa-cloud-upload-alt"></i> Upload Document</div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-group">
              <label>Document Name</label>
              <input
                placeholder="e.g. ITR AY 24-25"
                value={uploadMeta.doc_name}
                onChange={e => setUploadMeta(m => ({ ...m, doc_name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Label / Year</label>
              <input
                placeholder="e.g. AY 2024-25"
                value={uploadMeta.label}
                onChange={e => setUploadMeta(m => ({ ...m, label: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label>Category</label>
              <select value={uploadMeta.doc_category} onChange={e => setUploadMeta(m => ({ ...m, doc_category: e.target.value }))}>
                {Object.keys(DOC_CHECKLIST).map(g => <option key={g} value={g}>{g}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Owner</label>
              <select value={uploadMeta.owner} onChange={e => setUploadMeta(m => ({ ...m, owner: e.target.value }))}>
                <option>Student</option>
                <option>Co-applicant</option>
                <option>Staff</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-folder-open'}`}></i>
              {uploading ? 'Uploading…' : 'Choose File & Upload'}
            </button>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>PDF, JPG, PNG, DOC, XLSX (max 20MB)</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xlsx,.xls,.csv,.txt"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
      )}

      <div className="cw-docs-layout">
        {/* Left: Checklist */}
        <div className="cw-docs-checklist">
          <div className="cw-panel-title">
            <i className="fas fa-clipboard-check"></i> Document Checklist
            <span className="cw-doc-progress-label">{receivedCnt}/{totalDocs} ({pct}%)</span>
          </div>
          <div className="cw-doc-progress-bar">
            <div className="cw-doc-progress-fill" style={{ width: `${pct}%` }}></div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b7280', margin: '4px 0 10px' }}>
            <span><i className="fas fa-circle" style={{ color: '#16a34a', fontSize: 8 }}></i> Verified: {verifiedCnt}</span>
            <span><i className="fas fa-circle" style={{ color: '#2563eb', fontSize: 8 }}></i> Received: {receivedCnt - verifiedCnt}</span>
            <span><i className="fas fa-circle" style={{ color: '#e5e7eb', fontSize: 8 }}></i> Pending: {totalDocs - receivedCnt}</span>
          </div>

          <div className="cw-doc-group-tabs">
            {Object.keys(DOC_CHECKLIST).map(g => (
              <button
                key={g}
                className={`cw-doc-group-tab ${activeGroup === g ? 'active' : ''}`}
                onClick={() => setActiveGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="cw-doc-items">
            {DOC_CHECKLIST[activeGroup].map(doc => {
              const dbStatus = checkedMap[doc]; // 'Received' | 'Verified' | undefined
              const isReceived = !!dbStatus;
              const isVerified = dbStatus === 'Verified';
              const q = docStatus[doc];
              const qs = getDocQualityStyle(q);
              return (
                <div key={doc} className={`cw-doc-item ${isReceived ? 'received' : ''}`}>
                  <div className={`cw-doc-checkbox ${isReceived ? 'checked' : ''}`}>
                    {isVerified ? <i className="fas fa-check-double"></i> : isReceived ? <i className="fas fa-check"></i> : null}
                  </div>
                  <span className="cw-doc-name">{doc}</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto' }}>
                    <span className={`cw-doc-pill ${isVerified ? 'cw-doc-pill-green' : isReceived ? 'cw-doc-pill-blue' : 'cw-doc-pill-amber'}`}>
                      {isVerified ? 'Verified' : isReceived ? 'Received' : 'Pending'}
                    </span>
                    {isReceived && (
                      <select
                        className="cw-doc-quality-select"
                        value={q || 'OK'}
                        onChange={e => setDocQuality(doc, e.target.value)}
                        style={{ color: qs.color, background: qs.bg }}
                        title="Doc quality"
                      >
                        {DOC_QUALITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Document grid */}
        <div className="cw-docs-grid">
          <div className="cw-panel-title">
            <i className="fas fa-folder-open"></i> Uploaded Documents
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280', fontWeight: 400, textTransform: 'none' }}>
              {docs.length} file{docs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {docs.length === 0 ? (
            <div className="cw-empty-state" style={{ marginTop: 16 }}>
              <i className="fas fa-cloud-upload-alt"></i>
              <p>No documents uploaded yet.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowUploadForm(true)}>
                <i className="fas fa-plus"></i> Upload First Document
              </button>
            </div>
          ) : (
            <div className="cw-doc-grid-list">
              {docs.map(d => {
                const statusColor = d.status === 'Verified' ? '#15803d' : d.status === 'Invalid' ? '#b91c1c' : d.status === 'Received' ? '#1d4ed8' : '#6b7280';
                const statusBg    = d.status === 'Verified' ? '#f0fdf4' : d.status === 'Invalid' ? '#fef2f2' : d.status === 'Received' ? '#eff6ff' : '#f9fafb';
                return (
                  <div key={d.id} className="cw-doc-grid-item">
                    <i className={`fas ${getDocIcon(d.mime_type)}`} style={{ color: '#6b7280', fontSize: 20, flexShrink: 0 }}></i>
                    <div className="cw-doc-grid-info">
                      <div className="cw-doc-grid-name">{d.doc_name}{d.label ? ` (${d.label})` : ''}</div>
                      <div className="cw-doc-grid-meta">
                        {d.doc_category} · {d.owner || 'Student'}
                        {d.uploaded_at ? ` · ${formatDate(d.uploaded_at)}` : ''}
                        {d.file_size ? ` · ${(d.file_size / 1024).toFixed(0)}KB` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: statusBg, color: statusColor, flexShrink: 0 }}>
                      {d.status}
                    </span>
                    {/* Share to lender toggle */}
                    <label className="cw-switch-row" style={{ flexShrink: 0, gap: 4 }} title="Share directly with lender">
                      <i className="fas fa-share-alt" style={{ fontSize: 11, color: d.share_with_lender ? '#2563eb' : '#9ca3af' }}></i>
                      <input type="checkbox" checked={!!d.share_with_lender} onChange={() => handleShareToggle(d)} />
                    </label>
                    <div className="cw-doc-grid-actions">
                      {d.file_path ? (
                        <>
                          <button className="btn btn-sm btn-outline" title="View in new tab" onClick={() => handleView(d)}>
                            <i className="fas fa-eye"></i>
                          </button>
                          <button className="btn btn-sm btn-outline" title="Download" onClick={() => handleDownload(d)}>
                            <i className="fas fa-download"></i>
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>No file</span>
                      )}
                      {d.status !== 'Verified' && (
                        <button className="btn btn-sm" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                          title="Mark Verified" onClick={() => handleMarkStatus(d, 'Verified')}>
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      {d.status !== 'Invalid' && (
                        <button className="btn btn-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                          title="Mark Invalid" onClick={() => handleMarkStatus(d, 'Invalid')}>
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 4: QUERIES ──────────────────────────────────────────────
function QueriesTab({ app, onTabChange, onUpdated }) {
  const [subTab, setSubTab] = useState('open');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savingQuery, setSavingQuery] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [newQuery, setNewQuery] = useState({ type: 'Document Request', docs: [], notes: '' });

  const allDocNames = Object.values(DOC_CHECKLIST).flat();

  // Pull real query entries from app.history
  const queryHistory = (app.history || []).filter(h => h.entry_type === 'query' || (h.notes || '').startsWith('[QUERY]'));
  const isQueryOpen = app.status === 'QUERY_RAISED';

  const toggleQueryDoc = (doc) => {
    setNewQuery(q => ({
      ...q,
      docs: q.docs.includes(doc) ? q.docs.filter(d => d !== doc) : [...q.docs, doc],
    }));
  };

  const handleCreateQuery = async () => {
    if (newQuery.docs.length === 0 && !newQuery.notes) {
      toast.error('Select at least one doc or add a note');
      return;
    }
    setSavingQuery(true);
    try {
      const docList = newQuery.docs.length ? ' | Docs: ' + newQuery.docs.join(', ') : '';
      const noteText = `[QUERY] Type: ${newQuery.type}${docList}${newQuery.notes ? ' | Notes: ' + newQuery.notes : ''}`;
      await api.updateApplication(app.id, {
        status: 'QUERY_RAISED',
        awaiting_from: 'Student',
        notes: noteText,
      });
      toast.success('Query raised — status set to Query Raised, awaiting student');
      setShowCreateForm(false);
      setNewQuery({ type: 'Document Request', docs: [], notes: '' });
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to create query');
    }
    setSavingQuery(false);
  };

  const handleResolve = async (historyEntry) => {
    setResolvingId(historyEntry.id);
    try {
      await api.updateApplication(app.id, {
        status: 'UNDER_REVIEW',
        awaiting_from: 'Bank',
        notes: `[QUERY] Query resolved — resuming review at ${app.bank}`,
      });
      toast.success('Query resolved — status set to Under Review');
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to resolve query');
    }
    setResolvingId(null);
  };

  const handleRemind = async (historyEntry) => {
    try {
      await api.updateApplication(app.id, {
        notes: `[QUERY] Reminder sent to student for query raised on ${(historyEntry.created_at || '').slice(0, 10)}`,
      });
      toast.success('Reminder logged');
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to log reminder');
    }
  };

  // Parse note text to extract type and docs from [QUERY] notes
  const parseQueryNote = (notes = '') => {
    const typeMatch = notes.match(/Type:\s*([^|]+)/);
    const docsMatch = notes.match(/Docs:\s*([^|]+)/);
    const noteMatch = notes.match(/Notes:\s*(.+)$/);
    return {
      type: typeMatch ? typeMatch[1].trim() : 'Query',
      docs: docsMatch ? docsMatch[1].trim() : '—',
      extraNote: noteMatch ? noteMatch[1].trim() : '',
    };
  };

  return (
    <div className="cw-tab-content">
      <div className="cw-sub-tabs">
        <button className={`cw-sub-tab ${subTab === 'open' ? 'active' : ''}`} onClick={() => setSubTab('open')}>
          Open Queries
          {isQueryOpen && <span className="cw-sub-tab-badge">1</span>}
        </button>
        <button className={`cw-sub-tab ${subTab === 'history' ? 'active' : ''}`} onClick={() => setSubTab('history')}>
          Query History
          {queryHistory.length > 0 && <span className="cw-sub-tab-badge">{queryHistory.length}</span>}
        </button>
        <button className={`cw-sub-tab ${subTab === 'student' ? 'active' : ''}`} onClick={() => setSubTab('student')}>
          Pending Student Docs
        </button>
        <button className={`cw-sub-tab ${subTab === 'bank' ? 'active' : ''}`} onClick={() => setSubTab('bank')}>
          Pending Bank Action
        </button>
      </div>

      {subTab === 'open' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateForm(v => !v)}>
              <i className="fas fa-plus"></i> {showCreateForm ? 'Cancel' : 'Raise New Query'}
            </button>
          </div>

          {/* Create Query Form */}
          {showCreateForm && (
            <div className="cw-panel" style={{ marginBottom: 16 }}>
              <div className="cw-panel-title"><i className="fas fa-plus-circle"></i> Raise Query</div>
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label>Query Type</label>
                  <select value={newQuery.type} onChange={e => setNewQuery(q => ({ ...q, type: e.target.value }))}>
                    <option>Document Request</option>
                    <option>Clarification</option>
                    <option>Field Verification</option>
                    <option>Income Proof</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Select Requested Documents</label>
                <div className="cw-query-doc-grid">
                  {allDocNames.map(doc => (
                    <label key={doc} className="cw-query-doc-item">
                      <input
                        type="checkbox"
                        checked={newQuery.docs.includes(doc)}
                        onChange={() => toggleQueryDoc(doc)}
                      />
                      <span>{doc}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Additional Notes</label>
                <textarea
                  value={newQuery.notes}
                  onChange={e => setNewQuery(q => ({ ...q, notes: e.target.value }))}
                  placeholder="Describe the query…"
                  style={{ minHeight: 60 }}
                />
              </div>
              {newQuery.docs.length > 0 && (
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                  Selected: {newQuery.docs.join(', ')}
                </div>
              )}
              <div className="form-actions">
                <button className="btn btn-primary btn-sm" onClick={handleCreateQuery} disabled={savingQuery}>
                  <i className={`fas ${savingQuery ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                  {savingQuery ? 'Raising…' : 'Raise Query & Notify Student'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Active query card */}
          {isQueryOpen ? (
            (() => {
              const latest = queryHistory[0];
              const parsed = latest ? parseQueryNote(latest.notes) : { type: 'Query', docs: '—', extraNote: '' };
              return (
                <div className="cw-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#92400e' }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }}></i>
                        Active Query — {parsed.type}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        Raised on {latest ? (latest.created_at || '').slice(0, 10) : '—'} · Awaiting Student
                      </div>
                    </div>
                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>OPEN</span>
                  </div>
                  {parsed.docs !== '—' && (
                    <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>
                      <strong>Requested docs:</strong> {parsed.docs}
                    </div>
                  )}
                  {parsed.extraNote && (
                    <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>
                      <strong>Note:</strong> {parsed.extraNote}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => latest && handleRemind(latest)}>
                      <i className="fas fa-bell"></i> Send Reminder
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => onTabChange?.('documents')}>
                      <i className="fas fa-paperclip"></i> View Docs
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => latest && handleResolve(latest)}
                      disabled={resolvingId === (latest?.id)}
                    >
                      <i className={`fas ${resolvingId === (latest?.id) ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                      {resolvingId === (latest?.id) ? 'Resolving…' : 'Mark Resolved'}
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="cw-empty-state">
              <i className="fas fa-check-circle" style={{ color: '#16a34a' }}></i>
              <p>No open queries — all clear!</p>
            </div>
          )}
        </>
      )}

      {subTab === 'history' && (
        <>
          {queryHistory.length === 0 ? (
            <div className="cw-empty-state">
              <i className="fas fa-history"></i>
              <p>No query history yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {queryHistory.map((h, i) => {
                const parsed = parseQueryNote(h.notes);
                const isResolved = h.notes?.includes('resolved');
                return (
                  <div key={h.id || i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{parsed.type}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>{(h.created_at || '').slice(0, 10)}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: isResolved ? '#dcfce7' : '#fef3c7', color: isResolved ? '#16a34a' : '#92400e', fontWeight: 600 }}>
                          {isResolved ? 'Resolved' : 'Raised'}
                        </span>
                      </div>
                    </div>
                    {parsed.docs !== '—' && <div style={{ fontSize: 12, color: '#374151' }}>Docs: {parsed.docs}</div>}
                    {parsed.extraNote && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{parsed.extraNote}</div>}
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>By: {h.changed_by || 'Staff'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {subTab === 'student' && (
        <div className="cw-empty-state">
          <i className="fas fa-user-clock"></i>
          <p>
            {app.awaiting_from === 'Student'
              ? 'Currently awaiting documents from student.'
              : 'No pending student docs.'}
          </p>
        </div>
      )}

      {subTab === 'bank' && (
        <div className="cw-empty-state">
          <i className="fas fa-university"></i>
          <p>
            {app.awaiting_from === 'Bank'
              ? `Awaiting action from ${app.bank}.`
              : 'No pending bank actions.'}
          </p>
          {app.awaiting_from === 'Bank' && app.sla_days != null && (
            <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
              <i className="fas fa-clock"></i> SLA: {app.sla_days}d open
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TAB 5: PACK HISTORY ─────────────────────────────────────────
function PackHistoryTab({ app, onGeneratePack }) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPacks = useCallback(() => {
    setLoading(true);
    packsApi.getPacks(app.id).then(setPacks).catch(() => setPacks([])).finally(() => setLoading(false));
  }, [app.id]);

  useEffect(() => { loadPacks(); }, [loadPacks]);

  return (
    <div className="cw-tab-content">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary btn-sm" onClick={async () => { await onGeneratePack?.('Print', ''); loadPacks(); }}>
          <i className="fas fa-box"></i> Generate New Pack
        </button>
      </div>
      <div className="table-container">
        <div className="table-header">
          <h3>Pack History</h3>
          <span className="results-count">{loading ? '…' : packs.length === 0 ? 'No packs yet' : `${packs.length} pack${packs.length !== 1 ? 's' : ''}`}</span>
        </div>
        <table className="app-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Generated At</th>
              <th>Generated By</th>
              <th>Lender</th>
              <th>Docs</th>
              <th>Sent Via</th>
              <th>Sent To</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}><i className="fas fa-spinner fa-spin"></i> Loading…</td></tr>
            ) : packs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                  <i className="fas fa-box" style={{ fontSize: 28, display: 'block', marginBottom: 10 }}></i>
                  No packs generated yet. Click "Generate New Pack" to create the first version.
                </td>
              </tr>
            ) : packs.map(p => (
              <tr key={p.id}>
                <td><span style={{ fontWeight: 600 }}>v{p.version}</span></td>
                <td style={{ fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ fontSize: 12 }}>{p.generated_by || 'Staff'}</td>
                <td style={{ fontSize: 12 }}>{p.lender || app.bank}</td>
                <td style={{ fontSize: 12 }}>{p.docs_count}</td>
                <td style={{ fontSize: 12 }}>{p.sent_via || '—'}</td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{p.sent_to || '—'}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={async () => { await onGeneratePack?.('Reprint', p.sent_to || ''); loadPacks(); }}>
                    <i className="fas fa-redo"></i> Reprint
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

// ─── TAB 6: TIMELINE / AUDIT ─────────────────────────────────────
function TimelineTab({ app }) {
  const [filter, setFilter] = useState('all');
  const FILTERS = [
    { key: 'all',       label: 'All'            },
    { key: 'status',    label: 'Status Changes' },
    { key: 'docs',      label: 'Docs'           },
    { key: 'queries',   label: 'Queries'        },
    { key: 'packs',     label: 'Packs'          },
    { key: 'whatsapp',  label: 'WhatsApp / WABA'},
    { key: 'proof',     label: 'Proof Uploads'  },
  ];

  const history = app.history || [];

  const filteredHistory = filter === 'all'
    ? history
    : history.filter(h => h.entry_type === filter || h.source === filter);

  return (
    <div className="cw-tab-content">
      <div className="cw-timeline-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`bank-chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredHistory.length === 0 ? (
        <div className="cw-empty-state">
          <i className="fas fa-history"></i>
          <p>No timeline events yet.</p>
        </div>
      ) : (
        <div className="timeline">
          {filteredHistory.map((h, i) => {
            const cfg      = STATUS_CONFIG[h.status];
            const isCurrent = i === 0;
            return (
              <div key={h.id || i} className="timeline-item">
                <div className={`timeline-dot ${cfg?.color || 'grey'}`}>
                  <i className={`fas ${isCurrent ? 'fa-circle' : 'fa-check'}`}></i>
                </div>
                <div className="timeline-content">
                  <div className="title">{cfg?.label || h.status}</div>
                  <div className="subtitle">
                    {h.notes || '—'}
                    {h.sub_status && h.sub_status !== '-' ? ` (${h.sub_status})` : ''}
                  </div>
                  <div className="time">
                    <i className="fas fa-clock"></i> {formatDateTime(h.created_at)}
                    &nbsp;·&nbsp;
                    <i className="fas fa-user"></i> {h.changed_by}
                    &nbsp;·&nbsp;
                    <span className="status-badge status-blue" style={{ fontSize: 10, padding: '2px 8px' }}>
                      {h.source || h.entry_type || 'Manual'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TAB 7: TASKS / NOTES ────────────────────────────────────────
function TasksTab({ app }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({ title: '', assignee: '', due: '' });
  const [newNote, setNewNote] = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = () => {
    setLoading(true);
    crmApi.getTasks(app.id).then(d => setItems(d.tasks || [])).catch(() => setItems([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [app.id]);

  const tasks = items.filter(i => i.action_type !== 'NOTE');
  const notes = items.filter(i => i.action_type === 'NOTE');

  const addTask = async () => {
    if (!newTask.title.trim()) { toast.error('Enter a task title'); return; }
    setSaving(true);
    try {
      await crmApi.createTask({
        case_id:     app.id,
        title:       newTask.title,
        description: newTask.assignee || null,
        action_type: 'OTHER',
        owner_party: 'STAFF',
        priority:    'NORMAL',
        due_at:      newTask.due || null,
      });
      setNewTask({ title: '', assignee: '', due: '' });
      toast.success('Task added');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to add task');
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await crmApi.createTask({
        case_id:     app.id,
        title:       newNote,
        action_type: 'NOTE',
        owner_party: 'STAFF',
        priority:    'NORMAL',
      });
      setNewNote('');
      toast.success('Note added');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to add note');
    }
    setSaving(false);
  };

  const markDone = async (id) => {
    try {
      await crmApi.updateTask(id, { status: 'DONE' });
      toast.success('Task marked done');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  return (
    <div className="cw-tab-content">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading tasks…</div>
      ) : (
      <div className="cw-tasks-layout">
        {/* Tasks */}
        <div className="cw-panel">
          <div className="cw-panel-title"><i className="fas fa-tasks"></i> Internal Tasks</div>
          <div className="cw-task-form">
            <input
              className="cw-input"
              placeholder="Task title…"
              value={newTask.title}
              onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="cw-input"
                placeholder="Assign to…"
                value={newTask.assignee}
                onChange={e => setNewTask(t => ({ ...t, assignee: e.target.value }))}
              />
              <input
                type="date"
                className="cw-input"
                value={newTask.due}
                onChange={e => setNewTask(t => ({ ...t, due: e.target.value }))}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={addTask} disabled={saving}>
              <i className="fas fa-plus"></i> Add Task
            </button>
          </div>

          {tasks.filter(t => t.status !== 'DONE').length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              No open tasks.
            </div>
          ) : (
            tasks.filter(t => t.status !== 'DONE').map(t => (
              <div key={t.id} className="cw-task-item">
                <div>
                  <div className="cw-task-title">{t.title}</div>
                  <div className="cw-task-meta">
                    {t.description && <span><i className="fas fa-user"></i> {t.description}</span>}
                    {t.due_at      && <span><i className="fas fa-calendar"></i> {t.due_at?.slice(0,10)}</span>}
                    <span style={{ color: t.priority === 'URGENT' ? '#ef4444' : t.priority === 'HIGH' ? '#f59e0b' : '#9ca3af', fontSize: 10, fontWeight: 600 }}>{t.priority}</span>
                  </div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => markDone(t.id)}>
                  <i className="fas fa-check"></i> Done
                </button>
              </div>
            ))
          )}

          {tasks.filter(t => t.status === 'DONE').length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Completed</div>
              {tasks.filter(t => t.status === 'DONE').map(t => (
                <div key={t.id} className="cw-task-item" style={{ opacity: 0.5 }}>
                  <div>
                    <div className="cw-task-title" style={{ textDecoration: 'line-through' }}>{t.title}</div>
                    <div className="cw-task-meta">{t.completed_at?.slice(0,10)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="cw-panel">
          <div className="cw-panel-title"><i className="fas fa-comment-alt"></i> Internal Notes</div>
          <div className="cw-task-form">
            <textarea
              className="cw-input"
              placeholder="Add an internal note…"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              style={{ minHeight: 80, resize: 'vertical' }}
            />
            <button className="btn btn-primary btn-sm" onClick={addNote} disabled={saving}>
              <i className="fas fa-comment"></i> Add Note
            </button>
          </div>
          {notes.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              No notes yet.
            </div>
          ) : (
            notes.map(n => (
              <div key={n.id} className="cw-note-item">
                <div className="cw-note-text">{n.title}</div>
                <div className="cw-note-meta">
                  <i className="fas fa-user"></i> Staff
                  &nbsp;·&nbsp;
                  <i className="fas fa-clock"></i> {formatDateTime(n.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// ─── TAB 8: CLOSE / OUTCOME ──────────────────────────────────────
function CloseTab({ app, onClose, onUpdated }) {
  const [form, setForm] = useState({
    close_reason:   '',
    winner_lender:  '',
    final_amount:   '',
    final_roi:      '',
    close_notes:    '',
  });
  const [saving, setSaving] = useState(false);

  const isSanctioned = ['SANCTIONED', 'CONDITIONAL_SANCTION', 'SANCTION_ACCEPTED'].includes(app.status);

  const handleCloseCase = async () => {
    if (!form.close_reason) { toast.error('Select a close reason'); return; }
    setSaving(true);
    try {
      const payload = {
        status:       form.winner_lender ? 'DISBURSED' : 'CLOSED',
        close_reason: form.close_reason,
        sub_status:   form.close_reason,
        notes:        `Closed: ${form.close_reason}${form.winner_lender ? ` | Winner: ${form.winner_lender}` : ''}${form.close_notes ? `. ${form.close_notes}` : ''}`,
      };
      if (form.final_amount)   payload.disbursed_amount = Number(form.final_amount);
      if (form.final_roi)      payload.roi = Number(form.final_roi);
      if (form.winner_lender)  payload.disbursed_date = new Date().toISOString().slice(0, 10);
      await api.updateApplication(app.id, payload);
      toast.success('Case closed successfully');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to close case');
    }
    setSaving(false);
  };

  return (
    <div className="cw-tab-content">
      <div className="cw-panel" style={{ maxWidth: 640 }}>
        <div className="cw-panel-title">
          <i className="fas fa-flag-checkered"></i> Close Case / Outcome
        </div>

        {isSanctioned && (
          <div className="bank-panel-note" style={{ marginBottom: 16 }}>
            <i className="fas fa-star" style={{ marginRight: 6 }}></i>
            This case has a sanction. Select the winner lender to record the outcome.
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Case Closed Reason (required)</label>
          <select value={form.close_reason} onChange={e => setForm(f => ({ ...f, close_reason: e.target.value }))}>
            <option value="">— Select close reason —</option>
            {CLOSE_REASON_CODES.map(r => (
              <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {isSanctioned && (
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Winner Lender (from sanctioned lenders)</label>
            <select value={form.winner_lender} onChange={e => setForm(f => ({ ...f, winner_lender: e.target.value }))}>
              <option value="">— Select winner —</option>
              <option value={app.bank}>{app.bank} (Sanctioned)</option>
            </select>
          </div>
        )}

        <div className="form-row" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label>Final Loan Amount (optional)</label>
            <input
              type="number"
              value={form.final_amount}
              onChange={e => setForm(f => ({ ...f, final_amount: e.target.value }))}
              placeholder="e.g. 2500000"
            />
          </div>
          <div className="form-group">
            <label>Final ROI (optional)</label>
            <input
              value={form.final_roi}
              onChange={e => setForm(f => ({ ...f, final_roi: e.target.value }))}
              placeholder="e.g. 9.5"
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Close Notes</label>
          <textarea
            value={form.close_notes}
            onChange={e => setForm(f => ({ ...f, close_notes: e.target.value }))}
            placeholder="Notes about the closure…"
            style={{ minHeight: 80 }}
          />
        </div>

        {form.winner_lender && (
          <div className="bank-panel-note" style={{ marginBottom: 16 }}>
            <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
            Selecting a winner will auto-close all other lender applications with reason "Student chose another lender".
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleCloseCase}
          disabled={saving}
          style={{ background: '#dc2626' }}
        >
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-flag-checkered'}`}></i>
          {saving ? 'Closing…' : 'Close Case'}
        </button>
      </div>
    </div>
  );
}
