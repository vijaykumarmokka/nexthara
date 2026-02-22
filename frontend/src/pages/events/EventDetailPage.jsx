import { useState, useEffect } from 'react';
import { eventsApi } from '../../api.js';

const TABS = ['Overview', 'Registrations', 'Messaging', 'Check-in', 'Leads & Conversions', 'Settings'];
const STATUS_COLOR = { REGISTERED: '#2563eb', CONFIRMED: '#059669', CHECKED_IN: '#7c3aed', CANCELLED: '#dc2626', NO_SHOW: '#f59e0b', WAITLISTED: '#78909c' };

export default function EventDetailPage({ eventId, onBack }) {
  const [tab, setTab] = useState('Overview');
  const [event, setEvent] = useState(null);
  const [regs, setRegs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regFilter, setRegFilter] = useState({ status: '', search: '' });
  const [intentFilter, setIntentFilter] = useState('all');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ template_name: '', channel: 'WHATSAPP', audience_filter: {} });
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [toggling, setToggling] = useState(false);

  useEffect(() => { if (eventId) loadEvent(); }, [eventId]);
  useEffect(() => { if (eventId && tab === 'Registrations') loadRegs(); }, [tab, regFilter, eventId]);
  useEffect(() => { if (eventId && tab === 'Messaging') loadMessages(); }, [tab, eventId]);
  useEffect(() => { if (eventId && tab === 'Check-in') loadCheckins(); }, [tab, eventId]);
  useEffect(() => { if (eventId && tab === 'Leads & Conversions') loadLeads(); }, [tab, intentFilter, eventId]);

  async function loadEvent() {
    setLoading(true);
    try { setEvent(await eventsApi.getEvent(eventId)); }
    finally { setLoading(false); }
  }
  async function loadRegs() {
    const params = {};
    if (regFilter.status) params.status = regFilter.status;
    if (regFilter.search) params.search = regFilter.search;
    try { setRegs((await eventsApi.getRegistrations(eventId, params)) || []); } catch {}
  }
  async function loadMessages() {
    try { setMessages((await eventsApi.getMessages(eventId)) || []); } catch {}
  }
  async function loadCheckins() {
    try { setCheckins((await eventsApi.getCheckins(eventId)) || []); } catch {}
  }
  async function loadLeads() {
    const params = intentFilter !== 'all' ? { intent: intentFilter } : {};
    try { setLeads((await eventsApi.getLeadsConversions(eventId, params)) || []); } catch {}
  }

  async function handleStatusChange(newStatus) {
    try {
      await eventsApi.updateEvent(eventId, { status: newStatus });
      loadEvent();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  }

  async function handleToggleActive() {
    const newStatus = event.status === 'LIVE' ? 'DRAFT' : 'LIVE';
    setToggling(true);
    try {
      await eventsApi.updateEvent(eventId, { status: newStatus });
      loadEvent();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setToggling(false);
    }
  }

  async function handleBroadcast(e) {
    e.preventDefault();
    setSending(true);
    try {
      await eventsApi.sendMessage(eventId, broadcastForm);
      setShowBroadcast(false);
      loadMessages();
    } catch (err) { alert(err.message); }
    finally { setSending(false); }
  }

  async function handleBulkConvert() {
    setConverting(true);
    try {
      const res = await eventsApi.bulkConvertToLeads(eventId, {});
      alert(`${res.leads_created} leads created`);
      loadLeads();
    } finally { setConverting(false); }
  }

  async function handleCheckin(ticketCode) {
    try {
      const res = await eventsApi.checkin(eventId, { ticket_code: ticketCode, method: 'MANUAL' });
      alert(`✓ Checked in: ${res.registration.full_name}`);
      loadCheckins();
      loadEvent();
    } catch (err) { alert(err.message); }
  }

  if (loading || !event) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Loading event...</div>;
  }

  const stats = event.stats || {};
  const spotsLeft = event.capacity_total - event.capacity_reserved;
  const fillPct = Math.min(100, (event.capacity_reserved / event.capacity_total) * 100);

  const registrationLink = `${window.location.origin}/event/${event.slug}`;

  return (
    <div style={{ padding: '24px', background: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 8 }}>
            ← Back to Events
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{event.title}</h1>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              <i className="fas fa-calendar" style={{ marginRight: 6 }} />
              {new Date(event.event_start_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              <i className="fas fa-map-marker-alt" style={{ marginRight: 6 }} />
              {event.venue_name}
            </span>
            <span style={{ background: event.status === 'LIVE' ? '#dcfce7' : '#f1f5f9', color: event.status === 'LIVE' ? '#059669' : '#475569', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
              {event.status}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { navigator.clipboard.writeText(registrationLink); alert('Link copied!'); }}
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#475569' }}>
            <i className="fas fa-link" style={{ marginRight: 6 }} /> Copy Reg Link
          </button>
          <button onClick={() => setShowBroadcast(true)}
            style={{ border: '1px solid #2563eb', borderRadius: 8, padding: '8px 16px', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#2563eb' }}>
            <i className="fas fa-broadcast-tower" style={{ marginRight: 6 }} /> Send Broadcast
          </button>
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            style={{
              background: event.status === 'LIVE' ? '#dc2626' : '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: toggling ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
              opacity: toggling ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className={`fas ${toggling ? 'fa-spinner fa-spin' : event.status === 'LIVE' ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
            {toggling ? '...' : event.status === 'LIVE' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#fff', borderRadius: 10, padding: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400, background: tab === t ? '#2563eb' : 'transparent', color: tab === t ? '#fff' : '#64748b' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {tab === 'Overview' && (
        <div>
          {/* Capacity bar */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Capacity</span>
              <span style={{ fontSize: 14, color: '#64748b' }}>{event.capacity_reserved}/{event.capacity_total} seats ({spotsLeft} left)</span>
            </div>
            <div style={{ height: 10, background: '#e2e8f0', borderRadius: 8 }}>
              <div style={{ height: 10, background: fillPct >= 90 ? '#dc2626' : '#2563eb', borderRadius: 8, width: `${fillPct}%`, transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Registered', value: stats.registered || 0, color: '#2563eb', icon: 'fa-users' },
              { label: 'Confirmed', value: stats.confirmed || 0, color: '#059669', icon: 'fa-check' },
              { label: 'Checked-in', value: stats.checked_in || 0, color: '#7c3aed', icon: 'fa-sign-in-alt' },
              { label: 'No-shows', value: stats.no_shows || 0, color: '#f59e0b', icon: 'fa-user-slash' },
              { label: 'Leads Created', value: stats.leads_created || 0, color: '#0891b2', icon: 'fa-user-tag' },
              { label: 'Cases Created', value: stats.cases_created || 0, color: '#dc2626', icon: 'fa-briefcase' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ background: k.color + '18', borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fas ${k.icon}`} style={{ color: k.color, fontSize: 18 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{k.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{k.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Event details */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Event Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Venue', event.venue_name],
                ['Address', event.venue_address],
                ['Start', new Date(event.event_start_at).toLocaleString('en-IN')],
                ['End', new Date(event.event_end_at).toLocaleString('en-IN')],
                ['Registration Link', registrationLink],
                ['Slug', event.slug],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>{v}</div>
                </div>
              ))}
            </div>
            {event.description && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
                <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{event.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REGISTRATIONS TAB ────────────────────────────────────────────────── */}
      {tab === 'Registrations' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input placeholder="Search name or phone..."
              value={regFilter.search} onChange={e => setRegFilter(f => ({ ...f, search: e.target.value }))}
              style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: 14 }} />
            <select value={regFilter.status} onChange={e => setRegFilter(f => ({ ...f, status: e.target.value }))}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: 14 }}>
              <option value="">All Status</option>
              {['REGISTERED','CONFIRMED','CHECKED_IN','NO_SHOW','CANCELLED','WAITLISTED'].map(s => <option key={s}>{s}</option>)}
            </select>
            <a href={eventsApi.exportCSV(eventId)} target="_blank" rel="noreferrer"
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#475569', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-download" /> Export CSV
            </a>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Name', 'Phone', 'Ticket Type', 'Status', 'Registered', 'Check-in', 'Source', 'Score', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regs.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.full_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.ticket_code}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>{r.phone_e164}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12 }}>
                      <span style={{ background: r.ticket_type_name === 'VIP' ? '#fef3c7' : '#f0f9ff', color: r.ticket_type_name === 'VIP' ? '#92400e' : '#0369a1', borderRadius: 12, padding: '2px 8px', fontWeight: 600 }}>
                        {r.ticket_type_name || 'FREE'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: (STATUS_COLOR[r.status] || '#78909c') + '18', color: STATUS_COLOR[r.status] || '#78909c', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>
                      {new Date(r.registered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>
                      {r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, background: r.source === 'META' ? '#eff6ff' : '#f0fdf4', color: r.source === 'META' ? '#1d4ed8' : '#166534', borderRadius: 10, padding: '2px 8px' }}>
                        {r.source}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 700, color: (r.intent_score || 0) >= 80 ? '#dc2626' : (r.intent_score || 0) >= 50 ? '#d97706' : '#64748b', fontSize: 13 }}>
                        {r.intent_score || 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {r.status !== 'CHECKED_IN' && r.status !== 'CANCELLED' && (
                          <button onClick={() => handleCheckin(r.ticket_code)}
                            style={{ border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', background: '#dcfce7', color: '#166534' }}>
                            Check In
                          </button>
                        )}
                        {!r.lead_id && (
                          <button onClick={async () => { await eventsApi.convertRegistration(eventId, r.id, {}); loadRegs(); loadLeads(); }}
                            style={{ border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', background: '#eff6ff', color: '#1d4ed8' }}>
                            → Lead
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {regs.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No registrations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MESSAGING TAB ─────────────────────────────────────────────────────── */}
      {tab === 'Messaging' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Broadcast Messages</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Send segmented WhatsApp messages to attendees</p>
            </div>
            <button onClick={() => setShowBroadcast(true)}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              + Send Broadcast
            </button>
          </div>

          {/* Segment chips */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Segment Preview</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'All Registered', color: '#2563eb' },
                { label: 'Not Confirmed', color: '#f59e0b' },
                { label: 'Confirmed', color: '#059669' },
                { label: 'Checked-in', color: '#7c3aed' },
                { label: 'High Intent (80+)', color: '#dc2626' },
                { label: 'Missing Docs', color: '#78909c' },
              ].map(s => (
                <span key={s.label} style={{ background: s.color + '18', color: s.color, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{s.label}</span>
              ))}
            </div>
          </div>

          {/* Templates reference */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Available Templates</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { name: 'nx_event_ticket', desc: 'Ticket confirmation with QR' },
                { name: 'nx_event_reminder_24h', desc: '24h before event reminder' },
                { name: 'nx_event_reminder_3h', desc: '3h before event reminder' },
                { name: 'nx_event_map', desc: 'Venue directions / map' },
                { name: 'nx_event_thanks_followup', desc: 'Post-event follow-up' },
              ].map(t => (
                <div key={t.name} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563eb', fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Message history */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: 14 }}>Message History</div>
            {messages.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No messages sent yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Template', 'Channel', 'Status', 'Recipients', 'Delivered', 'Sent At'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {messages.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#2563eb' }}>{m.template_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>{m.channel}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: m.status === 'SENT' ? '#dcfce7' : '#fef9c3', color: m.status === 'SENT' ? '#166534' : '#854d0e', borderRadius: 12, padding: '2px 8px', fontSize: 11 }}>{m.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{m.total_recipients || 0}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{m.delivered || 0}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                        {m.sent_at ? new Date(m.sent_at).toLocaleString('en-IN') : 'Scheduled'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── CHECK-IN TAB ──────────────────────────────────────────────────────── */}
      {tab === 'Check-in' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Manual check-in */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Manual Check-in</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Enter Ticket ID or phone number to check in a student</p>
            <ManualCheckinForm onCheckin={handleCheckin} />
          </div>

          {/* Live stats */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>Live Count</h3>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#2563eb', marginBottom: 4 }}>{stats.checked_in || 0}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>checked-in of {stats.registered || 0} registered</div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 8 }}>
              <div style={{ height: 8, background: '#059669', borderRadius: 8, width: `${stats.registered ? Math.min(100, ((stats.checked_in || 0) / stats.registered) * 100) : 0}%` }} />
            </div>
          </div>

          {/* Recent check-ins */}
          <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Recent Check-ins</span>
              <button onClick={loadCheckins} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13 }}>Refresh</button>
            </div>
            {checkins.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No check-ins yet</div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {checkins.map(c => (
                  <div key={c.id} style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{c.full_name}</span>
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 12 }}>{c.ticket_code}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(c.created_at).toLocaleTimeString('en-IN')}</span>
                      <span style={{ fontSize: 11, background: c.method === 'QR_SCAN' ? '#eff6ff' : '#f0fdf4', color: c.method === 'QR_SCAN' ? '#1d4ed8' : '#166534', borderRadius: 10, padding: '2px 8px' }}>
                        {c.method}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LEADS / CONVERSIONS TAB ───────────────────────────────────────────── */}
      {tab === 'Leads & Conversions' && (
        <div>
          {/* Funnel */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Conversion Funnel</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[
                { label: 'Registered', value: stats.registered || 0, color: '#2563eb' },
                { label: 'Checked-in', value: stats.checked_in || 0, color: '#7c3aed' },
                { label: 'Leads', value: stats.leads_created || 0, color: '#059669' },
                { label: 'Cases', value: stats.cases_created || 0, color: '#dc2626' },
              ].map((f, i) => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <div style={{ flex: 1, background: f.color + '12', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: f.color }}>{f.value}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{f.label}</div>
                  </div>
                  {i < 3 && <div style={{ fontSize: 20, color: '#cbd5e1' }}>→</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Bulk actions */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button onClick={handleBulkConvert} disabled={converting}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              {converting ? 'Converting...' : 'Bulk Convert Checked-in → Leads'}
            </button>
            <select value={intentFilter} onChange={e => setIntentFilter(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
              <option value="all">All Attendees</option>
              <option value="hot">Hot (80+)</option>
              <option value="warm">Warm (50–79)</option>
              <option value="cold">Cold (&lt;50)</option>
              <option value="no_show">No-show</option>
              <option value="docs_uploaded">Docs Uploaded</option>
            </select>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Name', 'Phone', 'Score', 'Status', 'Lead?', 'Case?', 'Owner', 'Convert'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13 }}>{l.full_name}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>{l.phone_e164}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 700, color: (l.intent_score || 0) >= 80 ? '#dc2626' : (l.intent_score || 0) >= 50 ? '#d97706' : '#64748b' }}>
                        {l.intent_score || 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: (STATUS_COLOR[l.status] || '#78909c') + '18', color: STATUS_COLOR[l.status] || '#78909c', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>{l.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {l.lead_id ? <span style={{ color: '#059669', fontSize: 13 }}>✓</span> : <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {l.case_id ? <span style={{ color: '#2563eb', fontSize: 13 }}>✓</span> : <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{l.assigned_user_id || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {!l.lead_id && (
                        <button onClick={async () => { await eventsApi.convertRegistration(eventId, l.id, {}); loadLeads(); }}
                          style={{ border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', background: '#eff6ff', color: '#1d4ed8' }}>
                          → Lead
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No attendees found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'Settings' && (
        <SettingsTab event={event} onSave={async (data) => { await eventsApi.updateEvent(eventId, data); loadEvent(); }} />
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 480, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Send Broadcast</h3>
              <button onClick={() => setShowBroadcast(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>
            <form onSubmit={handleBroadcast}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Template Name *</label>
                  <select required value={broadcastForm.template_name}
                    onChange={e => setBroadcastForm(f => ({ ...f, template_name: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
                    <option value="">Choose template...</option>
                    {['nx_event_ticket','nx_event_reminder_24h','nx_event_reminder_3h','nx_event_map','nx_event_thanks_followup'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Audience Segment</label>
                  <select onChange={e => {
                    const val = e.target.value;
                    if (val === 'all') setBroadcastForm(f => ({ ...f, audience_filter: {} }));
                    else if (val === 'confirmed') setBroadcastForm(f => ({ ...f, audience_filter: { status: 'CONFIRMED' } }));
                    else if (val === 'registered') setBroadcastForm(f => ({ ...f, audience_filter: { status: 'REGISTERED' } }));
                    else if (val === 'high_intent') setBroadcastForm(f => ({ ...f, audience_filter: { intent_min: 70 } }));
                  }} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
                    <option value="all">All Registered</option>
                    <option value="confirmed">Confirmed Only</option>
                    <option value="registered">Registered Only</option>
                    <option value="high_intent">High Intent (70+)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowBroadcast(false)}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 20px', background: '#fff', cursor: 'pointer', color: '#475569' }}>Cancel</button>
                <button type="submit" disabled={sending}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
                  {sending ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualCheckinForm({ onCheckin }) {
  const [input, setInput] = useState('');
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <input value={input} onChange={e => setInput(e.target.value)}
        placeholder="Ticket ID or phone..."
        style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}
        onKeyDown={e => { if (e.key === 'Enter' && input) { onCheckin(input); setInput(''); } }} />
      <button onClick={() => { if (input) { onCheckin(input); setInput(''); } }}
        style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600 }}>
        Check In
      </button>
    </div>
  );
}

function SettingsTab({ event, onSave }) {
  const [form, setForm] = useState({
    title: event.title,
    venue_name: event.venue_name,
    venue_address: event.venue_address,
    map_url: event.map_url || '',
    capacity_total: event.capacity_total,
    event_start_at: event.event_start_at?.slice(0, 16) || '',
    event_end_at: event.event_end_at?.slice(0, 16) || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); alert('Saved!'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600 }}>Event Settings</h3>
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gap: 16 }}>
          <Field label="Event Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Start" type="datetime-local" value={form.event_start_at} onChange={v => setForm(f => ({ ...f, event_start_at: v }))} />
            <Field label="End" type="datetime-local" value={form.event_end_at} onChange={v => setForm(f => ({ ...f, event_end_at: v }))} />
          </div>
          <Field label="Venue Name" value={form.venue_name} onChange={v => setForm(f => ({ ...f, venue_name: v }))} />
          <Field label="Venue Address" value={form.venue_address} onChange={v => setForm(f => ({ ...f, venue_address: v }))} />
          <Field label="Map URL" value={form.map_url} onChange={v => setForm(f => ({ ...f, map_url: v }))} placeholder="https://maps.google.com/..." />
          <Field label="Total Capacity" type="number" value={form.capacity_total} onChange={v => setForm(f => ({ ...f, capacity_total: parseInt(v) }))} />
        </div>
        <button type="submit" disabled={saving}
          style={{ marginTop: 20, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }} />
    </div>
  );
}
