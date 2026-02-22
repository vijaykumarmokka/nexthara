import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import toast from 'react-hot-toast';

function StatusBadge({ active }) {
  return (
    <span style={{ background: active ? '#dcfce7' : '#fee2e2', color: active ? '#166534' : '#991b1b', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ── Add Bank Wizard (4 steps) ─────────────────────────────────────────────────
function AddBankWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', country: '', default_sla_days: 7, logo_url: '',
    admin_name: '', admin_email: '', admin_phone: '',
    allow_product_management: true, allow_announcements: true,
    allow_api: false, require_proof_for_sanction: true,
  });
  const [creating, setCreating] = useState(false);

  const STEPS = ['Basic Info', 'Bank Super Admin', 'Feature Toggles', 'Review'];

  const handleCreate = async () => {
    if (!form.name) { toast.error('Bank name required'); return; }
    if (!form.admin_email) { toast.error('Admin email required'); return; }
    setCreating(true);
    try {
      const result = await adminApi.createBankAdmin({
        name: form.name,
        country: form.country,
        default_sla_days: form.default_sla_days,
        logo_url: form.logo_url,
        allow_product_management: form.allow_product_management,
        allow_announcements: form.allow_announcements,
        allow_api: form.allow_api,
        require_proof_for_sanction: form.require_proof_for_sanction,
        admin_name: form.admin_name,
        admin_email: form.admin_email,
        admin_phone: form.admin_phone,
      });
      toast.success(`Bank "${form.name}" created. Admin login: ${form.admin_email} / Nexthara@123`);
      onCreated();
      onClose();
    } catch (e) { toast.error(e.message || 'Failed to create bank'); } finally { setCreating(false); }
  };

  const f = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 80px rgba(0,0,0,0.25)' }}>
        {/* Step Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1d4d' }}>Add New Bank</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step > i + 1 ? '#22c55e' : step === i + 1 ? '#1a1d4d' : '#e5e7eb', color: step >= i + 1 ? '#fff' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 12, fontWeight: 700 }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 10, color: step === i + 1 ? '#1a1d4d' : '#9ca3af', marginTop: 4, fontWeight: step === i + 1 ? 700 : 400 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div style={{ padding: 28 }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>Step 1 — Basic Bank Info</h4>
              {[
                { key: 'name', label: 'Bank Name *', placeholder: 'e.g. HDFC Bank' },
                { key: 'country', label: 'Country', placeholder: 'India' },
                { key: 'logo_url', label: 'Logo URL', placeholder: 'https://...' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{field.label}</label>
                  <input value={form[field.key] || ''} onChange={e => f(field.key, e.target.value)} placeholder={field.placeholder} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Default SLA Days</label>
                <input type="number" value={form.default_sla_days} onChange={e => f('default_sla_days', Number(e.target.value))} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>Step 2 — Bank Super Admin</h4>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 12, fontSize: 12, color: '#0369a1' }}>
                This user will have SUPER_ADMIN access in the Bank Portal for {form.name || 'this bank'}.
              </div>
              {[
                { key: 'admin_name', label: 'Admin Name *', placeholder: 'John Doe' },
                { key: 'admin_email', label: 'Admin Email *', placeholder: 'john@bank.com' },
                { key: 'admin_phone', label: 'Admin Phone', placeholder: '+91 XXXXX XXXXX' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{field.label}</label>
                  <input value={form[field.key] || ''} onChange={e => f(field.key, e.target.value)} placeholder={field.placeholder} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, fontSize: 12, color: '#6b7280' }}>
                <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                An invite link will be generated after bank creation.
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>Step 3 — Feature Toggles</h4>
              {[
                { key: 'allow_product_management', label: 'Allow Product Management', desc: 'Bank staff can create/edit loan products' },
                { key: 'allow_announcements', label: 'Allow Announcements', desc: 'Bank can post announcements to their portal' },
                { key: 'allow_api', label: 'Enable API Access', desc: 'Allow bank to use external API for integrations' },
                { key: 'require_proof_for_sanction', label: 'Require Proof for Sanction/Disburse', desc: 'Block status change without proof upload' },
              ].map(toggle => (
                <div key={toggle.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{toggle.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{toggle.desc}</div>
                  </div>
                  <div onClick={() => f(toggle.key, !form[toggle.key])} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', background: form[toggle.key] ? '#22c55e' : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'left 0.2s', left: form[toggle.key] ? 23 : 3 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div>
              <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#374151' }}>Step 4 — Review & Create</h4>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Bank Name', value: form.name },
                  { label: 'Country', value: form.country || '—' },
                  { label: 'Default SLA', value: `${form.default_sla_days} days` },
                  { label: 'Admin Name', value: form.admin_name || '—' },
                  { label: 'Admin Email', value: form.admin_email || '—' },
                  { label: 'Product Mgmt', value: form.allow_product_management ? 'Enabled' : 'Disabled' },
                  { label: 'API Access', value: form.allow_api ? 'Enabled' : 'Disabled' },
                  { label: 'Proof Required', value: form.require_proof_for_sanction ? 'Yes' : 'No' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, color: '#1f2937' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          {step < 4 ? (
            <button onClick={() => {
              if (step === 1 && !form.name) { toast.error('Bank name is required'); return; }
              if (step === 2 && !form.admin_email) { toast.error('Admin email is required'); return; }
              setStep(s => s + 1);
            }} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Next →
            </button>
          ) : (
            <button onClick={handleCreate} disabled={creating || !form.name} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: (!form.name || creating) ? 0.6 : 1 }}>
              {creating ? 'Creating...' : '✓ Create Bank'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminBanksGovPage() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getBanksGovernance().then(d => setBanks(d.banks || [])).catch(() => setBanks([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleBank = async (bank) => {
    // eslint-disable-next-line no-restricted-globals
    const newState = !bank.is_active;
    if (!window.confirm(`${newState ? 'Activate' : 'Deactivate'} bank "${bank.name}"?`)) return;
    try {
      await adminApi.toggleBank(bank.id, newState);
      toast.success(`Bank ${newState ? 'activated' : 'deactivated'}`);
      load();
    } catch { toast.error('Failed to update bank'); }
  };

  const filtered = banks.filter(b => !search || b.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1d4d' }}>Banks Governance</h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Director-level bank controls — activate, deactivate, monitor</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search banks..." style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: 200 }} />
          <button onClick={() => setShowWizard(true)} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add Bank
          </button>
        </div>
      </div>

      {/* Summary Tiles */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Banks', value: banks.length, color: '#1a1d4d' },
          { label: 'Active', value: banks.filter(b => b.is_active).length, color: '#22c55e' },
          { label: 'Inactive', value: banks.filter(b => !b.is_active).length, color: '#ef4444' },
          { label: 'Total Apps', value: banks.reduce((s, b) => s + (b.total_apps || 0), 0), color: '#3b82f6' },
          { label: 'SLA Breaches', value: banks.reduce((s, b) => s + (b.sla_breaches || 0), 0), color: '#f97316' },
        ].map(t => (
          <div key={t.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 20px', flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.color }}>{t.value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{t.label}</div>
          </div>
        ))}
      </div>

      {/* Banks Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading banks...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Bank Name', 'Status', 'Products', 'Branches', 'Portal Users', 'Total Apps', 'Sanctioned', 'Sanction %', 'SLA Breaches', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(bank => (
                <tr key={bank.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1f2937' }}>
                    <div>{bank.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{bank.id}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge active={bank.is_active} /></td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{bank.products || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{bank.branches || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{bank.portal_users || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{bank.total_apps || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#22c55e', fontWeight: 600 }}>{bank.sanctioned || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ background: (bank.sanction_pct || 0) > 50 ? '#dcfce7' : '#fef3c7', color: (bank.sanction_pct || 0) > 50 ? '#166534' : '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                      {bank.sanction_pct || 0}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {(bank.sla_breaches || 0) > 0 ? (
                      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{bank.sla_breaches}</span>
                    ) : <span style={{ color: '#22c55e', fontSize: 11 }}>None</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => toggleBank(bank)}
                      style={{ background: bank.is_active ? '#fee2e2' : '#dcfce7', color: bank.is_active ? '#991b1b' : '#166534', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                    >
                      {bank.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No banks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showWizard && <AddBankWizard onClose={() => setShowWizard(false)} onCreated={load} />}
    </div>
  );
}
