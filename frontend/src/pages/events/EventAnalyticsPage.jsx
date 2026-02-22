import { useState, useEffect } from 'react';
import { eventsApi } from '../../api.js';

export default function EventAnalyticsPage({ eventId, onBack }) {
  const [data, setData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(eventId ? 'event' : 'overview');

  useEffect(() => {
    if (mode === 'event' && eventId) {
      eventsApi.getEventAnalytics(eventId).then(setData).finally(() => setLoading(false));
    } else {
      eventsApi.getOverviewAnalytics().then(setOverview).finally(() => setLoading(false));
    }
  }, [mode, eventId]);

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Loading analytics...</div>;
  }

  if (mode === 'event' && data) {
    return <EventDetailAnalytics data={data} onBack={onBack} />;
  }

  if (!overview) return null;

  return (
    <div style={{ padding: 24, background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Events Analytics</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Compare events, measure ROI, see what works</p>
        </div>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#475569', fontSize: 13 }}>
            ← Back
          </button>
        )}
      </div>

      {/* Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Events', value: overview.totalEvents, color: '#2563eb', icon: 'fa-calendar-alt' },
          { label: 'Registrations', value: overview.totalRegs, color: '#7c3aed', icon: 'fa-users' },
          { label: 'Check-ins', value: overview.totalCheckins, color: '#059669', icon: 'fa-sign-in-alt' },
          { label: 'Leads Created', value: overview.totalLeads, color: '#0891b2', icon: 'fa-user-tag' },
          { label: 'Cases Created', value: overview.totalCases, color: '#dc2626', icon: 'fa-briefcase' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: k.color + '18', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`fas ${k.icon}`} style={{ color: k.color, fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{(k.value || 0).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Source Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Registration Source Breakdown</div>
          {(overview.sourceBreakdown || []).map(s => {
            const total = (overview.sourceBreakdown || []).reduce((a, b) => a + b.count, 0);
            const pct = total ? Math.round((s.count / total) * 100) : 0;
            return (
              <div key={s.source} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{s.source}</span>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{s.count} ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 8 }}>
                  <div style={{ height: 8, background: s.source === 'META' ? '#2563eb' : s.source === 'LINK' ? '#059669' : '#7c3aed', borderRadius: 8, width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {(overview.sourceBreakdown || []).length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>No data yet</div>}
        </div>

        {/* Campaign Performance */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Campaign Performance Table</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Campaign', 'Leads', 'Regs', 'Checked-in', 'Cases'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Link Meta campaigns to see ROI</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Performance Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: 14 }}>Event Performance</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Event', 'Date', 'Reg', 'Confirmed', 'Checked-in', 'No-show%', 'Leads', 'Cases'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(overview.eventPerf || []).map(ev => {
              const noShowPct = ev.registrations > 0 ? Math.round((1 - (ev.checked_in / Math.max(ev.confirmed || ev.registrations, 1))) * 100) : 0;
              return (
                <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13 }}>
                    <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>
                    {new Date(ev.event_start_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{ev.registrations || 0}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{ev.confirmed || 0}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#059669', fontWeight: 600 }}>{ev.checked_in || 0}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: noShowPct > 40 ? '#dc2626' : '#64748b' }}>{noShowPct}%</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#7c3aed' }}>{ev.leads || 0}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#2563eb' }}>{ev.cases || 0}</td>
                </tr>
              );
            })}
            {(overview.eventPerf || []).length === 0 && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No events yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EventDetailAnalytics({ data, onBack }) {
  const { event, kpis, funnel, sourceBreakdown, ticketBreakdown, intentBreakdown, campaignBreakdown } = data;

  return (
    <div style={{ padding: 24, background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 8 }}>
            ← Back
          </button>
        )}
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{event?.title} — Analytics</h1>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          {event && new Date(event.event_start_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} • {event?.venue_name}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Registered', value: kpis?.registered || 0, color: '#2563eb' },
          { label: 'Checked-in', value: kpis?.checked_in || 0, color: '#7c3aed' },
          { label: 'Leads', value: kpis?.leads_created || 0, color: '#059669' },
          { label: 'Cases', value: kpis?.cases_created || 0, color: '#dc2626' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Conversion Funnel</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[
            { label: 'Registered', value: funnel?.registered || 0, color: '#2563eb' },
            { label: 'Confirmed', value: funnel?.confirmed || 0, color: '#059669' },
            { label: 'Checked-in', value: funnel?.checked_in || 0, color: '#7c3aed' },
            { label: 'Leads', value: funnel?.leads || 0, color: '#0891b2' },
            { label: 'Cases', value: funnel?.cases || 0, color: '#dc2626' },
          ].map((f, i) => {
            const pct = funnel?.registered > 0 ? Math.round((f.value / funnel.registered) * 100) : 0;
            return (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{ flex: 1, background: f.color + '12', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: f.color }}>{f.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: f.color, fontWeight: 600 }}>{pct}%</div>
                </div>
                {i < 4 && <div style={{ fontSize: 18, color: '#cbd5e1', flexShrink: 0 }}>→</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Source Breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Source Breakdown</div>
          {(sourceBreakdown || []).map(s => (
            <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
              <span style={{ color: '#374151' }}>{s.source}</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.count}</span>
            </div>
          ))}
          {(sourceBreakdown || []).length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>No data</div>}
        </div>

        {/* Ticket Breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Ticket Type Breakdown</div>
          {(ticketBreakdown || []).map(t => (
            <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
              <span style={{ color: '#374151' }}>{t.name}</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{t.count}</span>
            </div>
          ))}
          {(ticketBreakdown || []).length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>No data</div>}
        </div>

        {/* Intent Breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Intent Score</div>
          {[
            { label: 'Hot (80+)', value: intentBreakdown?.hot || 0, color: '#dc2626' },
            { label: 'Warm (50–79)', value: intentBreakdown?.warm || 0, color: '#d97706' },
            { label: 'Cold (<50)', value: intentBreakdown?.cold || 0, color: '#64748b' },
          ].map(i => (
            <div key={i.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
              <span style={{ color: i.color, fontWeight: 600 }}>{i.label}</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{i.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign breakdown */}
      {(campaignBreakdown || []).length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginTop: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Meta Campaign Breakdown</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Campaign ID</th>
                <th style={{ textAlign: 'right', padding: '8px 0', color: '#475569', fontSize: 11, textTransform: 'uppercase' }}>Registrations</th>
              </tr>
            </thead>
            <tbody>
              {campaignBreakdown.map(c => (
                <tr key={c.meta_campaign_id}>
                  <td style={{ padding: '8px 0', fontFamily: 'monospace', color: '#374151' }}>{c.meta_campaign_id}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
