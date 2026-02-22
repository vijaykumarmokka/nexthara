import { useState, useEffect } from 'react';
import { adminApi } from '../../api';

const STATUS_COLORS = { UPCOMING: '#3b82f6', ACTIVE: '#22c55e', COMPLETED: '#6b7280', CANCELLED: '#ef4444' };

export default function AdminEventsControlPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    adminApi.getEventsControl().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const events = (data?.events || []).filter(e => !search || e.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1d4d' }}>Events Control</h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Director-level event visibility and lead conversion tracking</div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..." style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: 200 }} />
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Events', value: data?.kpis?.total_events, color: '#1a1d4d' },
          { label: 'Registrations', value: data?.kpis?.total_registrations, color: '#3b82f6' },
          { label: 'Check-ins', value: data?.kpis?.total_checkins, color: '#22c55e' },
          { label: 'Leads Converted', value: data?.kpis?.total_leads, color: '#8b5cf6' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 20px', flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value ?? '—'}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading events...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Event', 'Date', 'City', 'Status', 'Registrations', 'Check-ins', 'Leads', 'Conversion %'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(e => {
                const convPct = e.registrations > 0 ? Math.round(e.leads_converted * 100 / e.registrations) : 0;
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1f2937' }}>{e.title}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>{e.event_date?.slice(0,10)}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{e.city || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: STATUS_COLORS[e.status] + '20', color: STATUS_COLORS[e.status] || '#6b7280', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{e.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{e.registrations || 0}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{e.checkins || 0}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#8b5cf6', fontWeight: 700 }}>{e.leads_converted || 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', maxWidth: 80 }}>
                          <div style={{ height: '100%', background: '#8b5cf6', width: `${convPct}%` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{convPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!events.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No events found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
