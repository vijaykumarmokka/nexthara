import { useState, useEffect } from 'react';
import { adminApi } from '../../api';

const STATUS_COLORS = { ACTIVE: '#22c55e', INACTIVE: '#6b7280', SUSPENDED: '#ef4444', PENDING: '#f59e0b' };

export default function AdminAgentsControlPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    adminApi.getAgentsControl().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const orgs = (data?.orgs || []).filter(o => !search || o.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1d4d' }}>Agents Control</h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>B2B Agent organization oversight</div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations..." style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: 220 }} />
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Orgs', value: data?.kpis?.total_orgs, color: '#1a1d4d' },
          { label: 'Active Orgs', value: data?.kpis?.active_orgs, color: '#22c55e' },
          { label: 'Total Agents', value: (data?.orgs || []).reduce((s, o) => s + (o.users || 0), 0), color: '#3b82f6' },
          { label: 'Total Leads', value: (data?.orgs || []).reduce((s, o) => s + (o.leads || 0), 0), color: '#8b5cf6' },
          { label: 'Commissions Paid', value: `₹${((data?.orgs || []).reduce((s, o) => s + (o.paid_commissions || 0), 0) / 100).toFixed(0)}`, color: '#22c55e' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 20px', flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value ?? '—'}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading organizations...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Organization', 'Plan', 'Status', 'Users', 'Leads', 'Commissions', 'Paid Out'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map(org => (
                <tr key={org.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>{org.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{org.id}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{org.plan_id || 'STANDARD'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: STATUS_COLORS[org.status] + '20' || '#f3f4f6', color: STATUS_COLORS[org.status] || '#6b7280', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{org.status || 'ACTIVE'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{org.users || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{org.leads || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{org.commissions || 0}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#22c55e', fontWeight: 700 }}>
                    ₹{((org.paid_commissions || 0) / 100).toFixed(0)}
                  </td>
                </tr>
              ))}
              {!orgs.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No organizations found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
