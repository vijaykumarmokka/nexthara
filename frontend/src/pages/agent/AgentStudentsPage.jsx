import { useState, useEffect, useCallback } from 'react';
import { agentApi } from '../../api';
import toast from 'react-hot-toast';

const STAGE_BADGE = {
  NEW: 'badge-grey', CONTACT_ATTEMPTED: 'badge-amber', CONNECTED: 'badge-blue',
  QUALIFIED: 'badge-purple', DOCS_REQUESTED: 'badge-red', DOCS_RECEIVED: 'badge-blue',
  CASE_CREATED: 'badge-green', DROPPED: 'badge-red', LOST: 'badge-red', DUPLICATE: 'badge-grey',
};

function StageChip({ stage }) {
  return <span className={`badge ${STAGE_BADGE[stage] || 'badge-grey'}`}>{stage?.replace(/_/g, ' ')}</span>;
}

function fmt(paise) { return paise ? `₹${(paise / 100000).toFixed(1)}L` : '—'; }

export default function AgentStudentsPage() {
  const [students, setStudents] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (search) params.search = search;
    agentApi.getStudents(params)
      .then(r => { setStudents(r.data || []); setTotal(r.total || 0); setPages(r.pages || 1); })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  function openStudent(s) {
    agentApi.getStudent(s.id)
      .then(setSelected)
      .catch(() => toast.error('Failed to load student details'));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Students</h2>
          <div className="subtitle">{total} students in your network</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--sbi-accent)' }}></i>
        </div>
      )}

      {!loading && students.length === 0 && (
        <div className="table-container" style={{ textAlign: 'center', padding: 48 }}>
          <i className="fas fa-graduation-cap" style={{ fontSize: 32, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}></i>
          <div style={{ color: 'var(--text-muted)' }}>No students found. Add leads to populate the student directory.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {students.map(s => (
          <div key={s.id}
            onClick={() => openStudent(s)}
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: 18, cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
          >
            {/* Avatar + name */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div className="user-avatar" style={{ width: 40, height: 40, fontSize: 15 }}>
                {s.full_name?.[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="student-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.full_name}</div>
                <div className="student-sub">{s.phone_e164}</div>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {s.email && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><i className="fas fa-envelope" style={{ marginRight: 6, width: 12 }}></i>{s.email}</span>}
              {s.country && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><i className="fas fa-globe" style={{ marginRight: 6, width: 12 }}></i>{s.country}{s.course ? ` · ${s.course}` : ''}</span>}
              {s.university && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><i className="fas fa-university" style={{ marginRight: 6, width: 12 }}></i>{s.university}</span>}
              {s.intake && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><i className="fas fa-calendar-alt" style={{ marginRight: 6, width: 12 }}></i>Intake: {s.intake}</span>}
              {s.loan_amount_paise && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><i className="fas fa-rupee-sign" style={{ marginRight: 6, width: 12 }}></i>{fmt(s.loan_amount_paise)}</span>}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <StageChip stage={s.stage} />
              {s.internal_case_id ? (
                <span className="badge badge-green"><i className="fas fa-briefcase" style={{ marginRight: 4 }}></i>Has Case</span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No case yet</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="pagination" style={{ marginTop: 20 }}>
          <div className="info">Page {page} of {pages} ({total} total)</div>
          <div className="pagination-btns">
            <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}><i className="fas fa-chevron-left"></i></button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button onClick={() => setPage(p => p + 1)} disabled={page >= pages}><i className="fas fa-chevron-right"></i></button>
          </div>
        </div>
      )}

      {selected && <StudentDetailModal student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── Student Detail Modal ─────────────────────────────────────────────────────

function StudentDetailModal({ student, onClose }) {
  return (
    <div className="modal-overlay show">
      <div className="modal">
        <div className="modal-header" style={{ background: 'var(--header-gradient)', color: '#fff', borderRadius: '12px 12px 0 0' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="user-avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
              {student.full_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3 style={{ color: '#fff', margin: 0 }}>{student.full_name}</h3>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{student.phone_e164}</div>
            </div>
          </div>
          <button className="modal-close" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }} onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Contact Info */}
          <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Contact Info</div>
          <div className="detail-grid">
            {[['Phone', student.phone_e164], ['Email', student.email], ['City', student.city]].map(([label, val]) => val ? (
              <div key={label} className="detail-item"><label>{label}</label><div className="value">{val}</div></div>
            ) : null)}
          </div>

          {/* Application Details */}
          <div style={{ marginTop: 20, marginBottom: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Application Details</div>
          <div className="detail-grid">
            {[['Country', student.country], ['Course', student.course], ['University', student.university], ['Intake', student.intake], ['Loan Amount', fmt(student.loan_amount_paise)]].map(([label, val]) => val && val !== '—' ? (
              <div key={label} className="detail-item"><label>{label}</label><div className="value">{val}</div></div>
            ) : null)}
          </div>

          {/* Active Case */}
          {student.case && (
            <>
              <div style={{ marginTop: 20, marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Active Case</div>
              <div className="sanction-card">
                <div className="sanction-grid">
                  <div className="sanction-item"><label>Bank</label><div className="value">{student.case.bank}</div></div>
                  <div className="sanction-item"><label>Status</label><div className="value">{student.case.status?.replace(/_/g, ' ')}</div></div>
                  <div className="sanction-item"><label>Awaiting</label><div className="value">{student.case.sub_status || '—'}</div></div>
                </div>
              </div>
            </>
          )}

          {/* Commission */}
          {student.commission && (
            <>
              <div style={{ marginTop: 20, marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Commission</div>
              <div className="detail-grid">
                <div className="detail-item"><label>Rate</label><div className="value">{student.commission.commission_percent}%</div></div>
                <div className="detail-item"><label>Amount</label><div className="value">₹{((student.commission.commission_amount_paise || 0) / 100).toLocaleString()}</div></div>
                <div className="detail-item"><label>Status</label><div className="value">{student.commission.status}</div></div>
              </div>
            </>
          )}

          {/* Notes */}
          {student.notes?.length > 0 && (
            <>
              <div style={{ marginTop: 20, marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Notes</div>
              {student.notes.map(n => (
                <div key={n.id} className="cw-note-item">
                  <div className="cw-note-text">{n.note_text}</div>
                  <div className="cw-note-meta"><i className="fas fa-user"></i> {n.agent_user_name} · {new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </>
          )}

          {/* Quick contact */}
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <a href={`tel:${student.phone_e164}`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
              <i className="fas fa-phone"></i> Call
            </a>
            {student.email && (
              <a href={`mailto:${student.email}`} className="btn btn-outline" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                <i className="fas fa-envelope"></i> Email
              </a>
            )}
            {student.phone_e164 && (
              <a href={`https://wa.me/${student.phone_e164.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                className="btn" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', background: '#25D366', color: '#fff', border: 'none' }}>
                <i className="fab fa-whatsapp"></i> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
