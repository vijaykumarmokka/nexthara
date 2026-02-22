import { useState, useEffect } from 'react';
import { adminApi } from '../../api';

const ACTION_COLORS = {
  FEATURE_FLAG_TOGGLE: '#8b5cf6',
  BANK_ACTIVATED: '#22c55e',
  BANK_DEACTIVATED: '#ef4444',
  USER_CREATED: '#3b82f6',
  USER_UPDATED: '#f59e0b',
  SETTINGS_UPDATED: '#6b7280',
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ entity_type: '', from_date: '', to_date: '' });

  const load = () => {
    setLoading(true);
    adminApi.getAdminAuditLogs({ page, limit: 50, ...filters }).then(d => {
      setLogs(d.logs || []);
      setTotal(d.total || 0);
    }).catch(() => { setLogs([]); setTotal(0); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filters]);

  const pages = Math.ceil(total / 50);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1d4d' }}>Audit Logs</h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Compliance-grade activity trail — {total.toLocaleString()} records</div>
        </div>
        <button onClick={load} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#374151' }}>
          <i className="fas fa-sync-alt" style={{ marginRight: 6 }}></i>Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e5e7eb' }}>
        <select value={filters.entity_type} onChange={e => { setFilters(f => ({...f, entity_type: e.target.value})); setPage(1); }} style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, minWidth: 160 }}>
          <option value="">All Entity Types</option>
          {['bank', 'feature_flag', 'user', 'settings', 'automation_rule', 'template'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#6b7280' }}>From:</label>
          <input type="date" value={filters.from_date} onChange={e => { setFilters(f => ({...f, from_date: e.target.value})); setPage(1); }} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#6b7280' }}>To:</label>
          <input type="date" value={filters.to_date} onChange={e => { setFilters(f => ({...f, to_date: e.target.value})); setPage(1); }} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
        </div>
        <button onClick={() => { setFilters({ entity_type: '', from_date: '', to_date: '' }); setPage(1); }} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>Clear</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading audit logs...</div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', 'Time', 'Actor', 'Action', 'Entity', 'Details'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', color: '#9ca3af', fontFamily: 'monospace' }}>{log.id}</td>
                    <td style={{ padding: '10px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{log.created_at?.slice(0,16)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 500 }}>{log.actor_name || log.actor_id || 'System'}</div>
                      {log.actor_role && <div style={{ fontSize: 10, color: '#9ca3af' }}>{log.actor_role}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: (ACTION_COLORS[log.action] || '#6b7280') + '20', color: ACTION_COLORS[log.action] || '#6b7280', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}>{log.action}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {log.entity_type && <div style={{ color: '#374151' }}>{log.entity_type}</div>}
                      {log.entity_id && <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{log.entity_id}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', maxWidth: 300 }}>
                      {log.new_value && (
                        <div style={{ fontSize: 11, color: '#374151', background: '#f8fafc', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.new_value?.length > 80 ? log.new_value.slice(0, 80) + '…' : log.new_value}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!logs.length && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No audit logs found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', background: page <= 1 ? '#f9fafb' : '#fff', color: page <= 1 ? '#9ca3af' : '#374151', fontSize: 13 }}>← Prev</button>
              <span style={{ padding: '6px 14px', fontSize: 13, color: '#6b7280' }}>Page {page} of {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', background: page >= pages ? '#f9fafb' : '#fff', color: page >= pages ? '#9ca3af' : '#374151', fontSize: 13 }}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
