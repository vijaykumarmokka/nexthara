import { useState, useEffect, useCallback } from 'react';
import { crmApi } from '../../api';
import toast from 'react-hot-toast';

const COAPP_TYPES = [
  { value: 'INDIA_SALARIED', label: 'India Salaried' },
  { value: 'INDIA_SELF_EMPLOYED', label: 'India Self-Employed' },
  { value: 'NRI_SALARIED', label: 'NRI Salaried' },
  { value: 'NON_FINANCIAL', label: 'Non-Financial (Parent/Spouse)' },
  { value: 'COLLATERAL_OWNER_ONLY', label: 'Collateral Owner Only' },
];

const ADMIT_STATUS_OPTIONS = [
  { value: 'NOT_APPLIED', label: 'Not Applied Yet' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'OFFER_RECEIVED', label: 'Offer Received' },
  { value: 'DEPOSIT_PAID', label: 'Deposit Paid' },
];

const EXAM_TYPES = ['IELTS', 'TOEFL', 'GRE', 'GMAT', 'PTE', 'Duolingo'];
const CIBIL_OPTIONS = ['SCORE', 'NO_CIBIL', 'UNKNOWN'];
const RELATIONSHIPS = ['Father', 'Mother', 'Spouse', 'Sibling', 'Other'];

function Card({ title, children, action }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 20px', marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a237e' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: value ? '#111827' : '#9ca3af' }}>{value || '—'}</div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', options, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</label>
      {options ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff' }}>
          <option value="">— Select —</option>
          {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : (
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
      )}
    </div>
  );
}

function Btn({ label, onClick, color = '#1a237e', outline, small }) {
  const pad = small ? '4px 12px' : '7px 16px';
  const bg = outline ? 'transparent' : color;
  const fc = outline ? color : '#fff';
  return (
    <button onClick={onClick}
      style={{ padding: pad, background: bg, color: fc, border: `1.5px solid ${color}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 6 }}>
      {label}
    </button>
  );
}

// ── Student Profile Section ──────────────────────────────────────────────────
function StudentProfileSection({ profile, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [exams, setExams] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        student_name: profile.student_name || '',
        student_email: profile.student_email || '',
        student_phone: profile.student_phone || '',
        university: profile.university || '',
        course: profile.course || '',
        country: profile.country || '',
        intake: profile.intake || '',
        loan_amount_requested: profile.loan_amount_requested || '',
        degree: profile.degree || '',
        duration_years: profile.duration_years || '',
        admit_status: profile.admit_status || 'NOT_APPLIED',
        student_age: profile.student_age || '',
        year_of_graduation: profile.year_of_graduation || '',
        work_experience_months: profile.work_experience_months || '',
        active_loans: profile.active_loans ?? 0,
        active_loans_details: profile.active_loans_details || '',
        student_cibil_status: profile.student_cibil_status || 'UNKNOWN',
        student_cibil_score: profile.student_cibil_score || '',
      });
      try {
        setExams(profile.exams ? JSON.parse(profile.exams) : []);
      } catch { setExams([]); }
    }
  }, [profile]);

  const field = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ ...form, exams });
      setEditing(false);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  function addExam() {
    setExams(ex => [...ex, { type: 'IELTS', score: '' }]);
  }

  function removeExam(i) {
    setExams(ex => ex.filter((_, idx) => idx !== i));
  }

  function updateExam(i, key, val) {
    setExams(ex => ex.map((e, idx) => idx === i ? { ...e, [key]: val } : e));
  }

  const admitLabel = ADMIT_STATUS_OPTIONS.find(o => o.value === (form.admit_status || profile?.admit_status))?.label;
  const cibil = profile?.student_cibil_status;
  const cibilDisplay = cibil === 'SCORE' ? `Score: ${profile?.student_cibil_score || '?'}` : cibil === 'NO_CIBIL' ? 'No CIBIL' : 'Unknown';

  return (
    <Card title="Student Profile" action={
      editing
        ? <><Btn label={saving ? 'Saving…' : 'Save'} onClick={handleSave} color="#059669" /><Btn label="Cancel" onClick={() => setEditing(false)} outline color="#6b7280" /></>
        : <Btn label="Edit" onClick={() => setEditing(true)} outline color="#1a237e" />
    }>
      {editing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Input label="Full Name" value={form.student_name} onChange={field('student_name')} />
          <Input label="Email" value={form.student_email} onChange={field('student_email')} type="email" />
          <Input label="Phone" value={form.student_phone} onChange={field('student_phone')} />
          <Input label="Age" value={form.student_age} onChange={field('student_age')} type="number" />
          <Input label="University" value={form.university} onChange={field('university')} />
          <Input label="Course / Discipline" value={form.course} onChange={field('course')} />
          <Input label="Degree" value={form.degree} onChange={field('degree')} />
          <Input label="Country" value={form.country} onChange={field('country')} />
          <Input label="Intake" value={form.intake} onChange={field('intake')} />
          <Input label="Duration (years)" value={form.duration_years} onChange={field('duration_years')} type="number" />
          <Input label="Admit Status" value={form.admit_status} onChange={field('admit_status')} options={ADMIT_STATUS_OPTIONS} />
          <Input label="Loan Required (₹)" value={form.loan_amount_requested} onChange={field('loan_amount_requested')} type="number" />
          <Input label="Year of Graduation" value={form.year_of_graduation} onChange={field('year_of_graduation')} type="number" />
          <Input label="Work Exp (months)" value={form.work_experience_months} onChange={field('work_experience_months')} type="number" />
          <Input label="Active Loans" value={form.active_loans} onChange={field('active_loans')} options={[{value:0,label:'None'},{value:1,label:'Yes (has active loans)'}]} />
          <Input label="CIBIL Status" value={form.student_cibil_status} onChange={field('student_cibil_status')} options={CIBIL_OPTIONS.map(c => ({ value: c, label: c.replace('_', ' ') }))} />
          {form.student_cibil_status === 'SCORE' && (
            <Input label="CIBIL Score" value={form.student_cibil_score} onChange={field('student_cibil_score')} type="number" />
          )}
          {form.active_loans == 1 && (
            <div style={{ gridColumn: '1/-1' }}>
              <Input label="Active Loans Details" value={form.active_loans_details} onChange={field('active_loans_details')} />
            </div>
          )}
          {/* Exams */}
          <div style={{ gridColumn: '1/-1', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Exam Scores</span>
              <Btn label="+ Add Exam" onClick={addExam} outline color="#7c3aed" small />
            </div>
            {exams.map((ex, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <select value={ex.type} onChange={e => updateExam(i, 'type', e.target.value)}
                  style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" value={ex.score} onChange={e => updateExam(i, 'score', e.target.value)} placeholder="Score"
                  style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                <button onClick={() => removeExam(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
          <Field label="Name" value={profile?.student_name} />
          <Field label="Email" value={profile?.student_email} />
          <Field label="Phone" value={profile?.student_phone} />
          <Field label="University" value={profile?.university} />
          <Field label="Course" value={profile?.course} />
          <Field label="Country" value={profile?.country} />
          <Field label="Intake" value={profile?.intake} />
          <Field label="Degree" value={profile?.degree} />
          <Field label="Duration" value={profile?.duration_years ? `${profile.duration_years} years` : null} />
          <Field label="Admit Status" value={admitLabel} />
          <Field label="Loan Required" value={profile?.loan_amount_requested ? `₹${Number(profile.loan_amount_requested).toLocaleString('en-IN')}` : null} />
          <Field label="CIBIL" value={cibilDisplay} />
          <Field label="Age" value={profile?.student_age} />
          <Field label="Year of Graduation" value={profile?.year_of_graduation} />
          <Field label="Work Experience" value={profile?.work_experience_months ? `${profile.work_experience_months} months` : null} />
          <Field label="Active Loans" value={profile?.active_loans ? 'Yes' : 'None'} />
          {exams.length > 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Exam Scores" value={exams.map(e => `${e.type}: ${e.score}`).join(' · ')} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Co-applicant Card ─────────────────────────────────────────────────────────
function CoapplicantCard({ coapp, caseId, onUpdated, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      coapp_type: coapp.coapp_type || 'INDIA_SALARIED',
      name: coapp.name || '',
      relation: coapp.relation || '',
      phone: coapp.phone || '',
      email: coapp.email || '',
      age: coapp.age || '',
      income_source: coapp.income_source || '',
      monthly_income: coapp.monthly_income || '',
      last_drawn_salary: coapp.last_drawn_salary || '',
      active_loans_summary: coapp.active_loans_summary || '',
      cibil_status: coapp.cibil_status || 'UNKNOWN',
      cibil_score: coapp.cibil_score || '',
      is_primary: coapp.is_primary ?? 0,
    });
  }, [coapp]);

  const field = k => v => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      await crmApi.updateCoapplicant(caseId, coapp.id, form);
      setEditing(false);
      toast.success('Co-applicant updated');
      onUpdated();
    } catch (e) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  const typeLabel = COAPP_TYPES.find(t => t.value === coapp.coapp_type)?.label || coapp.coapp_type;
  const typeColors = {
    INDIA_SALARIED: '#1d4ed8', INDIA_SELF_EMPLOYED: '#0891b2',
    NRI_SALARIED: '#7c3aed', NON_FINANCIAL: '#64748b', COLLATERAL_OWNER_ONLY: '#b45309',
  };
  const tc = typeColors[coapp.coapp_type] || '#374151';

  return (
    <Card title={
      <span>
        {coapp.is_primary ? <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, padding: '1px 6px', borderRadius: 4, marginRight: 6 }}>PRIMARY</span> : null}
        {coapp.name}
        <span style={{ background: `${tc}18`, color: tc, fontSize: 10, padding: '2px 8px', borderRadius: 10, marginLeft: 8, fontWeight: 600 }}>{typeLabel}</span>
      </span>
    } action={
      editing
        ? <><Btn label={saving ? 'Saving…' : 'Save'} onClick={handleSave} color="#059669" /><Btn label="Cancel" onClick={() => setEditing(false)} outline color="#6b7280" /></>
        : <><Btn label="Edit" onClick={() => setEditing(true)} outline color="#1a237e" /><Btn label="Remove" onClick={onDelete} outline color="#ef4444" /></>
    }>
      {editing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Input label="Type" value={form.coapp_type} onChange={field('coapp_type')} options={COAPP_TYPES} />
          <Input label="Full Name" value={form.name} onChange={field('name')} />
          <Input label="Relationship" value={form.relation} onChange={field('relation')} options={RELATIONSHIPS} />
          <Input label="Phone" value={form.phone} onChange={field('phone')} />
          <Input label="Email" value={form.email} onChange={field('email')} type="email" />
          <Input label="Age" value={form.age} onChange={field('age')} type="number" />
          <Input label="Income Source" value={form.income_source} onChange={field('income_source')} options={['Salaried','Business','Rental','Other']} />
          <Input label="Monthly Income (₹)" value={form.monthly_income} onChange={field('monthly_income')} type="number" />
          <Input label="Last Drawn Salary (₹)" value={form.last_drawn_salary} onChange={field('last_drawn_salary')} type="number" />
          <Input label="Active Loans Summary" value={form.active_loans_summary} onChange={field('active_loans_summary')} />
          <Input label="CIBIL Status" value={form.cibil_status} onChange={field('cibil_status')} options={CIBIL_OPTIONS.map(c => ({ value: c, label: c.replace('_', ' ') }))} />
          {form.cibil_status === 'SCORE' && <Input label="CIBIL Score" value={form.cibil_score} onChange={field('cibil_score')} type="number" />}
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={!!form.is_primary} onChange={e => field('is_primary')(e.target.checked ? 1 : 0)} id={`primary_${coapp.id}`} />
            <label htmlFor={`primary_${coapp.id}`} style={{ fontSize: 13 }}>Primary Co-applicant</label>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
          <Field label="Relation" value={coapp.relation} />
          <Field label="Phone" value={coapp.phone} />
          <Field label="Email" value={coapp.email} />
          <Field label="Age" value={coapp.age} />
          <Field label="Income Source" value={coapp.income_source} />
          <Field label="Monthly Income" value={coapp.monthly_income ? `₹${Number(coapp.monthly_income).toLocaleString('en-IN')}` : null} />
          <Field label="CIBIL" value={coapp.cibil_status === 'SCORE' ? `Score: ${coapp.cibil_score || '?'}` : coapp.cibil_status?.replace('_', ' ')} />
          <Field label="Active Loans" value={coapp.active_loans_summary || 'None'} />
        </div>
      )}
    </Card>
  );
}

// ── Add Co-applicant Modal ────────────────────────────────────────────────────
function AddCoapplicantModal({ caseId, onAdded, onClose }) {
  const [form, setForm] = useState({ coapp_type: 'INDIA_SALARIED', name: '', relation: '', phone: '', email: '', income_source: '', monthly_income: '', last_drawn_salary: '', active_loans_summary: '', cibil_status: 'UNKNOWN', cibil_score: '', is_primary: false });
  const [saving, setSaving] = useState(false);
  const field = k => v => setForm(f => ({ ...f, [k]: v }));

  async function handleAdd() {
    if (!form.name) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      await crmApi.createCoapplicant(caseId, form);
      toast.success('Co-applicant added');
      onAdded();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 520, maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 18px', fontSize: 16, color: '#1a237e' }}>Add Co-applicant</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Input label="Type" value={form.coapp_type} onChange={field('coapp_type')} options={COAPP_TYPES} />
          <Input label="Full Name *" value={form.name} onChange={field('name')} />
          <Input label="Relationship" value={form.relation} onChange={field('relation')} options={RELATIONSHIPS} />
          <Input label="Phone" value={form.phone} onChange={field('phone')} />
          <Input label="Email" value={form.email} onChange={field('email')} type="email" />
          <Input label="Age" value={form.age} onChange={field('age')} type="number" />
          <Input label="Income Source" value={form.income_source} onChange={field('income_source')} options={['Salaried','Business','Rental','Other']} />
          <Input label="Monthly Income (₹)" value={form.monthly_income} onChange={field('monthly_income')} type="number" />
          <Input label="Last Drawn Salary (₹)" value={form.last_drawn_salary} onChange={field('last_drawn_salary')} type="number" />
          <Input label="Active Loans Summary" value={form.active_loans_summary} onChange={field('active_loans_summary')} />
          <Input label="CIBIL Status" value={form.cibil_status || 'UNKNOWN'} onChange={field('cibil_status')} options={CIBIL_OPTIONS.map(c => ({ value: c, label: c.replace('_',' ') }))} />
          {form.cibil_status === 'SCORE' && <Input label="CIBIL Score" value={form.cibil_score} onChange={field('cibil_score')} type="number" />}
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="add_coapp_primary" checked={!!form.is_primary} onChange={e => field('is_primary')(e.target.checked ? 1 : 0)} />
            <label htmlFor="add_coapp_primary" style={{ fontSize: 13, cursor: 'pointer' }}>Primary Co-applicant</label>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <Btn label="Cancel" onClick={onClose} outline color="#6b7280" />
          <Btn label={saving ? 'Adding…' : 'Add Co-applicant'} onClick={handleAdd} color="#1a237e" />
        </div>
      </div>
    </div>
  );
}

// ── References Section ───────────────────────────────────────────────────────
function ReferencesSection({ caseId }) {
  const [refs, setRefs] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newRef, setNewRef] = useState({ full_name: '', phone: '', email: '', address: '' });
  const field = k => v => setNewRef(f => ({ ...f, [k]: v }));

  useEffect(() => {
    crmApi.getReferences(caseId).then(d => setRefs(d.references || [])).catch(() => {});
  }, [caseId]);

  async function handleAdd() {
    if (!newRef.full_name) { toast.error('Name required'); return; }
    try {
      const d = await crmApi.createReference(caseId, { ...newRef, ref_order: refs.length + 1 });
      setRefs(r => [...r, d.reference]);
      setAdding(false);
      setNewRef({ full_name: '', phone: '', email: '', address: '' });
      toast.success('Reference added');
    } catch (e) { toast.error(e.message); }
  }

  async function handleDelete(refId) {
    try {
      await crmApi.deleteReference(caseId, refId);
      setRefs(r => r.filter(x => x.id !== refId));
      toast.success('Reference removed');
    } catch(e) { toast.error(e.message || 'Failed to remove reference'); }
  }

  return (
    <Card title="References (No docs required)" action={refs.length < 2 && <Btn label="+ Add Reference" onClick={() => setAdding(true)} outline color="#1a237e" />}>
      {refs.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>No references added yet.</p>}
      {refs.map(r => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', background: '#f9fafb', borderRadius: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.full_name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{[r.phone, r.email, r.address].filter(Boolean).join(' · ')}</div>
          </div>
          <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>Remove</button>
        </div>
      ))}
      {adding && (
        <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 14, marginTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <Input label="Full Name *" value={newRef.full_name} onChange={field('full_name')} />
            <Input label="Phone" value={newRef.phone} onChange={field('phone')} />
            <Input label="Email" value={newRef.email} onChange={field('email')} type="email" />
            <Input label="Address" value={newRef.address} onChange={field('address')} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Btn label="Cancel" onClick={() => setAdding(false)} outline color="#6b7280" />
            <Btn label="Add" onClick={handleAdd} color="#1a237e" />
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main ProfileTab ───────────────────────────────────────────────────────────
export default function ProfileTab({ app, onUpdated }) {
  const [profile, setProfile] = useState(app);
  const [coapps, setCoapps] = useState([]);
  const [showAddCoapp, setShowAddCoapp] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await crmApi.getProfile(app.id);
      setProfile(d.profile);
      setCoapps(d.coapplicants || []);
    } catch(e) {
      setProfile(app);
    } finally { setLoading(false); }
  }, [app.id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleProfileSave(data) {
    try {
      await crmApi.updateProfile(app.id, data);
      await loadData();
      onUpdated?.();
    } catch(e) { toast.error(e.message || 'Failed to save profile'); }
  }

  async function handleDeleteCoapp(coId) {
    if (!confirm('Remove this co-applicant?')) return;
    try {
      await crmApi.deleteCoapplicant(app.id, coId);
      await loadData();
      toast.success('Co-applicant removed');
      onUpdated?.();
    } catch(e) { toast.error(e.message || 'Failed to remove co-applicant'); }
  }

  if (loading) return <div style={{ padding: 32, color: '#9ca3af' }}>Loading profile…</div>;

  return (
    <div style={{ padding: '20px 0' }}>
      <StudentProfileSection profile={profile} onSave={handleProfileSave} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>Co-applicants ({coapps.length})</h3>
        <Btn label="+ Add Co-applicant" onClick={() => setShowAddCoapp(true)} color="#1a237e" />
      </div>
      {coapps.length === 0 && (
        <div style={{ background: '#fff', border: '1px dashed #d1d5db', borderRadius: 10, padding: '24px 20px', textAlign: 'center', marginBottom: 18, color: '#9ca3af', fontSize: 13 }}>
          No co-applicants yet. Add a financial co-applicant to build the document checklist.
        </div>
      )}
      {coapps.map(ca => (
        <CoapplicantCard key={ca.id} coapp={ca} caseId={app.id} onUpdated={loadData} onDelete={() => handleDeleteCoapp(ca.id)} />
      ))}

      <ReferencesSection caseId={app.id} />

      {showAddCoapp && (
        <AddCoapplicantModal caseId={app.id} onAdded={loadData} onClose={() => setShowAddCoapp(false)} />
      )}
    </div>
  );
}
