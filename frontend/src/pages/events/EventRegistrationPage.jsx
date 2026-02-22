import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApi } from '../../api.js';

export default function EventRegistrationPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    phone_e164: '',
    email: '',
    ticket_type: 'FREE',
    answers: {
      country: '',
      loan_amount_range: '',
      university: '',
    },
  });

  useEffect(() => {
    eventsApi.getPublicEvent(slug)
      .then(data => {
        if (data.error) setError(data.error);
        else setEvent(data);
      })
      .catch(() => setError('Event not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await eventsApi.registerForEvent(slug, {
        ...form,
        utm: {
          source: new URLSearchParams(window.location.search).get('utm_source'),
          campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
          medium: new URLSearchParams(window.location.search).get('utm_medium'),
        },
      });
      if (res.error) { setError(res.error); return; }
      setSuccess(res);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#64748b', fontSize: 16 }}>Loading event...</div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ color: '#0f172a' }}>Event Not Found</h2>
          <p style={{ color: '#64748b' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ background: '#DCFCE7', borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36 }}>
            🎉
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Registration Successful!</h2>
          <p style={{ color: '#64748b', margin: '0 0 24px' }}>Hi {form.full_name}, your ticket is confirmed.</p>

          {success.status === 'WAITLISTED' ? (
            <div style={{ background: '#fef9c3', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ margin: 0, color: '#854d0e', fontSize: 14 }}>You're on the waitlist. We'll notify you if a spot opens!</p>
            </div>
          ) : (
            <div style={{ background: '#f0fdf4', border: '2px solid #CBD5E1', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Your Ticket ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: 2 }}>
                {success.ticket_code}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Show this at entry • Check WhatsApp for your QR ticket</div>
            </div>
          )}

          <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 10 }}>📅 Event Details</div>
            <div style={{ fontSize: 13, color: '#374151', display: 'grid', gap: 6 }}>
              <div>📍 {event?.venue_name}, {event?.venue_address}</div>
              <div>🕙 {event ? new Date(event.event_start_at).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            <button
              onClick={() => window.open(`/ticket/${success.ticket_code}`, '_blank')}
              style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              View My Ticket
            </button>
            {event?.map_url && (
              <a href={event.map_url} target="_blank" rel="noreferrer"
                style={{ color: '#2563eb', fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
                📍 Get Directions
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const freeType = event?.ticket_types?.find(t => t.name === 'FREE');
  const vipType = event?.ticket_types?.find(t => t.name === 'VIP');
  const spotsLeft = event?.spots_left || 0;
  const isFull = spotsLeft <= 0;

  const eventDate = event ? new Date(event.event_start_at) : null;
  const eventDateStr = eventDate ? eventDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const eventTimeStr = eventDate ? eventDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Hero Banner */}
      <div style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff', padding: '48px 20px 32px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', opacity: 0.8, marginBottom: 12, textTransform: 'uppercase' }}>
            Nexthara Future — Exclusive Event
          </div>
          <h1 style={{ margin: '0 0 16px', fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>{event?.title}</h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', fontSize: 14, opacity: 0.9 }}>
            <span>📅 {eventDateStr}</span>
            <span>🕙 {eventTimeStr}</span>
            <span>📍 {event?.venue_name}</span>
          </div>
          {isFull && (
            <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 16px', fontSize: 13 }}>
              ⚠️ Event is full — you'll be added to the waitlist
            </div>
          )}
        </div>
      </div>

      {/* Benefits */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { icon: '🔍', label: 'Free Loan Eligibility Check' },
            { icon: '📄', label: 'On-spot Document Review' },
            { icon: '🏦', label: 'Bank Process Guidance' },
            { icon: '🎓', label: 'Scholarship Insights' },
          ].map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#374151' }}>
              <span style={{ fontSize: 20 }}>{b.icon}</span>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Registration Form */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Book Your Ticket</h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b' }}>🎟️ Limited seats. First come, first served.</p>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Full Name *</label>
                <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 16px', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Phone Number (+91) *</label>
                <input required value={form.phone_e164} onChange={e => setForm(f => ({ ...f, phone_e164: e.target.value }))}
                  placeholder="9876543210" type="tel"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 16px', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email (optional)</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@email.com"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 16px', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Country Interested In</label>
                <select value={form.answers.country} onChange={e => setForm(f => ({ ...f, answers: { ...f.answers, country: e.target.value } }))}
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 16px', fontSize: 15, boxSizing: 'border-box', outline: 'none' }}>
                  <option value="">Select country...</option>
                  {['UK', 'Germany', 'Canada', 'Australia', 'USA', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Expected Loan Amount</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {['<10L', '10-20L', '20-30L', '30L+'].map(range => (
                    <label key={range} style={{
                      border: `2px solid ${form.answers.loan_amount_range === range ? '#2563eb' : '#e2e8f0'}`,
                      borderRadius: 10, padding: '10px 6px', textAlign: 'center', cursor: 'pointer',
                      fontSize: 13, fontWeight: 500,
                      background: form.answers.loan_amount_range === range ? '#eff6ff' : '#fff',
                      color: form.answers.loan_amount_range === range ? '#2563eb' : '#374151',
                      transition: 'all 0.15s',
                    }}>
                      <input type="radio" name="loan_range" value={range}
                        checked={form.answers.loan_amount_range === range}
                        onChange={e => setForm(f => ({ ...f, answers: { ...f.answers, loan_amount_range: e.target.value } }))}
                        style={{ display: 'none' }} />
                      {range}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>University (optional)</label>
                <input value={form.answers.university} onChange={e => setForm(f => ({ ...f, answers: { ...f.answers, university: e.target.value } }))}
                  placeholder="University name"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 16px', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
              </div>

              {/* Ticket Type */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 10 }}>Ticket Type</label>
                <div style={{ display: 'grid', gap: 10 }}>
                  {event?.ticket_types?.map(tt => (
                    <label key={tt.id} style={{
                      border: `2px solid ${form.ticket_type === tt.name ? '#2563eb' : '#e2e8f0'}`,
                      borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                      background: form.ticket_type === tt.name ? '#eff6ff' : '#fff',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="radio" name="ticket_type" value={tt.name}
                          checked={form.ticket_type === tt.name}
                          onChange={e => setForm(f => ({ ...f, ticket_type: e.target.value }))} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{tt.name}</div>
                          {tt.benefits && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{tt.benefits}</div>}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: tt.price_paise > 0 ? '#dc2626' : '#059669' }}>
                        {tt.price_paise > 0 ? `₹${(tt.price_paise / 100).toFixed(0)}` : 'FREE'}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={submitting}
                style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, padding: '15px', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginTop: 4, transition: 'background 0.15s' }}
                onMouseOver={e => e.target.style.background = '#1D4ED8'}
                onMouseOut={e => e.target.style.background = '#2563EB'}>
                {submitting ? 'Registering...' : isFull ? '📋 Join Waitlist' : '🎟️ Confirm Registration'}
              </button>

              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                You will receive your ticket on WhatsApp instantly
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
