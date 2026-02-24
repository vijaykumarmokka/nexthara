import { useState, useEffect, useCallback } from 'react';
import { bankAdminApi } from '../../api';

const STATUS_COLORS = {
  INITIATED: '#6b7280',
  DOCS_PENDING: '#f59e0b',
  LOGIN_DONE: '#3b82f6',
  UNDER_REVIEW: '#8b5cf6',
  SANCTIONED: '#10b981',
  REJECTED: '#ef4444',
  DISBURSED: '#059669',
  CLOSED: '#9ca3af',
};

const AWAITING_COLORS = {
  BANK: '#0d7377',
  STUDENT: '#f59e0b',
  NEXTHARA: '#3b82f6',
};

function slaStatus(sla_due_at, status) {
  if (!sla_due_at || ['SANCTIONED','REJECTED','DISBURSED','CLOSED'].includes(status)) return 'ok';
  const due = new Date(sla_due_at);
  const now = new Date();
  const diff = (due - now) / 86400000;
  if (diff < 0) return 'breach';
  if (diff <= 2) return 'risk';
  return 'ok';
}

function SLABadge({ sla_due_at, status }) {
  const s = slaStatus(sla_due_at, status);
  if (s === 'breach') return <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>SLA BREACH</span>;
  if (s === 'risk') return <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>SLA RISK</span>;
  return null;
}

export default function BankApplicationsPage({ bankId, bankRole, onOpenApp }) {
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [officers, setOfficers] = useState([]);

  const [filters, setFilters] = useState({
    status: '', awaiting_from: '', sla_risk: '', country: '',
    product_id: '', branch_id: '', officer_id: '', search: '',
  });
  const [page, setPage] = useState(0);
  const PAGE = 50;

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, limit: PAGE, offset: page * PAGE };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const data = await bankAdminApi.getBankApplications(bankId, params);
      setApps(data.applications || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [bankId, filters, page]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  useEffect(() => {
    bankAdminApi.getProducts(bankId).then(setProducts).catch(() => {});
    bankAdminApi.getBranches(bankId).then(setBranches).catch(() => {});
    bankAdminApi.getUsers(bankId).then(u => setOfficers(u.filter(x => x.role === 'BANK_OFFICER' || x.role === 'BANK_BRANCH_MANAGER'))).catch(() => {});
  }, [bankId]);

  const setFilter = (k, v) => {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(0);
  };

  const inputStyle = {
    height: 32, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 12, background: '#fff', outline: 'none', color: '#374151',
  };

  return (
    <div>
      {/* Filter Bar */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <input
          style={{ ...inputStyle, width: 200 }}
          placeholder="Search name / case ref..."
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
        />

        <select style={inputStyle} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          {['INITIATED','DOCS_PENDING','LOGIN_DONE','UNDER_REVIEW','SANCTIONED','REJECTED','DISBURSED','CLOSED'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          ))}
        </select>

        <select style={inputStyle} value={filters.awaiting_from} onChange={e => setFilter('awaiting_from', e.target.value)}>
          <option value="">Awaiting</option>
          <option value="BANK">Bank</option>
          <option value="STUDENT">Student</option>
          <option value="NEXTHARA">Nexthara</option>
        </select>

        <select style={inputStyle} value={filters.sla_risk} onChange={e => setFilter('sla_risk', e.target.value)}>
          <option value="">SLA Risk</option>
          <option value="BREACH">Breach</option>
          <option value="RISK">At Risk</option>
        </select>

        <select style={inputStyle} value={filters.product_id} onChange={e => setFilter('product_id', e.target.value)}>
          <option value="">All Products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
        </select>

        {['BANK_SUPER_ADMIN','BANK_REGION_HEAD'].includes(bankRole) && (
          <select style={inputStyle} value={filters.branch_id} onChange={e => setFilter('branch_id', e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
          </select>
        )}

        {['BANK_SUPER_ADMIN','BANK_REGION_HEAD','BANK_BRANCH_MANAGER'].includes(bankRole) && (
          <select style={inputStyle} value={filters.officer_id} onChange={e => setFilter('officer_id', e.target.value)}>
            <option value="">All Officers</option>
            {officers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}

        <button onClick={fetchApps} style={{ height: 32, padding: '0 14px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <i className="fas fa-search" style={{ marginRight: 6 }}></i>Search
        </button>
        <button onClick={() => { setFilters({ status:'',awaiting_from:'',sla_risk:'',country:'',product_id:'',branch_id:'',officer_id:'',search:'' }); setPage(0); }}
          style={{ height: 32, padding: '0 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
          Clear
        </button>

        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>
          {total} application{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
          </div>
        ) : apps.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
            <i className="fas fa-inbox" style={{ fontSize: 32, marginBottom: 12, display: 'block' }}></i>
            No applications found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Case Ref','Student','Country','Product','Status','Awaiting','SLA Due','Last Update',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map(app => {
                const sla = slaStatus(app.sla_due_at, app.status);
                const rowBorder = sla === 'breach' ? '3px solid #ef4444' : sla === 'risk' ? '3px solid #f59e0b' : '3px solid transparent';
                return (
                  <tr key={app.id} style={{ borderBottom: '1px solid #f3f4f6', borderLeft: rowBorder, cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    onClick={() => onOpenApp && onOpenApp(app.id)}>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: '#0d7377', fontFamily: 'monospace' }}>
                      {app.case_id ? `NX-${app.case_id.slice(0,6).toUpperCase()}` : app.id.slice(0,8).toUpperCase()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{app.student_name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{app.student_phone}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151' }}>{app.country || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, color: '#374151' }}>{app.product_name || '—'}</div>
                      {app.awaiting_from === 'BANK' && app.status === 'DOCS_PENDING' && (
                        <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 3, marginTop: 2, display: 'inline-block' }}>DOCS PENDING</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: (STATUS_COLORS[app.status] || '#9ca3af') + '20', color: STATUS_COLORS[app.status] || '#9ca3af' }}>
                        {app.status?.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: (AWAITING_COLORS[app.awaiting_from] || '#9ca3af') + '20', color: AWAITING_COLORS[app.awaiting_from] || '#9ca3af' }}>
                        {app.awaiting_from || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {app.sla_due_at ? (
                        <div>
                          <div style={{ fontSize: 12, color: sla === 'breach' ? '#dc2626' : sla === 'risk' ? '#d97706' : '#374151', fontWeight: sla !== 'ok' ? 700 : 400 }}>
                            {new Date(app.sla_due_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                          </div>
                          <SLABadge sla_due_at={app.sla_due_at} status={app.status} />
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: '#6b7280' }}>
                      {app.updated_at ? new Date(app.updated_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={e => { e.stopPropagation(); onOpenApp && onOpenApp(app.id); }}
                        style={{ fontSize: 12, padding: '5px 12px', background: '#e0f2f1', color: '#0d7377', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > PAGE && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              style={{ padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: page === 0 ? '#f9fafb' : '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 12 }}>
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Page {page + 1} of {Math.ceil(total / PAGE)}</span>
            <button disabled={(page + 1) * PAGE >= total} onClick={() => setPage(p => p + 1)}
              style={{ padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: (page + 1) * PAGE >= total ? '#f9fafb' : '#fff', cursor: (page + 1) * PAGE >= total ? 'not-allowed' : 'pointer', fontSize: 12 }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
