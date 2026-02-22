import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApi } from '../../api.js';

export default function EventTicketPage() {
  const { code } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const qrRef = useRef(null);

  useEffect(() => {
    eventsApi.getTicket(code)
      .then(data => {
        if (data.error) setError(data.error);
        else setTicket(data);
      })
      .catch(() => setError('Ticket not found'))
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (ticket && qrRef.current) {
      // Use a QR code via a free CDN image service based on the ticket payload
      // We embed the QR as an img tag pointing to a QR generator API
    }
  }, [ticket]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#64748b' }}>Loading ticket...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
          <h2 style={{ color: '#0f172a' }}>Ticket Not Found</h2>
          <p style={{ color: '#64748b' }}>{error || 'This ticket does not exist.'}</p>
        </div>
      </div>
    );
  }

  const eventDate = new Date(ticket.event_start_at);
  const dateStr = eventDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = eventDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticket.qr_payload || ticket.ticket_code)}`;

  const isCheckedIn = ticket.status === 'CHECKED_IN';
  const isCancelled = ticket.status === 'CANCELLED';

  // Calendar link
  const calStart = eventDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const calEnd = new Date(ticket.event_end_at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ticket.title)}&dates=${calStart}/${calEnd}&location=${encodeURIComponent(ticket.venue_address)}&details=${encodeURIComponent('Ticket: ' + ticket.ticket_code)}`;

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(`My ticket for ${ticket.title}:\nDate: ${dateStr}\nVenue: ${ticket.venue_name}\nTicket: ${ticket.ticket_code}`)}`;

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '20px 16px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>

        {/* Success / Status Header */}
        {isCheckedIn && (
          <div style={{ background: '#dcfce7', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: 15 }}>Already Checked In</div>
              <div style={{ fontSize: 12, color: '#15803d' }}>
                {ticket.checked_in_at ? `at ${new Date(ticket.checked_in_at).toLocaleTimeString('en-IN')}` : ''}
              </div>
            </div>
          </div>
        )}
        {isCancelled && (
          <div style={{ background: '#fef2f2', borderRadius: 12, padding: '14px 20px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#dc2626' }}>❌ Ticket Cancelled</div>
          </div>
        )}

        {/* Ticket Card */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(37, 99, 235, 0.15)',
          border: '1px solid #EFF6FF',
        }}>
          {/* Brand stripe */}
          <div style={{ height: 6, background: 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%)' }} />

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>
              Nexthara Future — Event Ticket
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{ticket.title}</div>
            {ticket.ticket_type_name && (
              <span style={{ marginTop: 8, display: 'inline-block', background: ticket.ticket_type_name === 'VIP' ? '#f59e0b' : 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '2px 12px', fontSize: 12, fontWeight: 700 }}>
                {ticket.ticket_type_name} TICKET
              </span>
            )}
          </div>

          {/* Attendee info */}
          <div style={{ padding: '20px 24px', borderBottom: '2px dashed #e2e8f0' }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <InfoRow icon="👤" label="Name" value={ticket.full_name} />
              <InfoRow icon="📅" label="Date" value={dateStr} />
              <InfoRow icon="🕙" label="Time" value={timeStr} />
              <InfoRow icon="📍" label="Venue" value={`${ticket.venue_name}, ${ticket.venue_address}`} />
            </div>
          </div>

          {/* QR Code */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ background: '#EFF6FF', border: '2px solid #CBD5E1', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <img
                src={qrUrl}
                alt={`QR Code for ${ticket.ticket_code}`}
                style={{ width: 200, height: 200, display: 'block', borderRadius: 8 }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: 2, marginBottom: 8 }}>
              {ticket.ticket_code}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              Show this QR code at the entry gate
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          <a href={calUrl} target="_blank" rel="noreferrer"
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, textAlign: 'center', textDecoration: 'none', color: '#374151', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            📅 Add to Calendar
          </a>
          {ticket.map_url && (
            <a href={ticket.map_url} target="_blank" rel="noreferrer"
              style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, textAlign: 'center', textDecoration: 'none', color: '#374151', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              📍 Get Directions
            </a>
          )}
          <a href={whatsappShare} target="_blank" rel="noreferrer"
            style={{ background: '#25d366', border: 'none', borderRadius: 12, padding: 14, textAlign: 'center', textDecoration: 'none', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Share on WhatsApp
          </a>
        </div>

        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 20 }}>
          Nexthara Future • Education Loan & Student Funding
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}
