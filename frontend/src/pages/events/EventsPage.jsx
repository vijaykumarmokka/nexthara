import { useState, useEffect } from 'react';
import { eventsApi } from '../../api.js';

const STATUS_COLORS = {
  DRAFT: '#78909c',
  LIVE: '#2e7d32',
  CLOSED: '#e65100',
  CANCELLED: '#c62828',
};

export default function EventsPage({ onSelectEvent, onCreateEvent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [form, setForm] = useState({
    title: '', slug: '', description: '',
    event_start_at: '', event_end_at: '',
    venue_name: '', venue_address: '', capacity_total: 600,
    ticket_types: [
      { name: 'FREE', price_paise: 0, max_quantity: 550 },
      { name: 'VIP', price_paise: 49900, max_quantity: 50 },
    ],
  });

  useEffect(() => { load(); }, [filters]);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      setEvents((await eventsApi.getEvents(params)) || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await eventsApi.createEvent(form);
      setShowCreate(false);
      load();
      if (res.id && onSelectEvent) onSelectEvent(res.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  function autoSlug(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function toggleEventStatus(ev, e) {
    e.stopPropagation();
    const newStatus = ev.status === 'LIVE' ? 'DRAFT' : 'LIVE';
    setTogglingId(ev.id);
    try {
      await eventsApi.updateEvent(ev.id, { status: newStatus });
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  const totalRegs = events.reduce((s, e) => s + (e.reg_count || 0), 0);
  const totalCheckins = events.reduce((s, e) => s + (e.checkin_count || 0), 0);
  const liveEvents = events.filter(e => e.status === 'LIVE').length;

  return (
    <div style={{ padding: '24px', background: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Events</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Manage offline education loan & funding events</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowCreate(true)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-plus" /> Create Event
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Events', value: events.length, icon: 'fa-calendar-alt', color: '#2563eb' },
          { label: 'Live Events', value: liveEvents, icon: 'fa-broadcast-tower', color: '#059669' },
          { label: 'Total Registrations', value: totalRegs, icon: 'fa-users', color: '#7c3aed' },
          { label: 'Total Check-ins', value: totalCheckins, icon: 'fa-check-circle', color: '#d97706' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{k.value.toLocaleString()}</div>
              </div>
              <div style={{ background: k.color + '18', borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fas ${k.icon}`} style={{ color: k.color, fontSize: 18 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 16, alignItems: 'center' }}>
        <input
          placeholder="Search events..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: 14, outline: 'none' }}
        />
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: 14, outline: 'none' }}>
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="LIVE">Live</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Events Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Loading events...</div>
        ) : events.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <i className="fas fa-calendar-plus" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }} />
            <p style={{ color: '#64748b', marginBottom: 16 }}>No events yet. Create your first event!</p>
            <button onClick={() => setShowCreate(true)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
              + Create Event
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Event', 'Date', 'Venue', 'Capacity', 'Registered', 'Checked-in', 'Leads', 'Status', 'Booking', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => onSelectEvent && onSelectEvent(ev.id)}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{ev.slug}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>
                    {new Date(ev.event_start_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569', maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.venue_name}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, color: '#475569' }}>{ev.capacity_reserved}/{ev.capacity_total}</div>
                    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 4, marginTop: 4, width: 80 }}>
                      <div style={{ height: 4, background: '#2563eb', borderRadius: 4, width: `${Math.min(100, (ev.capacity_reserved / ev.capacity_total) * 100)}%` }} />
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{ev.reg_count || 0}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#059669' }}>{ev.checkin_count || 0}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#7c3aed' }}>{ev.leads_count || 0}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: STATUS_COLORS[ev.status] + '18', color: STATUS_COLORS[ev.status], borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                      {ev.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                    {(ev.status === 'DRAFT' || ev.status === 'LIVE') && (
                      <button
                        onClick={e => toggleEventStatus(ev, e)}
                        disabled={togglingId === ev.id}
                        style={{
                          background: ev.status === 'LIVE' ? '#fef2f2' : '#f0fdf4',
                          color: ev.status === 'LIVE' ? '#dc2626' : '#16a34a',
                          border: `1px solid ${ev.status === 'LIVE' ? '#fecaca' : '#bbf7d0'}`,
                          borderRadius: 6,
                          padding: '5px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: togglingId === ev.id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          whiteSpace: 'nowrap',
                          opacity: togglingId === ev.id ? 0.6 : 1,
                        }}
                      >
                        <i className={`fas ${togglingId === ev.id ? 'fa-spinner fa-spin' : ev.status === 'LIVE' ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                        {togglingId === ev.id ? '...' : ev.status === 'LIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {(ev.status === 'CLOSED' || ev.status === 'CANCELLED') && (
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={e => { e.stopPropagation(); onSelectEvent && onSelectEvent(ev.id); }}
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: '#475569' }}>
                      Open →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 600, maxHeight: '90vh', overflowY: 'auto', padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Create Event</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Event Title *</label>
                  <input required value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: autoSlug(e.target.value) }))}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder="Exclusive Education Loan & Student Funding Event" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>URL Slug *</label>
                  <input required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder="edu-loan-event-mar-2026" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Start Date & Time *</label>
                    <input required type="datetime-local" value={form.event_start_at}
                      onChange={e => setForm(f => ({ ...f, event_start_at: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>End Date & Time *</label>
                    <input required type="datetime-local" value={form.event_end_at}
                      onChange={e => setForm(f => ({ ...f, event_end_at: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Venue Name *</label>
                  <input required value={form.venue_name} onChange={e => setForm(f => ({ ...f, venue_name: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder="Nexthara HQ Auditorium" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Venue Address *</label>
                  <input required value={form.venue_address} onChange={e => setForm(f => ({ ...f, venue_address: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder="Kozhikode, Kerala" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Total Capacity</label>
                  <input type="number" value={form.capacity_total} min={1}
                    onChange={e => setForm(f => ({ ...f, capacity_total: parseInt(e.target.value) }))}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
                    placeholder="Event description..." />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 20px', background: '#fff', cursor: 'pointer', color: '#475569' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
                  {creating ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
