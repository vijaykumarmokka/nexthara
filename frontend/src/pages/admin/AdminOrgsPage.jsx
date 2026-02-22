import { useState, useEffect } from 'react';
import { adminApi } from '../../api';

const STATUS_COLOR = { ACTIVE: '#16a34a', INACTIVE: '#6b7280', SUSPENDED: '#dc2626', TRIAL: '#d97706' };

export default function AdminOrgsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminApi.getOrgs()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const orgs = (data?.orgs || []).filter(o =>
    !search || o.name?.toLowerCase().includes(search.toLowerCase())
  );

  const total = data?.orgs?.length || 0;
  const active = (data?.orgs || []).filter(o => o.status === 'ACTIVE').length;
  const totalUsers = (data?.orgs || []).reduce((a, o) => a + (o.user_count || 0), 0);
  const totalLeads = (data?.orgs || []).reduce((a, o) => a + (o.lead_count || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1d4d' }}>Agent Organizations</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Overview of all registered agent organizations (B2B partners)</div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Organizations', value: total, color: '#1e88e5', icon: 'fa-building' },
          { label: 'Active', value: active, color: '#16a34a', icon: 'fa-check-circle' },
          { label: 'Total Users', value: totalUsers, color: '#7b1fa2', icon: 'fa-users' },
          { label: 'Total Leads', value: totalLeads, color: '#00897b', icon: 'fa-funnel-dollar' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: k.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`fas ${k.icon}`} style={{ color: k.color, fontSize: 16 }}></i>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search organizations…"
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, width: 280 }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i></div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Organization', 'Status', 'Plan', 'Users', 'Leads', 'ID'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1a1d4d' }}>{o.name}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: (STATUS_COLOR[o.status] || '#6b7280') + '18', color: STATUS_COLOR[o.status] || '#6b7280', padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                      {o.status || 'UNKNOWN'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{o.plan_id || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#7b1fa2', fontWeight: 600 }}>{o.user_count || 0}</td>
                  <td style={{ padding: '10px 14px', color: '#00897b', fontWeight: 600 }}>{o.lead_count || 0}</td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>{o.id}</td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  {search ? 'No organizations match your search' : 'No organizations registered yet'}
                </td></tr>
              )}
            </tbody>

          </table></div>
        </div>
      )}
    </div>
  );
}
