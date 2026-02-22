import { useState } from 'react';
import { api } from '../../api';
import { BANKS } from '../../constants';
import toast from 'react-hot-toast';

const UNIVERSITIES = ['MIT', 'Stanford', 'University of Toronto', 'UCL London', 'TU Munich', 'NUS Singapore', 'University of Melbourne', 'ETH Zurich', 'Columbia University', 'University of Oxford'];
const COURSES = ['MS Computer Science', 'MBA Finance', 'MS Data Science', 'MEng Mechanical', 'MS AI/ML', 'MBA General', 'MS Biotechnology', 'LLM International Law', 'MS Electrical Eng', 'PhD Physics'];

export default function NewApplicationModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    student_name: '', student_email: '', student_phone: '', bank: 'SBI', university: 'MIT', course: 'MS Computer Science', country: '', intake: '', loan_amount_requested: '', priority: 'Normal', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_name || !form.student_email || !form.bank) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      await api.createApplication(form);
      toast.success('Application created successfully');
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Creation failed');
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3><i className="fas fa-plus-circle" style={{ marginRight: 8 }}></i> New Bank Application</h3>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Student Name *</label>
                <input type="text" value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} placeholder="Full name" required />
              </div>
              <div className="form-group">
                <label>Student Email *</label>
                <input type="email" value={form.student_email} onChange={e => setForm(f => ({ ...f, student_email: e.target.value }))} placeholder="email@example.com" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={form.student_phone} onChange={e => setForm(f => ({ ...f, student_phone: e.target.value }))} placeholder="+91 9876543210" />
              </div>
              <div className="form-group">
                <label>Loan Amount Requested (₹)</label>
                <input type="number" value={form.loan_amount_requested} onChange={e => setForm(f => ({ ...f, loan_amount_requested: e.target.value }))} placeholder="e.g. 3000000" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Country</label>
                <input type="text" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. USA, UK, Canada" />
              </div>
              <div className="form-group">
                <label>Intake</label>
                <input type="text" value={form.intake} onChange={e => setForm(f => ({ ...f, intake: e.target.value }))} placeholder="e.g. Sep 2025, Jan 2026" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Bank / Lender *</label>
                <select value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
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
            <div className="form-row">
              <div className="form-group">
                <label>University *</label>
                <select value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))}>
                  {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Course *</label>
                <select value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}>
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-plus'}`}></i> {saving ? 'Creating...' : 'Create Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
