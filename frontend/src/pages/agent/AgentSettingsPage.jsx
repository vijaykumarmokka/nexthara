import { useState, useEffect } from 'react';
import { agentApi } from '../../api';
import { useAuth } from '../../AuthContext';
import toast from 'react-hot-toast';

const C = { primary: '#2563EB', light: '#DBEAFE', bg: '#F8FAFC', card: '#FFFFFF', border: '#E5E7EB', text: '#0F172A', muted: '#64748B' };

const TABS = [
  { key: 'org',      label: 'Organization',  icon: 'fa-building' },
  { key: 'branches', label: 'Branches',       icon: 'fa-code-branch' },
  { key: 'users',    label: 'Users & Roles',  icon: 'fa-users' },
  { key: 'whatsapp', label: 'WhatsApp',       icon: 'fa-comment-dots' },
  { key: 'audit',    label: 'Audit Logs',     icon: 'fa-shield-alt' },
];

const ROLES = ['ORG_OWNER','BRANCH_MANAGER','COUNSELOR','ACCOUNTANT','VIEW_ONLY'];
const ROLE_LABELS = { ORG_OWNER: 'Owner', BRANCH_MANAGER: 'Branch Mgr', COUNSELOR: 'Counselor', ACCOUNTANT: 'Accountant', VIEW_ONLY: 'View Only' };
const ROLE_COLORS = { ORG_OWNER: '#7C3AED', BRANCH_MANAGER: '#1D4ED8', COUNSELOR: '#0891B2', ACCOUNTANT: '#D97706', VIEW_ONLY: '#6B7280' };

function RoleBadge({ role }) {
  const color = ROLE_COLORS[role] || '#6B7280';
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${color}20`, color }}>{ROLE_LABELS[role] || role}</span>;
}

export default function AgentSettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('org');
  const canManage = ['ORG_OWNER','BRANCH_MANAGER'].includes(user?.role);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>Settings</h2>
        <div style={{ fontSize: 12, color: C.muted }}>Manage your organization, users and preferences</div>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.key ? 600 : 500,
            color: tab === t.key ? C.primary : C.muted,
            borderBottom: tab === t.key ? `2px solid ${C.primary}` : '2px solid transparent',
            marginBottom: -1, display: 'flex', gap: 6, alignItems: 'center',
          }}>
            <i className={`fas ${t.icon}`} style={{ fontSize: 12 }}></i>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'org'      && <OrgTab canManage={canManage} />}
      {tab === 'branches' && <BranchesTab canManage={canManage} />}
      {tab === 'users'    && <UsersTab canManage={canManage} user={user} />}
      {tab === 'whatsapp' && <WhatsAppTab />}
      {tab === 'audit'    && <AuditTab />}
    </div>
  );
}

// ─── Org Tab ──────────────────────────────────────────────────────────────────

function OrgTab({ canManage }) {
  const [org, setOrg]       = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    agentApi.getProfile()
      .then(d => { setOrg(d); setForm({ name: d.name, legal_name: d.legal_name || '', gstin: d.gstin || '' }); })
      .catch(() => toast.error('Failed to load org profile'));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const updated = await agentApi.updateProfile(form);
      setOrg(updated);
      setEditing(false);
      toast.success('Organization profile updated');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  if (!org) return <div style={{ color: C.muted, padding: 24 }}>Loading...</div>;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, maxWidth: 520 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>Organization Profile</div>
        {canManage && !editing && (
          <button onClick={() => setEditing(true)} style={{ padding: '6px 14px', background: C.light, color: C.primary, border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Organization Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
          <Field label="Legal Name" value={form.legal_name} onChange={v => setForm(f => ({ ...f, legal_name: v }))} />
          <Field label="GSTIN" value={form.gstin} onChange={v => setForm(f => ({ ...f, gstin: v }))} />
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '9px', border: `1px solid ${C.border}`, borderRadius: 8, background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: C.muted }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ flex: 1, padding: '9px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <InfoRow label="Organization Name" value={org.name} />
          <InfoRow label="Legal Name" value={org.legal_name} />
          <InfoRow label="GSTIN" value={org.gstin} />
          <InfoRow label="Status" value={<span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: org.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2', color: org.status === 'ACTIVE' ? '#166534' : '#991B1B' }}>{org.status}</span>} />
          <InfoRow label="Plan" value={org.plan_id || 'STARTER'} />
          <InfoRow label="Member Since" value={new Date(org.created_at).toLocaleDateString()} />
        </div>
      )}
    </div>
  );
}

// ─── Branches Tab ─────────────────────────────────────────────────────────────

function BranchesTab({ canManage }) {
  const [branches, setBranches] = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name: '', city: '', timezone: 'Asia/Kolkata' });
  const [saving, setSaving]     = useState(false);

  function load() {
    agentApi.getBranches()
      .then(setBranches)
      .catch(() => toast.error('Failed to load branches'));
  }

  useEffect(() => { load(); }, []);

  async function createBranch(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await agentApi.createBranch(form);
      toast.success('Branch created');
      setShowAdd(false);
      setForm({ name: '', city: '', timezone: 'Asia/Kolkata' });
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{branches.length} Branch{branches.length !== 1 ? 'es' : ''}</div>
        {canManage && (
          <button onClick={() => setShowAdd(s => !s)} style={{ padding: '7px 14px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add Branch
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={createBranch} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 4 }}>New Branch</div>
          <Field label="Branch Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
          <Field label="City" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
          <Field label="Timezone" value={form.timezone} onChange={v => setForm(f => ({ ...f, timezone: v }))} />
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '9px', border: `1px solid ${C.border}`, borderRadius: 8, background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: C.muted }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creating...' : 'Create Branch'}
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {branches.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No branches found.</div>}
        {branches.map(b => (
          <div key={b.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{b.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{b.city || 'No city'} · {b.timezone}</div>
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>{new Date(b.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ canManage, user }) {
  const [users, setUsers]   = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]     = useState({ name: '', email: '', phone_e164: '', password: '', role: 'COUNSELOR' });
  const [saving, setSaving] = useState(false);

  function load() {
    agentApi.getUsers()
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'));
  }

  useEffect(() => { load(); }, []);

  async function createUser(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await agentApi.createUser(form);
      toast.success('User created');
      setShowAdd(false);
      setForm({ name: '', email: '', phone_e164: '', password: '', role: 'COUNSELOR' });
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function toggleActive(u) {
    try {
      await agentApi.updateUser(u.id, { is_active: u.is_active ? 0 : 1 });
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) { toast.error(err.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{users.length} Team Member{users.length !== 1 ? 's' : ''}</div>
        {canManage && (
          <button onClick={() => setShowAdd(s => !s)} style={{ padding: '7px 14px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add User
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={createUser} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 4 }}>Invite New User</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Full Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
            <Field label="Email *" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" required />
            <Field label="Phone" value={form.phone_e164} onChange={v => setForm(f => ({ ...f, phone_e164: v }))} placeholder="+91..." />
            <Field label="Temp Password *" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" required />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4 }}>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, color: C.text, background: C.bg, outline: 'none' }}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '9px', border: `1px solid ${C.border}`, borderRadius: 8, background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: C.muted }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      )}

      {/* Permissions matrix hint */}
      <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#0C4A6E' }}>
        <strong>Role Permissions:</strong> Owner = full access · Branch Mgr = leads/cases/docs/branch users · Counselor = leads/cases/docs · Accountant = commissions view · View Only = read only
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No users found.</div>}
        {users.map(u => (
          <div key={u.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: u.is_active ? 1 : 0.5 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.primary }}>{u.name?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.text, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {u.name}
                  {u.id === user?.id && <span style={{ fontSize: 10, color: C.muted }}>(you)</span>}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <RoleBadge role={u.role} />
              {canManage && u.id !== user?.id && (
                <button onClick={() => toggleActive(u)}
                  style={{ padding: '4px 10px', background: u.is_active ? '#FEE2E2' : '#DCFCE7', color: u.is_active ? '#DC2626' : '#16A34A', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── WhatsApp Tab ─────────────────────────────────────────────────────────────

function WhatsAppTab() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 28, maxWidth: 520 }}>
      <div style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 12 }}>WhatsApp Configuration</div>
      <div style={{ padding: '16px 18px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <i className="fab fa-whatsapp" style={{ fontSize: 24, color: '#25D366' }}></i>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#166534' }}>WhatsApp Business API</div>
            <div style={{ fontSize: 12, color: '#15803D', marginTop: 2 }}>
              Connect your WhatsApp Business number to send automated messages to students.
            </div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
        WhatsApp Business API integration is available on the <strong>Pro</strong> and <strong>Enterprise</strong> plans.<br /><br />
        Features include:<br />
        • Automated follow-up reminders to students<br />
        • Document request notifications<br />
        • Status update broadcasts<br />
        • Template message management<br /><br />
        Contact <strong>support@nexthara.com</strong> to upgrade your plan and configure WhatsApp integration.
      </div>
      <button style={{ marginTop: 20, padding: '10px 20px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        <i className="fab fa-whatsapp" style={{ marginRight: 8 }}></i>Request WhatsApp Setup
      </button>
    </div>
  );
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────

function AuditTab() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 28 }}>
      <div style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 8 }}>Audit Logs</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
        Track all actions taken by your team within this organization.
      </div>
      <div style={{ padding: '14px 16px', background: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD', fontSize: 12, color: '#0C4A6E', lineHeight: 1.7 }}>
        <strong>Audit trail includes:</strong><br />
        • Lead creation and stage updates<br />
        • Case conversions<br />
        • Document uploads<br />
        • User account changes<br />
        • Commission disputes<br /><br />
        Audit log export and advanced filtering is available on the <strong>Enterprise</strong> plan.
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder || ''}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, color: C.text, background: C.bg, boxSizing: 'border-box', outline: 'none' }}
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 160, flexShrink: 0, fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, flex: 1 }}>{value ?? '—'}</div>
    </div>
  );
}
