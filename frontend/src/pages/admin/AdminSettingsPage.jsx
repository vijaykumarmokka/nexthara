import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import toast from 'react-hot-toast';

// ── Toggle Row ────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, value, onChange, accentColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ flex: 1, paddingRight: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d4d' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{description}</div>
      </div>
      <div onClick={() => onChange(!value)} style={{ width: 46, height: 26, borderRadius: 13, cursor: 'pointer', flexShrink: 0, background: value ? (accentColor || '#1a1d4d') : '#d1d5db', position: 'relative', transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: value ? 23 : 3, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}></div>
      </div>
    </div>
  );
}

function EmailRow({ label, description, value, onChange }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d4d', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{description}</div>
      <input type="email" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="email@example.com" style={{ width: '100%', maxWidth: 360, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  );
}

// ── Branding Tab ──────────────────────────────────────────────────────────────
function BrandingTab({ settings, onChange }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { key: 'company_name', label: 'Company Name', placeholder: 'Nexthara' },
          { key: 'support_email', label: 'Support Email', placeholder: 'support@nexthara.com' },
          { key: 'support_phone', label: 'Support Phone', placeholder: '+91 XXXXX XXXXX' },
          { key: 'dashboard_title', label: 'Dashboard Title', placeholder: 'Nexthara Loan Portal' },
          { key: 'footer_text', label: 'Footer Text', placeholder: '© 2026 Nexthara Financial Services' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input value={settings[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} placeholder={f.placeholder} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        ))}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Primary Color</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="color" value={settings.primary_color || '#1a1d4d'} onChange={e => onChange('primary_color', e.target.value)} style={{ width: 40, height: 40, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
            <input value={settings.primary_color || '#1a1d4d'} onChange={e => onChange('primary_color', e.target.value)} placeholder="#1a1d4d" style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Integrations Tab ──────────────────────────────────────────────────────────
function IntegrationsTab({ settings, onChange }) {
  const GROUPS = [
    {
      label: 'WhatsApp (WATI)',
      icon: 'fa-whatsapp',
      color: '#25d366',
      fields: [
        { key: 'wati_api_endpoint', label: 'API Endpoint', placeholder: 'https://live-mt-server.wati.io/...' },
        { key: 'wati_api_key', label: 'API Key', type: 'password', placeholder: 'Bearer token...' },
        { key: 'wati_phone_number', label: 'WhatsApp Number', placeholder: '+91XXXXXXXXXX' },
      ],
    },
    {
      label: 'Meta Leads (Facebook)',
      icon: 'fa-facebook',
      color: '#1877f2',
      fields: [
        { key: 'meta_verify_token', label: 'Webhook Verify Token', placeholder: 'Your custom verify token' },
        { key: 'meta_page_access_token', label: 'Page Access Token', type: 'password', placeholder: 'EAAxxxxxxx...' },
      ],
    },
    {
      label: 'Admission CRM',
      icon: 'fa-graduation-cap',
      color: '#22c55e',
      fields: [
        { key: 'admission_crm_url', label: 'CRM API URL', placeholder: 'https://your-crm.com/api' },
        { key: 'admission_crm_key', label: 'API Key', type: 'password', placeholder: 'your-api-key' },
      ],
    },
    {
      label: 'Email (SMTP)',
      icon: 'fa-envelope',
      color: '#6b7280',
      fields: [
        { key: 'smtp_host', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
        { key: 'smtp_port', label: 'SMTP Port', placeholder: '587' },
        { key: 'smtp_user', label: 'SMTP Username', placeholder: 'alerts@nexthara.com' },
        { key: 'smtp_pass', label: 'SMTP Password', type: 'password', placeholder: 'app password' },
        { key: 'email_from_name', label: 'From Name', placeholder: 'Nexthara Team' },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
      {GROUPS.map(g => (
        <div key={g.label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: g.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`fab ${g.icon}`} style={{ color: g.color, fontSize: 14 }}></i>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>{g.label}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {g.fields.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type || 'text'} value={settings[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} placeholder={f.placeholder} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Automation Settings Tab ───────────────────────────────────────────────────
function AutomationTab({ settings, onChange }) {
  const GROUPS = [
    {
      label: 'Automation & Messaging',
      icon: 'fa-robot',
      color: '#7b1fa2',
      settings: [
        { key: 'enable_auto_whatsapp', label: 'Auto WhatsApp Messages', description: 'Send WhatsApp notifications automatically on status changes', type: 'toggle' },
        { key: 'enable_auto_case_from_event', label: 'Auto Case from Event', description: 'Automatically create a case when an event registration converts', type: 'toggle' },
        { key: 'enable_admission_auto_sync', label: 'Admission Auto Sync', description: 'Sync leads automatically from the Admission CRM integration', type: 'toggle' },
        { key: 'enable_bank_auto_pack', label: 'Auto Bank Pack Generation', description: 'Automatically generate document packs when all docs are received', type: 'toggle' },
      ],
    },
    {
      label: 'SLA & Escalations',
      icon: 'fa-exclamation-triangle',
      color: '#e53935',
      settings: [
        { key: 'enable_sla_escalation', label: 'SLA Escalation Engine', description: 'Trigger escalation alerts when SLA deadlines are breached', type: 'toggle' },
      ],
    },
    {
      label: 'Reports & Notifications',
      icon: 'fa-envelope',
      color: '#1e88e5',
      settings: [
        { key: 'daily_report_email', label: 'Daily Report Email', description: 'Email address to receive the daily performance summary', type: 'email' },
        { key: 'escalation_l1_email', label: 'Escalation L1 Email', description: 'First-level escalation recipient', type: 'email' },
        { key: 'escalation_l2_email', label: 'Escalation L2 Email', description: 'Second-level escalation recipient', type: 'email' },
        { key: 'escalation_l3_email', label: 'Escalation L3 Email', description: 'Third-level (director) escalation recipient', type: 'email' },
      ],
    },
  ];

  const getBool = (key) => {
    const v = settings[key];
    return v === 'true' || v === true || v === 1;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      {GROUPS.map(group => (
        <div key={group.label} style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f3f4f6' }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: group.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`fas ${group.icon}`} style={{ color: group.color, fontSize: 13 }}></i>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>{group.label}</div>
          </div>
          {group.settings.map(s => s.type === 'toggle' ? (
            <ToggleRow key={s.key} label={s.label} description={s.description} value={getBool(s.key)} onChange={v => onChange(s.key, v ? 'true' : 'false')} accentColor={group.color} />
          ) : (
            <EmailRow key={s.key} label={s.label} description={s.description} value={settings[s.key] || ''} onChange={v => onChange(s.key, v)} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Security Controls Tab ─────────────────────────────────────────────────────
function SecurityTab({ settings, onChange, onSave }) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [reason, setReason] = useState('');

  const DANGER_ACTIONS = [
    { key: 'force_logout_bank', label: 'Force Logout All Bank Users', icon: 'fa-sign-out-alt', color: '#f97316', description: 'Immediately invalidate all bank portal sessions' },
    { key: 'disable_all_agents', label: 'Disable All Agent Portals', icon: 'fa-ban', color: '#ef4444', description: 'Block all agent organization logins' },
    { key: 'lock_product_editing', label: 'Lock Product Editing', icon: 'fa-lock', color: '#6b7280', description: 'Prevent banks from editing their loan products' },
    { key: 'pause_whatsapp', label: 'Pause WhatsApp Globally', icon: 'fa-pause-circle', color: '#f59e0b', description: 'Stop all outgoing WhatsApp messages system-wide' },
    { key: 'maintenance_mode', label: 'Enable Maintenance Mode', icon: 'fa-tools', color: '#ef4444', description: 'Show maintenance page to all non-admin users' },
  ];

  const executeAction = () => {
    if (!reason) { toast.error('Reason required for audit trail'); return; }
    onChange(confirmAction.key, 'true');
    onSave({ [confirmAction.key]: 'true', [`${confirmAction.key}_reason`]: reason });
    toast.success(`${confirmAction.label} executed and logged`);
    setConfirmAction(null);
    setReason('');
  };

  const getBool = (key) => {
    const v = settings[key];
    return v === 'true' || v === true || v === 1;
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <i className="fas fa-shield-alt" style={{ color: '#ef4444', fontSize: 18, marginTop: 2 }}></i>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>Director-Only Security Controls</div>
          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>These actions affect all users. Every action is logged with a mandatory reason for the audit trail.</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DANGER_ACTIONS.map(action => (
          <div key={action.key} style={{ background: '#fff', border: `1px solid ${getBool(action.key) ? action.color : '#e5e7eb'}`, borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: action.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fas ${action.icon}`} style={{ color: action.color, fontSize: 15 }}></i>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{action.label}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{action.description}</div>
                {getBool(action.key) && <div style={{ fontSize: 11, color: action.color, marginTop: 4, fontWeight: 600 }}>● CURRENTLY ACTIVE</div>}
              </div>
            </div>
            <button
              onClick={() => getBool(action.key) ? (onChange(action.key, 'false'), onSave({ [action.key]: 'false' })) : setConfirmAction(action)}
              style={{ background: getBool(action.key) ? '#f3f4f6' : action.color + '15', color: getBool(action.key) ? '#374151' : action.color, border: `1px solid ${getBool(action.key) ? '#e5e7eb' : action.color + '40'}`, borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              {getBool(action.key) ? 'Deactivate' : 'Execute'}
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', fontSize: 18 }}></i>
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#1a1d4d' }}>Confirm: {confirmAction.label}</h3>
                <div style={{ fontSize: 12, color: '#6b7280' }}>This action will be permanently logged in the audit trail.</div>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Reason (required for audit log) *</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this action is being taken..." rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => { setConfirmAction(null); setReason(''); }} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={executeAction} disabled={!reason} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !reason ? 0.5 : 1 }}>Execute Action</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
const TABS = [
  { key: 'branding', label: 'Branding', icon: 'fa-paint-brush' },
  { key: 'automation', label: 'Automation', icon: 'fa-robot' },
  { key: 'integrations', label: 'Integrations', icon: 'fa-plug' },
  { key: 'security', label: 'Security Controls', icon: 'fa-shield-alt' },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState({});
  const [activeTab, setActiveTab] = useState('branding');

  useEffect(() => {
    adminApi.getSettings().then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setPending(prev => ({ ...prev, [key]: value }));
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const save = async (overrides = null) => {
    const toSave = overrides || pending;
    if (!Object.keys(toSave).length) return;
    try {
      setSaving(true);
      await adminApi.updateSettings(toSave);
      if (!overrides) setPending({});
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(pending).length > 0;

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 22 }}></i>
      <div style={{ marginTop: 10, fontSize: 13 }}>Loading settings…</div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1d4d' }}>System Settings</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Global configuration · Branding · Integrations · Security</div>
        </div>
        {hasChanges && (
          <button onClick={() => save()} disabled={saving} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            background: 'none', border: 'none', padding: '10px 20px', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
            color: activeTab === t.key ? '#1a1d4d' : '#6b7280',
            borderBottom: `2px solid ${activeTab === t.key ? '#1a1d4d' : 'transparent'}`,
            marginBottom: -2, display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <i className={`fas ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'branding' && <BrandingTab settings={settings} onChange={handleChange} />}
      {activeTab === 'automation' && <AutomationTab settings={settings} onChange={handleChange} />}
      {activeTab === 'integrations' && <IntegrationsTab settings={settings} onChange={handleChange} />}
      {activeTab === 'security' && <SecurityTab settings={settings} onChange={handleChange} onSave={save} />}

      {/* Sticky save banner */}
      {hasChanges && activeTab !== 'security' && (
        <div style={{ position: 'sticky', bottom: 16, marginTop: 16, background: '#1a1d4d', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            <i className="fas fa-circle" style={{ color: '#fbbf24', fontSize: 8, marginRight: 8, verticalAlign: 'middle' }}></i>
            {Object.keys(pending).length} unsaved change{Object.keys(pending).length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setPending({}); adminApi.getSettings().then(setSettings).catch(() => {}); }} style={{ padding: '7px 16px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 7, background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12 }}>Discard</button>
            <button onClick={() => save()} disabled={saving} style={{ padding: '7px 18px', border: 'none', borderRadius: 7, background: '#4fc3f7', color: '#1a1d4d', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              {saving ? 'Saving…' : 'Save Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
