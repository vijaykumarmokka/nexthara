import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api';
import { STATUS_CONFIG, formatDate, formatCurrency } from '../../constants';
import StatusBadge from '../../components/Common/StatusBadge';
import AwaitingPill from '../../components/Common/AwaitingPill';
import SLATag from '../../components/Common/SLATag';
import toast from 'react-hot-toast';

const CHIPS = [
  { key: 'all',           label: 'All' },
  { key: 'await-Bank',    label: 'Awaiting Bank' },
  { key: 'await-Student', label: 'Awaiting Student' },
  { key: 'stage-1',       label: 'Pre-Login' },
  { key: 'stage-2',       label: 'Login Stage' },
  { key: 'stage-3',       label: 'Doc Verification' },
  { key: 'stage-4',       label: 'Credit Review' },
  { key: 'stage-5',       label: 'Decision' },
  { key: 'stage-6',       label: 'Post Sanction' },
  { key: 'stage-7',       label: 'Closed' },
];

function buildParams(chip, filters, page) {
  const params = { page, limit: 30 };
  if (filters.search)   params.search   = filters.search;
  if (filters.status)   params.status   = filters.status;
  if (filters.awaiting) params.awaiting = filters.awaiting;
  if (filters.priority) params.priority = filters.priority;
  if (filters.sla)      params.sla      = filters.sla;
  if (filters.country)  params.country  = filters.country;
  if (chip.startsWith('stage-'))  params.stage   = chip.split('-')[1];
  else if (chip.startsWith('await-')) params.awaiting = chip.split('-')[1];
  return params;
}

async function downloadAppDocs(appId) {
  const token = localStorage.getItem('nexthara_token');
  const tid = toast.loading('Fetching documents…');
  try {
    const resp = await fetch(`/api/applications/${appId}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const docs = await resp.json();
    const withFiles = docs.filter(d => d.file_path);
    if (withFiles.length === 0) {
      toast.error('No uploaded files for this case', { id: tid });
      return;
    }
    toast.success(`Downloading ${withFiles.length} file${withFiles.length !== 1 ? 's' : ''}…`, { id: tid });
    for (const doc of withFiles) {
      const url = `/api/applications/${appId}/documents/${doc.id}/file?download=1`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = doc.doc_name || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise(res => setTimeout(res, 400));
      }
    }
  } catch {
    toast.error('Download failed', { id: tid });
  }
}

function RowMenu({ app, onOpenApp }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn btn-sm btn-outline" style={{ padding: '4px 8px' }} onClick={() => setOpen(o => !o)}>
        <i className="fas fa-ellipsis-v"></i>
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 200, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 170, marginTop: 4 }}>
          <div className="row-menu-item" onClick={() => { onOpenApp(app.id); setOpen(false); }}>
            <i className="fas fa-arrow-right"></i> Open Case
          </div>
          <div className="row-menu-item" onClick={() => { onOpenApp(app.id); setOpen(false); }}>
            <i className="fas fa-question-circle" style={{ color: '#e65100' }}></i> Raise Query
          </div>
          <div className="row-menu-item" onClick={() => { onOpenApp(app.id); setOpen(false); }}>
            <i className="fas fa-edit" style={{ color: 'var(--sbi-accent)' }}></i> Update Status
          </div>
          <div className="row-menu-item" onClick={() => { downloadAppDocs(app.id); setOpen(false); }}>
            <i className="fas fa-file-archive"></i> Download Pack
          </div>
        </div>
      )}
    </div>
  );
}

export default function BankApplicationsPage({ onOpenApp }) {
  const [chip, setChip]         = useState('all');
  const [filters, setFilters]   = useState({});
  const [page, setPage]         = useState(1);
  const [apps, setApps]         = useState(null);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);

  const load = useCallback(() => {
    const params = buildParams(chip, filters, page);
    api.getApplications(params).then(res => {
      setApps(res.data);
      setTotal(res.total);
      setPages(res.pages);
    }).catch(() => {});
  }, [chip, filters, page]);

  useEffect(() => { load(); }, [load]);

  const handleChip = (key) => { setChip(key); setFilters({}); setPage(1); };
  const handleFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Applications</h2>
          <div className="subtitle">All cases assigned to your bank</div>
        </div>
        <button className="btn btn-outline" onClick={load}><i className="fas fa-sync-alt"></i> Refresh</button>
      </div>

      {/* Chip filters */}
      <div className="bank-chip-filters">
        {CHIPS.map(c => (
          <button
            key={c.key}
            className={`bank-chip ${chip === c.key ? 'active' : ''}`}
            onClick={() => handleChip(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Search + dropdowns */}
      <div className="filter-bar" style={{ marginTop: 8 }}>
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by name, case ID, phone, email..."
            value={filters.search || ''}
            onChange={e => handleFilter('search', e.target.value)}
          />
        </div>
        <select className="filter-select" value={filters.status || ''} onChange={e => handleFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
            <option key={k} value={k}>{cfg.label}</option>
          ))}
        </select>
        <select className="filter-select" value={filters.awaiting || ''} onChange={e => handleFilter('awaiting', e.target.value)}>
          <option value="">All Awaiting</option>
          <option value="Bank">Bank</option>
          <option value="Student">Student</option>
          <option value="Nexthara">Nexthara</option>
        </select>
        <select className="filter-select" value={filters.priority || ''} onChange={e => handleFilter('priority', e.target.value)}>
          <option value="">All Priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Normal">Normal</option>
        </select>
        <select className="filter-select" value={filters.sla || ''} onChange={e => handleFilter('sla', e.target.value)}>
          <option value="">All SLA</option>
          <option value="warning">SLA Risk</option>
          <option value="breach">SLA Breach</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container" style={{ marginTop: 8 }}>
        <div className="table-header">
          <h3>Cases</h3>
          <span className="results-count">Showing {apps?.length ?? 0} of {total}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Student</th>
              <th>University / Country</th>
              <th>Loan Amt</th>
              <th>Main Status</th>
              <th>Sub Status</th>
              <th>Awaiting</th>
              <th>SLA</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!apps ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#999' }}>Loading...</td></tr>
            ) : apps.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <i className="fas fa-inbox" style={{ fontSize: 24, display: 'block', marginBottom: 10 }}></i>
                No applications found
              </td></tr>
            ) : apps.map(app => (
              <tr key={app.id}>
                <td><span className="app-id" onClick={() => onOpenApp(app.id)}>{app.id}</span></td>
                <td>
                  <div className="student-name">{app.student_name}</div>
                  <div className="student-sub" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{app.student_email}</div>
                  {app.student_phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      <i className="fas fa-phone" style={{ fontSize: 10 }}></i>
                      {app.student_phone}
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', fontSize: 10 }}
                        title="Copy phone" onClick={() => { navigator.clipboard.writeText(app.student_phone); toast.success('Phone copied'); }}>
                        <i className="fas fa-copy"></i>
                      </button>
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ fontSize: 13 }}>{app.university}</div>
                  {app.country && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}><i className="fas fa-globe" style={{ marginRight: 3 }}></i>{app.country}</div>}
                </td>
                <td style={{ fontSize: 13 }}>{app.sanction_amount ? formatCurrency(app.sanction_amount) : app.loan_amount_requested ? formatCurrency(app.loan_amount_requested) : '—'}</td>
                <td><StatusBadge status={app.status} /></td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 120 }}>
                  <span title={app.sub_status} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {app.sub_status || '—'}
                  </span>
                </td>
                <td><AwaitingPill awaiting={app.awaiting_from} /></td>
                <td><SLATag days={app.sla_days} awaiting={app.awaiting_from} status={app.status} /></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(app.updated_at)}</td>
                <td><RowMenu app={app} onOpenApp={onOpenApp} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="pagination">
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
      </div>
    </div>
  );
}
