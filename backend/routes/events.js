import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ─── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return crypto.randomUUID(); }

function generateTicketCode(eventId) {
  const prefix = 'NXE';
  const year = new Date().getFullYear().toString().slice(-2);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const day = String(new Date().getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${month}${day}-${rand}`;
}

function computeIntentScore(answers = {}, ticketType = 'FREE') {
  let score = 0;
  const loan = (answers.loan_amount_range || '');
  if (loan === '30L+') score += 25;
  else if (loan === '20-30L') score += 15;
  else if (loan === '10-20L') score += 10;
  if (answers.admission_received === 'Yes') score += 20;
  if (ticketType === 'VIP') score += 15;
  return Math.min(score, 100);
}

function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/[\s\-\(\)]/g, '');
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('+')) {
    if (p.length === 10) p = '+91' + p;
    else p = '+' + p;
  }
  if (!/^\+\d{7,15}$/.test(p)) return null;
  return p;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF ROUTES  (all require auth)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/events — list all events
router.get('/', requireAuth, (req, res) => {
  const { status, branch_id, from, to, search } = req.query;
  let q = `SELECT e.*,
    (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status != 'CANCELLED') AS reg_count,
    (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'CHECKED_IN') AS checkin_count,
    (SELECT COUNT(*) FROM event_lead_links l WHERE l.event_id = e.id AND l.lead_id IS NOT NULL) AS leads_count,
    (SELECT COUNT(*) FROM event_lead_links l WHERE l.event_id = e.id AND l.case_id IS NOT NULL) AS cases_count
    FROM events e WHERE 1=1`;
  const params = [];
  if (status) { q += ' AND e.status = ?'; params.push(status); }
  if (branch_id) { q += ' AND e.branch_id = ?'; params.push(branch_id); }
  if (from) { q += ' AND e.event_start_at >= ?'; params.push(from); }
  if (to) { q += ' AND e.event_start_at <= ?'; params.push(to); }
  if (search) { q += ' AND (e.title LIKE ? OR e.slug LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  q += ' ORDER BY e.event_start_at DESC';
  res.json(db.prepare(q).all(...params));
});

// GET /api/events/analytics — overview analytics across all events
router.get('/analytics', requireAuth, (req, res) => {
  const { from, to, branch_id } = req.query;
  const totalEvents = db.prepare('SELECT COUNT(*) as c FROM events WHERE 1=1').get().c;
  const totalRegs = db.prepare(`SELECT COUNT(*) as c FROM event_registrations WHERE status NOT IN ('CANCELLED','WAITLISTED')`).get().c;
  const totalCheckins = db.prepare(`SELECT COUNT(*) as c FROM event_registrations WHERE status = 'CHECKED_IN'`).get().c;
  const totalLeads = db.prepare(`SELECT COUNT(*) as c FROM event_lead_links WHERE lead_id IS NOT NULL`).get().c;
  const totalCases = db.prepare(`SELECT COUNT(*) as c FROM event_lead_links WHERE case_id IS NOT NULL`).get().c;

  const eventPerf = db.prepare(`
    SELECT e.id, e.title, e.event_start_at, e.slug, e.status,
      COUNT(DISTINCT CASE WHEN r.status != 'CANCELLED' THEN r.id END) as registrations,
      COUNT(DISTINCT CASE WHEN r.status = 'CONFIRMED' THEN r.id END) as confirmed,
      COUNT(DISTINCT CASE WHEN r.status = 'CHECKED_IN' THEN r.id END) as checked_in,
      COUNT(DISTINCT CASE WHEN r.status = 'NO_SHOW' THEN r.id END) as no_shows,
      COUNT(DISTINCT l.id) as leads,
      COUNT(DISTINCT CASE WHEN l.case_id IS NOT NULL THEN l.id END) as cases
    FROM events e
    LEFT JOIN event_registrations r ON r.event_id = e.id
    LEFT JOIN event_lead_links l ON l.event_id = e.id AND l.lead_id IS NOT NULL
    GROUP BY e.id
    ORDER BY e.event_start_at DESC
    LIMIT 50
  `).all();

  const sourceBreakdown = db.prepare(`
    SELECT source, COUNT(*) as count FROM event_registrations GROUP BY source
  `).all();

  res.json({ totalEvents, totalRegs, totalCheckins, totalLeads, totalCases, eventPerf, sourceBreakdown });
});

// POST /api/events — create event
router.post('/', requireAuth, (req, res) => {
  const {
    title, slug, description, banner_url,
    event_start_at, event_end_at, timezone,
    venue_name, venue_address, map_url,
    capacity_total, ticket_types = [],
    branch_id, event_cost_paise
  } = req.body;

  if (!title || !slug || !event_start_at || !event_end_at || !venue_name || !venue_address) {
    return res.status(400).json({ error: 'title, slug, event_start_at, event_end_at, venue_name, venue_address required' });
  }

  const existing = db.prepare('SELECT id FROM events WHERE slug = ?').get(slug);
  if (existing) return res.status(409).json({ error: 'Slug already exists' });

  const id = uid();
  db.prepare(`INSERT INTO events (id, title, slug, description, banner_url, event_start_at, event_end_at, timezone, venue_name, venue_address, map_url, capacity_total, status, branch_id, event_cost_paise, owner_user_id, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?)`)
    .run(id, title, slug, description || null, banner_url || null, event_start_at, event_end_at,
      timezone || 'Asia/Kolkata', venue_name, venue_address, map_url || null,
      capacity_total || 600, branch_id || null, event_cost_paise || 0, req.user.id, req.user.id);

  // Insert ticket types
  for (const tt of ticket_types) {
    db.prepare(`INSERT INTO event_ticket_types (id, event_id, name, price_paise, max_quantity, benefits)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .run(uid(), id, tt.name, tt.price_paise || 0, tt.max_quantity || null, tt.benefits || null);
  }

  res.json({ id, slug, message: 'Event created' });
});

// GET /api/events/:id — event detail
router.get('/:id', requireAuth, (req, res) => {
  const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  const ticketTypes = db.prepare(`SELECT * FROM event_ticket_types WHERE event_id = ?`).all(req.params.id);
  const stats = db.prepare(`
    SELECT
      SUM(CASE WHEN status NOT IN ('CANCELLED','WAITLISTED') THEN 1 ELSE 0 END) as registered,
      SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'CHECKED_IN' THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_shows,
      SUM(CASE WHEN status = 'WAITLISTED' THEN 1 ELSE 0 END) as waitlisted
    FROM event_registrations WHERE event_id = ?
  `).get(req.params.id);
  const leadsCreated = db.prepare(`SELECT COUNT(*) as c FROM event_lead_links WHERE event_id = ? AND lead_id IS NOT NULL`).get(req.params.id).c;
  const casesCreated = db.prepare(`SELECT COUNT(*) as c FROM event_lead_links WHERE event_id = ? AND case_id IS NOT NULL`).get(req.params.id).c;
  res.json({ ...event, ticket_types: ticketTypes, stats: { ...stats, leads_created: leadsCreated, cases_created: casesCreated } });
});

// PATCH /api/events/:id — update event
router.patch('/:id', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  const fields = ['title', 'description', 'banner_url', 'event_start_at', 'event_end_at', 'timezone',
    'venue_name', 'venue_address', 'map_url', 'capacity_total', 'status', 'branch_id',
    'event_cost_paise', 'owner_user_id'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  updates.push(`updated_at = datetime('now')`);
  params.push(req.params.id);
  db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Updated' });
});

// GET /api/events/:id/registrations — list registrations
router.get('/:id/registrations', requireAuth, (req, res) => {
  const { status, search, source } = req.query;
  let q = `SELECT r.*, tt.name as ticket_type_name, tt.price_paise,
    l.lead_id, l.case_id, l.conversion_status
    FROM event_registrations r
    LEFT JOIN event_ticket_types tt ON tt.id = r.ticket_type_id
    LEFT JOIN event_lead_links l ON l.registration_id = r.id
    WHERE r.event_id = ?`;
  const params = [req.params.id];
  if (status) { q += ' AND r.status = ?'; params.push(status); }
  if (source) { q += ' AND r.source = ?'; params.push(source); }
  if (search) { q += ' AND (r.full_name LIKE ? OR r.phone_e164 LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  q += ' ORDER BY r.registered_at DESC';
  const rows = db.prepare(q).all(...params);
  const parsed = rows.map(r => ({ ...r, extra_answers: JSON.parse(r.extra_answers || '{}'), tags: JSON.parse(r.tags || '[]') }));
  res.json(parsed);
});

// POST /api/events/:id/checkin — check in a ticket
router.post('/:id/checkin', requireAuth, (req, res) => {
  const { ticket_code, method = 'QR_SCAN', phone } = req.body;
  if (!ticket_code && !phone) return res.status(400).json({ error: 'ticket_code or phone required' });

  let reg;
  if (ticket_code) {
    reg = db.prepare(`SELECT * FROM event_registrations WHERE ticket_code = ? AND event_id = ?`).get(ticket_code, req.params.id);
  } else {
    const normalized = normalizePhone(phone);
    reg = db.prepare(`SELECT * FROM event_registrations WHERE phone_e164 = ? AND event_id = ?`).get(normalized, req.params.id);
  }

  if (!reg) return res.status(404).json({ error: 'Ticket not found' });
  if (reg.status === 'CHECKED_IN') return res.status(409).json({ error: 'Already checked in', registration: reg });
  if (reg.status === 'CANCELLED') return res.status(400).json({ error: 'Ticket cancelled' });

  // Update status
  db.prepare(`UPDATE event_registrations SET status = 'CHECKED_IN', checked_in_at = datetime('now') WHERE id = ?`).run(reg.id);

  // Audit log
  db.prepare(`INSERT INTO event_checkins (id, event_id, registration_id, checked_in_by_user_id, method) VALUES (?, ?, ?, ?, ?)`)
    .run(uid(), req.params.id, reg.id, req.user.id, method);

  // Update intent score (+20 for check-in)
  const newScore = Math.min((reg.intent_score || 0) + 20, 100);
  db.prepare(`UPDATE event_registrations SET intent_score = ? WHERE id = ?`).run(newScore, reg.id);

  // Auto-upsert lead link if registration had one
  const existingLink = db.prepare(`SELECT * FROM event_lead_links WHERE registration_id = ?`).get(reg.id);
  if (!existingLink) {
    db.prepare(`INSERT OR IGNORE INTO event_lead_links (id, event_id, registration_id, intent_score) VALUES (?, ?, ?, ?)`)
      .run(uid(), req.params.id, reg.id, newScore);
  } else {
    db.prepare(`UPDATE event_lead_links SET intent_score = ? WHERE registration_id = ?`).run(newScore, reg.id);
  }

  const updated = db.prepare('SELECT * FROM event_registrations WHERE id = ?').get(reg.id);
  res.json({ message: 'Checked in', registration: updated });
});

// GET /api/events/:id/messages — list broadcast messages
router.get('/:id/messages', requireAuth, (req, res) => {
  const msgs = db.prepare(`SELECT m.*,
    COUNT(d.id) as total_recipients,
    SUM(CASE WHEN d.delivery_status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
    SUM(CASE WHEN d.delivery_status = 'FAILED' THEN 1 ELSE 0 END) as failed
    FROM event_messages m
    LEFT JOIN event_message_delivery d ON d.event_message_id = m.id
    WHERE m.event_id = ?
    GROUP BY m.id
    ORDER BY m.created_at DESC`).all(req.params.id);
  res.json(msgs);
});

// POST /api/events/:id/messages — send/schedule broadcast
router.post('/:id/messages', requireAuth, (req, res) => {
  const { channel = 'WHATSAPP', template_name, audience_filter = {}, payload = {}, scheduled_at } = req.body;
  if (!template_name) return res.status(400).json({ error: 'template_name required' });
  const msgId = uid();
  const status = scheduled_at ? 'SCHEDULED' : 'SENT';
  db.prepare(`INSERT INTO event_messages (id, event_id, audience_filter, channel, template_name, payload, status, scheduled_at, sent_at, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(msgId, req.params.id, JSON.stringify(audience_filter), channel, template_name,
      JSON.stringify(payload), status, scheduled_at || null,
      scheduled_at ? null : new Date().toISOString(), req.user.id);

  // Build recipient list from audience_filter
  let regsQ = `SELECT * FROM event_registrations WHERE event_id = ? AND status NOT IN ('CANCELLED','WAITLISTED')`;
  const regsParams = [req.params.id];
  if (audience_filter.status) { regsQ += ' AND status = ?'; regsParams.push(audience_filter.status); }
  if (audience_filter.intent_min) { regsQ += ' AND intent_score >= ?'; regsParams.push(audience_filter.intent_min); }
  const recipients = db.prepare(regsQ).all(...regsParams);

  const insDelivery = db.prepare(`INSERT INTO event_message_delivery (id, event_message_id, registration_id, to_address, delivery_status) VALUES (?, ?, ?, ?, 'QUEUED')`);
  for (const r of recipients) {
    insDelivery.run(uid(), msgId, r.id, r.phone_e164);
  }

  res.json({ message_id: msgId, recipients_queued: recipients.length, status });
});

// POST /api/events/:id/convert/bulk-to-leads — bulk convert checked-in
router.post('/:id/convert/bulk-to-leads', requireAuth, (req, res) => {
  const { counselor_id } = req.body;
  const checkedIn = db.prepare(`
    SELECT r.* FROM event_registrations r
    LEFT JOIN event_lead_links l ON l.registration_id = r.id
    WHERE r.event_id = ? AND r.status = 'CHECKED_IN' AND l.lead_id IS NULL
  `).all(req.params.id);

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  let created = 0;

  for (const reg of checkedIn) {
    const answers = JSON.parse(reg.extra_answers || '{}');
    const tags = JSON.parse(reg.tags || '[]');
    if (!tags.includes('EVENT_REGISTERED')) tags.push('EVENT_REGISTERED');

    const leadId = uid();
    db.prepare(`INSERT INTO leads (id, full_name, phone_e164, email, source, campaign_name, country, lead_source_type, event_registration_id, intent_score, tags, stage, assigned_staff_id, assignment_mode, assigned_at)
      VALUES (?, ?, ?, ?, 'EVENT', ?, ?, 'EVENT', ?, ?, ?, 'CONNECTED', ?, 'AUTO', datetime('now'))`)
      .run(leadId, reg.full_name, reg.phone_e164, reg.email || null, event.title,
        answers.country || null, reg.id, reg.intent_score || 0, JSON.stringify(tags),
        counselor_id || null);

    // Upsert event_lead_links
    const existingLink = db.prepare(`SELECT id FROM event_lead_links WHERE registration_id = ?`).get(reg.id);
    if (existingLink) {
      db.prepare(`UPDATE event_lead_links SET lead_id = ?, converted_by_user_id = ?, converted_at = datetime('now'), conversion_status = 'LEAD_CREATED', assigned_user_id = ? WHERE id = ?`)
        .run(leadId, req.user.id, counselor_id || null, existingLink.id);
    } else {
      db.prepare(`INSERT INTO event_lead_links (id, event_id, registration_id, lead_id, converted_by_user_id, converted_at, conversion_status, assigned_user_id) VALUES (?, ?, ?, ?, ?, datetime('now'), 'LEAD_CREATED', ?)`)
        .run(uid(), req.params.id, reg.id, leadId, req.user.id, counselor_id || null);
    }
    created++;
  }

  res.json({ leads_created: created });
});

// POST /api/events/:id/convert/registration/:regId — convert single registration
router.post('/:id/convert/registration/:regId', requireAuth, (req, res) => {
  const reg = db.prepare(`SELECT * FROM event_registrations WHERE id = ? AND event_id = ?`).get(req.params.regId, req.params.id);
  if (!reg) return res.status(404).json({ error: 'Registration not found' });

  const { counselor_id, create_case = false } = req.body;
  const answers = JSON.parse(reg.extra_answers || '{}');
  const tags = JSON.parse(reg.tags || '[]');
  if (!tags.includes('EVENT_REGISTERED')) tags.push('EVENT_REGISTERED');

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);

  // Check if lead already exists
  let existingLink = db.prepare(`SELECT * FROM event_lead_links WHERE registration_id = ?`).get(reg.id);
  let leadId = existingLink?.lead_id;

  if (!leadId) {
    leadId = uid();
    db.prepare(`INSERT INTO leads (id, full_name, phone_e164, email, source, campaign_name, country, lead_source_type, event_registration_id, intent_score, tags, stage, assigned_staff_id)
      VALUES (?, ?, ?, ?, 'EVENT', ?, ?, 'EVENT', ?, ?, ?, 'CONNECTED', ?)`)
      .run(leadId, reg.full_name, reg.phone_e164, reg.email || null, event.title,
        answers.country || null, reg.id, reg.intent_score || 0, JSON.stringify(tags), counselor_id || null);

    if (existingLink) {
      db.prepare(`UPDATE event_lead_links SET lead_id = ?, converted_by_user_id = ?, converted_at = datetime('now'), conversion_status = 'LEAD_CREATED', assigned_user_id = ? WHERE id = ?`)
        .run(leadId, req.user.id, counselor_id || null, existingLink.id);
    } else {
      db.prepare(`INSERT INTO event_lead_links (id, event_id, registration_id, lead_id, converted_by_user_id, converted_at, conversion_status, assigned_user_id) VALUES (?, ?, ?, ?, ?, datetime('now'), 'LEAD_CREATED', ?)`)
        .run(uid(), req.params.id, reg.id, leadId, req.user.id, counselor_id || null);
      existingLink = db.prepare(`SELECT * FROM event_lead_links WHERE registration_id = ?`).get(reg.id);
    }
  }

  res.json({ lead_id: leadId, message: 'Converted to lead' });
});

// GET /api/events/:id/analytics — per-event analytics
router.get('/:id/analytics', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });

  const kpis = db.prepare(`
    SELECT
      SUM(CASE WHEN status NOT IN ('CANCELLED','WAITLISTED') THEN 1 ELSE 0 END) as registered,
      SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'CHECKED_IN' THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_shows,
      SUM(CASE WHEN status = 'WAITLISTED' THEN 1 ELSE 0 END) as waitlisted,
      AVG(intent_score) as avg_intent
    FROM event_registrations WHERE event_id = ?
  `).get(req.params.id);

  const leads = db.prepare(`SELECT COUNT(*) as c FROM event_lead_links WHERE event_id = ? AND lead_id IS NOT NULL`).get(req.params.id).c;
  const cases = db.prepare(`SELECT COUNT(*) as c FROM event_lead_links WHERE event_id = ? AND case_id IS NOT NULL`).get(req.params.id).c;

  const funnel = { registered: kpis.registered || 0, confirmed: kpis.confirmed || 0, checked_in: kpis.checked_in || 0, leads, cases };

  const sourceBreakdown = db.prepare(`SELECT source, COUNT(*) as count FROM event_registrations WHERE event_id = ? GROUP BY source`).all(req.params.id);
  const ticketBreakdown = db.prepare(`SELECT tt.name, COUNT(r.id) as count FROM event_registrations r JOIN event_ticket_types tt ON tt.id = r.ticket_type_id WHERE r.event_id = ? GROUP BY tt.name`).all(req.params.id);
  const intentBreakdown = db.prepare(`SELECT
    SUM(CASE WHEN intent_score >= 80 THEN 1 ELSE 0 END) as hot,
    SUM(CASE WHEN intent_score >= 50 AND intent_score < 80 THEN 1 ELSE 0 END) as warm,
    SUM(CASE WHEN intent_score < 50 THEN 1 ELSE 0 END) as cold
    FROM event_registrations WHERE event_id = ?`).get(req.params.id);
  const campaignBreakdown = db.prepare(`SELECT meta_campaign_id, COUNT(*) as count FROM event_registrations WHERE event_id = ? AND meta_campaign_id IS NOT NULL GROUP BY meta_campaign_id`).all(req.params.id);

  res.json({ event, kpis: { ...kpis, leads_created: leads, cases_created: cases }, funnel, sourceBreakdown, ticketBreakdown, intentBreakdown, campaignBreakdown });
});

// GET /api/events/:id/checkins — recent check-ins
router.get('/:id/checkins', requireAuth, (req, res) => {
  const checkins = db.prepare(`
    SELECT ec.*, r.full_name, r.phone_e164, r.ticket_code, r.status
    FROM event_checkins ec
    JOIN event_registrations r ON r.id = ec.registration_id
    WHERE ec.event_id = ?
    ORDER BY ec.created_at DESC
    LIMIT 50
  `).all(req.params.id);
  res.json(checkins);
});

// GET /api/events/:id/leads — leads/conversions tab data
router.get('/:id/leads', requireAuth, (req, res) => {
  const { intent } = req.query;
  let q = `SELECT r.id, r.full_name, r.phone_e164, r.status, r.intent_score, r.registered_at, r.checked_in_at,
    l.lead_id, l.case_id, l.conversion_status, l.assigned_user_id
    FROM event_registrations r
    LEFT JOIN event_lead_links l ON l.registration_id = r.id
    WHERE r.event_id = ?`;
  const params = [req.params.id];
  if (intent === 'hot') { q += ' AND r.intent_score >= 80'; }
  else if (intent === 'warm') { q += ' AND r.intent_score >= 50 AND r.intent_score < 80'; }
  else if (intent === 'cold') { q += ' AND r.intent_score < 50'; }
  else if (intent === 'no_show') { q += " AND r.status = 'NO_SHOW'"; }
  else if (intent === 'docs_uploaded') { q += " AND r.tags LIKE '%DOCS_UPLOADED%'"; }
  q += ' ORDER BY r.intent_score DESC, r.registered_at DESC';
  res.json(db.prepare(q).all(...params));
});

// GET /api/events/:id/export — export registrations CSV
router.get('/:id/export', requireAuth, (req, res) => {
  const regs = db.prepare(`SELECT r.*, tt.name as ticket_type_name FROM event_registrations r LEFT JOIN event_ticket_types tt ON tt.id = r.ticket_type_id WHERE r.event_id = ? ORDER BY r.registered_at DESC`).all(req.params.id);
  const headers = ['full_name', 'phone_e164', 'email', 'ticket_type_name', 'status', 'registered_at', 'checked_in_at', 'source', 'intent_score', 'utm_campaign'];
  const csv = [headers.join(','), ...regs.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="event-registrations.csv"`);
  res.send(csv);
});

// GET /api/events/:id/ticket-types — get ticket types for an event
router.get('/:id/ticket-types', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM event_ticket_types WHERE event_id = ?').all(req.params.id));
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC / STUDENT ROUTES  (no auth)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/events/public/event/:slug — student landing page data
router.get('/public/event/:slug', (req, res) => {
  const event = db.prepare(`SELECT id, title, slug, description, banner_url, event_start_at, event_end_at, timezone, venue_name, venue_address, map_url, capacity_total, capacity_reserved, status FROM events WHERE slug = ?`).get(req.params.slug);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.status === 'CANCELLED') return res.status(410).json({ error: 'Event cancelled' });
  const ticketTypes = db.prepare(`SELECT id, name, price_paise, max_quantity, benefits FROM event_ticket_types WHERE event_id = ? AND is_active = 1`).all(event.id);
  const spotsLeft = event.capacity_total - event.capacity_reserved;
  res.json({ ...event, ticket_types: ticketTypes, spots_left: spotsLeft });
});

// POST /api/events/public/event/:slug/register — student registration
router.post('/public/event/:slug/register', (req, res) => {
  const event = db.prepare(`SELECT * FROM events WHERE slug = ?`).get(req.params.slug);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.status !== 'LIVE') return res.status(400).json({ error: 'Event registration not open' });

  const { full_name, phone_e164: rawPhone, email, ticket_type, answers = {}, utm = {} } = req.body;
  if (!full_name || !rawPhone) return res.status(400).json({ error: 'full_name and phone are required' });

  const phone = normalizePhone(rawPhone);
  if (!phone) return res.status(400).json({ error: 'Invalid phone number' });

  // Dedupe check
  const existing = db.prepare(`SELECT * FROM event_registrations WHERE event_id = ? AND phone_e164 = ?`).get(event.id, phone);
  if (existing) {
    return res.json({
      registration_id: existing.id,
      ticket_code: existing.ticket_code,
      ticket_url: `/ticket/${existing.ticket_code}`,
      whatsapp_sent: false,
      message: 'Already registered — ticket resent'
    });
  }

  // Find ticket type
  let ttRow = null;
  if (ticket_type) {
    ttRow = db.prepare(`SELECT * FROM event_ticket_types WHERE event_id = ? AND name = ? AND is_active = 1`).get(event.id, ticket_type);
  }
  if (!ttRow) {
    ttRow = db.prepare(`SELECT * FROM event_ticket_types WHERE event_id = ? AND is_active = 1 ORDER BY price_paise ASC LIMIT 1`).get(event.id);
  }

  // Compute intent score
  const intentScore = computeIntentScore(answers, ttRow?.name || 'FREE');

  // Capacity check (transactional)
  const registrationTx = db.transaction(() => {
    const freshEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(event.id);
    const ticketCode = generateTicketCode(event.id);
    const qrPayload = `${event.id}:${ticketCode}`;
    const regId = uid();

    let status = 'REGISTERED';
    if (freshEvent.capacity_reserved >= freshEvent.capacity_total) {
      status = 'WAITLISTED';
    } else {
      db.prepare('UPDATE events SET capacity_reserved = capacity_reserved + 1 WHERE id = ?').run(event.id);
    }

    db.prepare(`INSERT INTO event_registrations (id, event_id, full_name, phone_e164, email, ticket_type_id, ticket_code, qr_payload, status, source, utm_source, utm_campaign, utm_medium, utm_term, utm_content, extra_answers, intent_score, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'LINK', ?, ?, ?, ?, ?, ?, ?, '[]')`)
      .run(regId, event.id, full_name, phone, email || null, ttRow?.id || null, ticketCode,
        qrPayload, status, utm.source || null, utm.campaign || null,
        utm.medium || null, utm.term || null, utm.content || null,
        JSON.stringify(answers), intentScore);

    // Create lead link entry
    db.prepare(`INSERT INTO event_lead_links (id, event_id, registration_id, intent_score) VALUES (?, ?, ?, ?)`)
      .run(uid(), event.id, regId, intentScore);

    // Auto-create a lead record (stage NEW)
    const leadId = uid();
    const tags = JSON.stringify(['EVENT_REGISTERED', `EVT:${event.id}`]);
    db.prepare(`INSERT INTO leads (id, full_name, phone_e164, email, source, campaign_name, country, lead_source_type, event_registration_id, intent_score, tags, stage)
      VALUES (?, ?, ?, ?, 'EVENT', ?, ?, 'EVENT', ?, ?, ?, 'NEW')`)
      .run(leadId, full_name, phone, email || null, event.title, answers.country || null, regId, intentScore, tags);

    db.prepare(`UPDATE event_lead_links SET lead_id = ?, conversion_status = 'LEAD_CREATED' WHERE registration_id = ?`)
      .run(leadId, regId);

    return { regId, ticketCode, qrPayload, status };
  });

  const result = registrationTx();

  res.json({
    registration_id: result.regId,
    ticket_code: result.ticketCode,
    ticket_url: `/ticket/${result.ticketCode}`,
    status: result.status,
    whatsapp_sent: false,
    message: result.status === 'WAITLISTED' ? 'Waitlisted — you will be notified if a spot opens.' : 'Registered! Your ticket is ready.'
  });
});

// GET /api/events/public/ticket/:code — fetch ticket
router.get('/public/ticket/:code', (req, res) => {
  const reg = db.prepare(`
    SELECT r.*, e.title, e.event_start_at, e.event_end_at, e.venue_name, e.venue_address, e.map_url,
      tt.name as ticket_type_name, tt.price_paise, tt.benefits
    FROM event_registrations r
    JOIN events e ON e.id = r.event_id
    LEFT JOIN event_ticket_types tt ON tt.id = r.ticket_type_id
    WHERE r.ticket_code = ?
  `).get(req.params.code);
  if (!reg) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ...reg, extra_answers: JSON.parse(reg.extra_answers || '{}'), tags: JSON.parse(reg.tags || '[]') });
});

// ═══════════════════════════════════════════════════════════════════════════════
// META WEBHOOK  (no auth — returns 200 always so Meta doesn't retry)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/integrations/meta', (req, res) => {
  const logId = uid();
  const payload = req.body;

  // Always log receipt
  db.prepare(`INSERT INTO integration_webhook_logs (id, provider, event_type, external_id, status, payload) VALUES (?, 'META', 'LEAD', ?, 'RECEIVED', ?)`)
    .run(logId, payload.meta_lead_id || null, JSON.stringify(payload));

  // Normalize phone
  const phone = normalizePhone(payload.phone);
  if (!phone) {
    db.prepare(`INSERT INTO integration_errors (id, provider, error_code, error_message, payload) VALUES (?, 'META', 'MISSING_PHONE', 'Phone missing or invalid', ?)`)
      .run(uid(), JSON.stringify(payload));
    db.prepare(`UPDATE integration_webhook_logs SET status = 'FAILED', message = 'missing phone' WHERE id = ?`).run(logId);
    return res.status(200).json({ ok: true });
  }

  // Find matching event via meta_event_mappings
  let event = null;
  if (payload.form_id) {
    const mapping = db.prepare(`SELECT * FROM meta_event_mappings WHERE meta_form_id = ? AND is_active = 1 LIMIT 1`).get(payload.form_id);
    if (mapping) event = db.prepare('SELECT * FROM events WHERE id = ?').get(mapping.event_id);
  }
  if (!event && payload.campaign_id) {
    const mapping = db.prepare(`SELECT * FROM meta_event_mappings WHERE meta_campaign_id = ? AND is_active = 1 LIMIT 1`).get(payload.campaign_id);
    if (mapping) event = db.prepare('SELECT * FROM events WHERE id = ?').get(mapping.event_id);
  }
  if (!event) {
    db.prepare(`INSERT INTO integration_errors (id, provider, error_code, error_message, payload) VALUES (?, 'META', 'UNMAPPED_EVENT', 'No event mapping found', ?)`)
      .run(uid(), JSON.stringify(payload));
    db.prepare(`UPDATE integration_webhook_logs SET status = 'UNMAPPED', message = 'no event mapping' WHERE id = ?`).run(logId);
    return res.status(200).json({ ok: true, note: 'unmapped' });
  }

  // Dedupe + register
  const metaTx = db.transaction(() => {
    let existing = null;
    if (payload.meta_lead_id) {
      existing = db.prepare(`SELECT * FROM event_registrations WHERE event_id = ? AND meta_lead_id = ?`).get(event.id, payload.meta_lead_id);
    }
    if (!existing) {
      existing = db.prepare(`SELECT * FROM event_registrations WHERE event_id = ? AND phone_e164 = ?`).get(event.id, phone);
    }

    if (existing) {
      // Merge fields
      db.prepare(`UPDATE event_registrations SET
        meta_lead_id = COALESCE(meta_lead_id, ?),
        meta_form_id = COALESCE(meta_form_id, ?),
        meta_ad_id = COALESCE(meta_ad_id, ?),
        meta_adset_id = COALESCE(meta_adset_id, ?),
        meta_campaign_id = COALESCE(meta_campaign_id, ?),
        email = COALESCE(email, ?),
        meta_raw_payload = ?
        WHERE id = ?`)
        .run(payload.meta_lead_id || null, payload.form_id || null, payload.ad_id || null,
          payload.adset_id || null, payload.campaign_id || null, payload.email || null,
          JSON.stringify(payload), existing.id);
      return { regId: existing.id, ticketCode: existing.ticket_code, isNew: false };
    }

    // New registration
    const freshEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(event.id);
    const ticketCode = generateTicketCode(event.id);
    const qrPayload = `${event.id}:${ticketCode}`;
    const regId = uid();
    const ttRow = db.prepare(`SELECT * FROM event_ticket_types WHERE event_id = ? AND is_active = 1 ORDER BY price_paise ASC LIMIT 1`).get(event.id);
    const intentScore = computeIntentScore({}, 'FREE');

    let status = 'REGISTERED';
    if (freshEvent.capacity_reserved >= freshEvent.capacity_total) {
      status = 'WAITLISTED';
    } else {
      db.prepare('UPDATE events SET capacity_reserved = capacity_reserved + 1 WHERE id = ?').run(event.id);
    }

    db.prepare(`INSERT INTO event_registrations (id, event_id, full_name, phone_e164, email, ticket_type_id, ticket_code, qr_payload, status, source, meta_lead_id, meta_form_id, meta_ad_id, meta_adset_id, meta_campaign_id, meta_raw_payload, intent_score, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'META', ?, ?, ?, ?, ?, ?, ?, '["EVENT_REGISTERED"]')`)
      .run(regId, event.id, payload.full_name || 'Meta Lead', phone, payload.email || null,
        ttRow?.id || null, ticketCode, qrPayload, status,
        payload.meta_lead_id || null, payload.form_id || null, payload.ad_id || null,
        payload.adset_id || null, payload.campaign_id || null, JSON.stringify(payload), intentScore);

    // Lead link + auto-lead
    const leadId = uid();
    db.prepare(`INSERT INTO leads (id, full_name, phone_e164, email, source, campaign_name, lead_source_type, event_registration_id, intent_score, tags, stage, meta_campaign_id, meta_ad_id, meta_form_id)
      VALUES (?, ?, ?, ?, 'EVENT', ?, 'META_LEAD_FORM', ?, ?, '["EVENT_REGISTERED"]', 'NEW', ?, ?, ?)`)
      .run(leadId, payload.full_name || 'Meta Lead', phone, payload.email || null, event.title,
        regId, intentScore, payload.campaign_id || null, payload.ad_id || null, payload.form_id || null);

    db.prepare(`INSERT INTO event_lead_links (id, event_id, registration_id, lead_id, conversion_status, intent_score) VALUES (?, ?, ?, ?, 'LEAD_CREATED', ?)`)
      .run(uid(), event.id, regId, leadId, intentScore);

    return { regId, ticketCode, isNew: true };
  });

  const result = metaTx();
  db.prepare(`UPDATE integration_webhook_logs SET status = 'PROCESSED', message = ? WHERE id = ?`)
    .run(`${result.isNew ? 'new' : 'merged'} reg: ${result.regId}`, logId);

  res.status(200).json({ ok: true, registration_id: result.regId, ticket_code: result.ticketCode, is_new: result.isNew });
});

// GET /api/events/:id/meta-mappings — get meta mappings for event
router.get('/:id/meta-mappings', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM meta_event_mappings WHERE event_id = ? ORDER BY created_at DESC').all(req.params.id));
});

// POST /api/events/:id/meta-mappings — add meta mapping
router.post('/:id/meta-mappings', requireAuth, (req, res) => {
  const { meta_form_id, meta_campaign_id, meta_adset_id, meta_ad_id } = req.body;
  const id = uid();
  db.prepare(`INSERT INTO meta_event_mappings (id, event_id, meta_form_id, meta_campaign_id, meta_adset_id, meta_ad_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.id, meta_form_id || null, meta_campaign_id || null, meta_adset_id || null, meta_ad_id || null);
  res.json({ id, message: 'Mapping added' });
});

export default router;
