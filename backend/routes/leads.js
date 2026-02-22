import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Stage transition map — only these moves allowed (forward)
const VALID_TRANSITIONS = {
  NEW:               ['CONTACT_ATTEMPTED', 'DROPPED', 'LOST', 'DUPLICATE'],
  CONTACT_ATTEMPTED: ['CONNECTED', 'DROPPED', 'LOST', 'DUPLICATE'],
  CONNECTED:         ['QUALIFIED', 'DROPPED', 'LOST', 'DUPLICATE'],
  QUALIFIED:         ['DOCS_REQUESTED', 'DROPPED', 'LOST', 'DUPLICATE'],
  DOCS_REQUESTED:    ['DOCS_RECEIVED', 'DROPPED', 'LOST', 'DUPLICATE'],
  DOCS_RECEIVED:     ['CASE_CREATED', 'DROPPED', 'LOST', 'DUPLICATE'],
  CASE_CREATED:      [],
  DROPPED:           [],
  LOST:              [],
  DUPLICATE:         [],
};

function genId(prefix) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM leads`).get().c;
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${String(count + 1).padStart(4, '0')}`;
}

function genSubId() {
  return `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function logTimeline(lead_id, type, staff_id, staff_name, note) {
  const id = genSubId();
  db.prepare(`INSERT INTO lead_notes (id, lead_id, staff_id, staff_name, note_text) VALUES (?, ?, ?, ?, ?)`).run(
    id, lead_id, staff_id || null, staff_name || 'System', `[${type}] ${note}`
  );
  db.prepare(`UPDATE leads SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(lead_id);
}

// ─── INTEGRATION WEBHOOKS (no auth — add API key / IP whitelist in production) ──

// POST /api/leads/integrations/meta
router.post('/integrations/meta', (req, res) => {
  const {
    phone_e164, full_name, email, city, country, course, intake,
    meta_campaign_id, meta_adset_id, meta_ad_id, meta_form_id,
    source_reference_id, lead_source_type = 'META_LEAD_FORM',
    utm_source, utm_campaign, utm_medium, loan_amount_paise,
  } = req.body;
  if (!phone_e164 || !full_name) return res.status(400).json({ error: 'phone_e164 and full_name required' });

  const existing = db.prepare('SELECT id FROM leads WHERE phone_e164 = ?').get(phone_e164);
  if (existing) {
    db.prepare(`
      UPDATE leads SET
        meta_campaign_id    = COALESCE(@meta_campaign_id, meta_campaign_id),
        meta_adset_id       = COALESCE(@meta_adset_id, meta_adset_id),
        meta_ad_id          = COALESCE(@meta_ad_id, meta_ad_id),
        meta_form_id        = COALESCE(@meta_form_id, meta_form_id),
        source_reference_id = COALESCE(@source_reference_id, source_reference_id),
        lead_source_type    = @lead_source_type,
        utm_source          = COALESCE(@utm_source, utm_source),
        utm_campaign        = COALESCE(@utm_campaign, utm_campaign),
        utm_medium          = COALESCE(@utm_medium, utm_medium),
        updated_at          = datetime('now')
      WHERE id = @id
    `).run({ id: existing.id, meta_campaign_id: meta_campaign_id || null, meta_adset_id: meta_adset_id || null, meta_ad_id: meta_ad_id || null, meta_form_id: meta_form_id || null, source_reference_id: source_reference_id || null, lead_source_type, utm_source: utm_source || null, utm_campaign: utm_campaign || null, utm_medium: utm_medium || null });
    return res.json({ id: existing.id, action: 'updated', existing: true });
  }

  const id = genId('LEAD');
  db.prepare(`
    INSERT INTO leads (id, full_name, phone_e164, email, city, country, course, intake, source, lead_source_type, meta_campaign_id, meta_adset_id, meta_ad_id, meta_form_id, source_reference_id, utm_source, utm_campaign, utm_medium, loan_amount_paise, stage, last_activity_at)
    VALUES (@id, @full_name, @phone_e164, @email, @city, @country, @course, @intake, 'META', @lead_source_type, @meta_campaign_id, @meta_adset_id, @meta_ad_id, @meta_form_id, @source_reference_id, @utm_source, @utm_campaign, @utm_medium, @loan_amount_paise, 'NEW', datetime('now'))
  `).run({ id, full_name, phone_e164, email: email || null, city: city || null, country: country || null, course: course || null, intake: intake || null, lead_source_type, meta_campaign_id: meta_campaign_id || null, meta_adset_id: meta_adset_id || null, meta_ad_id: meta_ad_id || null, meta_form_id: meta_form_id || null, source_reference_id: source_reference_id || null, utm_source: utm_source || null, utm_campaign: utm_campaign || null, utm_medium: utm_medium || null, loan_amount_paise: loan_amount_paise || null });

  logTimeline(id, 'CREATED', null, 'Meta Integration', `Lead captured via Meta (${lead_source_type})`);
  res.status(201).json({ id, action: 'created' });
});

// POST /api/leads/integrations/admission-crm
router.post('/integrations/admission-crm', (req, res) => {
  const { phone_e164, full_name, email, city, country, course, intake, admission_case_id, loan_amount_paise } = req.body;
  if (!phone_e164 || !full_name) return res.status(400).json({ error: 'phone_e164 and full_name required' });

  const existing = db.prepare('SELECT id FROM leads WHERE phone_e164 = ?').get(phone_e164);
  if (existing) {
    db.prepare(`UPDATE leads SET admission_case_id = COALESCE(?, admission_case_id), admission_sync_status = 'SYNCED', lead_source_type = 'ADMISSION_CRM', updated_at = datetime('now') WHERE id = ?`).run(admission_case_id || null, existing.id);
    return res.json({ id: existing.id, action: 'updated', existing: true });
  }

  const id = genId('LEAD');
  db.prepare(`
    INSERT INTO leads (id, full_name, phone_e164, email, city, country, course, intake, source, lead_source_type, admission_case_id, admission_sync_status, loan_amount_paise, stage, last_activity_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ADMISSION_CRM', 'ADMISSION_CRM', ?, 'SYNCED', ?, 'NEW', datetime('now'))
  `).run(id, full_name, phone_e164, email || null, city || null, country || null, course || null, intake || null, admission_case_id || null, loan_amount_paise || null);
  logTimeline(id, 'CREATED', null, 'Admission CRM', `Lead synced from Admission CRM`);
  res.status(201).json({ id, action: 'created' });
});

// ─── AUTH middleware (all routes below require auth) ──────────────────────────
router.use(requireAuth);

// ─── GET /api/leads/stats ────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const stages = ['NEW', 'CONTACT_ATTEMPTED', 'CONNECTED', 'QUALIFIED', 'DOCS_REQUESTED', 'DOCS_RECEIVED', 'CASE_CREATED', 'DROPPED', 'LOST', 'DUPLICATE'];
  const counts = {};
  for (const s of stages) {
    counts[s] = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE stage = ?`).get(s).c;
  }
  const newToday  = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE stage = 'NEW' AND date(created_at) = ?`).get(today).c;
  const overdue   = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE next_followup_at IS NOT NULL AND next_followup_at < datetime('now') AND stage NOT IN ('CASE_CREATED','DROPPED','LOST','DUPLICATE')`).get().c;
  const highValue = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE loan_amount_paise >= 3000000 AND stage NOT IN ('CASE_CREATED','DROPPED','LOST','DUPLICATE')`).get().c;
  res.json({ counts, newToday, overdue, highValue, total: db.prepare('SELECT COUNT(*) as c FROM leads').get().c });
});

// ─── GET /api/leads/analytics ────────────────────────────────────────────────
router.get('/analytics', (req, res) => {
  const total       = db.prepare(`SELECT COUNT(*) as c FROM leads`).get().c || 1;
  const connected   = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE stage NOT IN ('NEW','DROPPED','LOST','DUPLICATE')`).get().c;
  const qualified   = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE stage IN ('QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED')`).get().c;
  const docsRcvd    = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE stage IN ('DOCS_RECEIVED','CASE_CREATED')`).get().c;
  const caseCreated = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE stage = 'CASE_CREATED'`).get().c;

  const funnel = [
    { label: 'Total Leads',   count: total,       pct: 100 },
    { label: 'Connected',     count: connected,   pct: Math.round((connected   / total) * 100) },
    { label: 'Qualified',     count: qualified,   pct: Math.round((qualified   / total) * 100) },
    { label: 'Docs Received', count: docsRcvd,    pct: Math.round((docsRcvd    / total) * 100) },
    { label: 'Case Created',  count: caseCreated, pct: Math.round((caseCreated / total) * 100) },
  ];

  const staffRows = db.prepare(`
    SELECT u.id, u.name,
      COUNT(l.id) as leads,
      SUM(CASE WHEN l.stage NOT IN ('NEW','DROPPED','LOST','DUPLICATE') THEN 1 ELSE 0 END) as connected_count,
      SUM(CASE WHEN l.stage IN ('QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED') THEN 1 ELSE 0 END) as qualified_count,
      SUM(CASE WHEN l.stage = 'CASE_CREATED' THEN 1 ELSE 0 END) as case_count
    FROM users u
    LEFT JOIN leads l ON l.assigned_staff_id = u.id
    WHERE u.role = 'super_admin' OR u.role = 'staff'
    GROUP BY u.id ORDER BY leads DESC LIMIT 20
  `).all();

  const staff = staffRows.map(r => ({
    id: r.id, name: r.name, leads: r.leads,
    connected_pct: r.leads > 0 ? Math.round((r.connected_count / r.leads) * 100) : 0,
    qualified_pct: r.leads > 0 ? Math.round((r.qualified_count / r.leads) * 100) : 0,
    case_pct:      r.leads > 0 ? Math.round((r.case_count      / r.leads) * 100) : 0,
  }));

  res.json({ funnel, staff });
});

// ─── GET /api/leads/queues ───────────────────────────────────────────────────
router.get('/queues', (req, res) => {
  const userId = req.user.id;
  const DONE   = `('CASE_CREATED','DROPPED','LOST','DUPLICATE')`;

  const myLeadsToday = db.prepare(`
    SELECT l.*, u.name as assigned_staff_name FROM leads l
    LEFT JOIN users u ON u.id = l.assigned_staff_id
    WHERE l.assigned_staff_id = ? AND l.stage NOT IN ${DONE}
    ORDER BY CASE l.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 ELSE 2 END, l.created_at ASC
    LIMIT 50
  `).all(userId);

  const followupDue = db.prepare(`
    SELECT l.*, u.name as assigned_staff_name FROM leads l
    LEFT JOIN users u ON u.id = l.assigned_staff_id
    WHERE l.next_followup_at <= datetime('now') AND l.stage NOT IN ${DONE}
    ORDER BY l.next_followup_at ASC LIMIT 50
  `).all();

  const overdue = db.prepare(`
    SELECT l.*, u.name as assigned_staff_name FROM leads l
    LEFT JOIN users u ON u.id = l.assigned_staff_id
    WHERE l.next_followup_at < datetime('now', '-30 minutes') AND l.stage NOT IN ${DONE}
    ORDER BY l.next_followup_at ASC LIMIT 50
  `).all();

  const highValue = db.prepare(`
    SELECT l.*, u.name as assigned_staff_name FROM leads l
    LEFT JOIN users u ON u.id = l.assigned_staff_id
    WHERE l.loan_amount_paise >= 3000000 AND l.stage NOT IN ${DONE}
    ORDER BY l.loan_amount_paise DESC LIMIT 50
  `).all();

  res.json({ myLeadsToday, followupDue, overdue, highValue });
});

// ─── GET /api/leads/campaign-analytics ────────────────────────────────────────
router.get('/campaign-analytics', (req, res) => {
  const rows = db.prepare(`
    SELECT
      COALESCE(meta_campaign_id, campaign_name, 'Unknown') as campaign_id,
      campaign_name,
      lead_source_type,
      COUNT(*) as total,
      SUM(CASE WHEN stage NOT IN ('NEW','DROPPED','LOST','DUPLICATE') THEN 1 ELSE 0 END) as connected,
      SUM(CASE WHEN stage IN ('QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED') THEN 1 ELSE 0 END) as qualified,
      SUM(CASE WHEN stage = 'CASE_CREATED' THEN 1 ELSE 0 END) as cases,
      ROUND(AVG(NULLIF(intent_score, 0)), 1) as avg_score
    FROM leads
    WHERE meta_campaign_id IS NOT NULL OR campaign_name IS NOT NULL
    GROUP BY COALESCE(meta_campaign_id, campaign_name)
    ORDER BY total DESC
    LIMIT 50
  `).all();
  res.json(rows);
});

// ─── GET /api/leads ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const {
    search, stage, source, source_type, country, assigned_staff_id,
    priority, date_from, date_to, campaign_id,
    loan_min, loan_max, has_event, has_admission, overdue,
    page = 1, limit = 50,
  } = req.query;

  const where = [];
  const params = {};

  if (search)              { where.push(`(l.full_name LIKE @search OR l.phone_e164 LIKE @search OR l.email LIKE @search)`); params.search = `%${search}%`; }
  if (stage)               { where.push('l.stage = @stage');                          params.stage = stage; }
  if (source)              { where.push('l.source = @source');                        params.source = source; }
  if (source_type)         { where.push('l.lead_source_type = @source_type');         params.source_type = source_type; }
  if (country)             { where.push('l.country = @country');                      params.country = country; }
  if (assigned_staff_id)   { where.push('l.assigned_staff_id = @assigned_staff_id'); params.assigned_staff_id = assigned_staff_id; }
  if (priority)            { where.push('l.priority = @priority');                   params.priority = priority; }
  if (date_from)           { where.push('date(l.created_at) >= @date_from');         params.date_from = date_from; }
  if (date_to)             { where.push('date(l.created_at) <= @date_to');           params.date_to = date_to; }
  if (campaign_id)         { where.push('(l.meta_campaign_id = @campaign_id OR l.campaign_name = @campaign_id)'); params.campaign_id = campaign_id; }
  if (loan_min)            { where.push('l.loan_amount_paise >= @loan_min');         params.loan_min = Number(loan_min); }
  if (loan_max)            { where.push('l.loan_amount_paise <= @loan_max');         params.loan_max = Number(loan_max); }
  if (has_event === '1')   { where.push('l.event_registration_id IS NOT NULL'); }
  if (has_admission === '1') { where.push('l.admission_case_id IS NOT NULL'); }
  if (overdue === '1')     { where.push(`l.next_followup_at < datetime('now') AND l.stage NOT IN ('CASE_CREATED','DROPPED','LOST','DUPLICATE')`); }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset   = (Number(page) - 1) * Number(limit);

  const total = db.prepare(`SELECT COUNT(*) as c FROM leads l ${whereSQL}`).get(params).c;
  const rows  = db.prepare(`
    SELECT l.*, u.name as assigned_staff_name
    FROM leads l
    LEFT JOIN users u ON u.id = l.assigned_staff_id
    ${whereSQL}
    ORDER BY l.created_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `).all(params);

  res.json({ data: rows, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// ─── GET /api/leads/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const lead = db.prepare(`
    SELECT l.*, u.name as assigned_staff_name
    FROM leads l
    LEFT JOIN users u ON u.id = l.assigned_staff_id
    WHERE l.id = ?
  `).get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const qualification = db.prepare(`SELECT * FROM lead_qualification WHERE lead_id = ?`).get(req.params.id);
  const notes         = db.prepare(`SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at ASC`).all(req.params.id);
  const calls         = db.prepare(`SELECT * FROM lead_calls WHERE lead_id = ? ORDER BY created_at ASC`).all(req.params.id);
  const followups     = db.prepare(`SELECT * FROM lead_followups WHERE lead_id = ? ORDER BY scheduled_at ASC`).all(req.params.id);
  const mapping       = db.prepare(`SELECT * FROM lead_to_case_mapping WHERE lead_id = ?`).get(req.params.id);

  const timeline = [
    ...notes.map(n => ({ ...n, type: n.note_text.startsWith('[') ? n.note_text.split(']')[0].slice(1) : 'NOTE' })),
    ...calls.map(c => ({ ...c, type: 'CALL', note_text: `Call ${c.call_status}${c.duration_seconds ? ` (${c.duration_seconds}s)` : ''}${c.notes ? ' — ' + c.notes : ''}` })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  res.json({ lead, qualification, timeline, followups, mapping });
});

// ─── POST /api/leads ─────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const {
    full_name, phone_e164, email, city,
    source = 'MANUAL', lead_source_type = 'MANUAL_ENTRY',
    campaign_name, ad_id,
    meta_campaign_id, meta_adset_id, meta_ad_id, meta_form_id,
    utm_source, utm_campaign, utm_medium,
    country, course, intake, loan_amount_paise,
    assigned_staff_id, priority = 'NORMAL',
    intent_score = 50, tags, assignment_mode = 'MANUAL',
  } = req.body;

  if (!full_name || !phone_e164) {
    return res.status(400).json({ error: 'full_name and phone_e164 are required' });
  }

  const existing = db.prepare(`SELECT id, full_name FROM leads WHERE phone_e164 = ?`).get(phone_e164);
  if (existing) {
    return res.status(409).json({ error: `Duplicate: phone already exists for lead "${existing.full_name}" (${existing.id})`, existing_id: existing.id });
  }

  const id = genId('LEAD');
  db.prepare(`
    INSERT INTO leads (id, full_name, phone_e164, email, city, source, lead_source_type, campaign_name, ad_id, meta_campaign_id, meta_adset_id, meta_ad_id, meta_form_id, utm_source, utm_campaign, utm_medium, country, course, intake, loan_amount_paise, assigned_staff_id, stage, priority, intent_score, tags, assignment_mode, assigned_at, last_activity_at)
    VALUES (@id, @full_name, @phone_e164, @email, @city, @source, @lead_source_type, @campaign_name, @ad_id, @meta_campaign_id, @meta_adset_id, @meta_ad_id, @meta_form_id, @utm_source, @utm_campaign, @utm_medium, @country, @course, @intake, @loan_amount_paise, @assigned_staff_id, 'NEW', @priority, @intent_score, @tags, @assignment_mode, @assigned_at, datetime('now'))
  `).run({
    id, full_name, phone_e164, email: email || null, city: city || null,
    source, lead_source_type,
    campaign_name: campaign_name || null, ad_id: ad_id || null,
    meta_campaign_id: meta_campaign_id || null, meta_adset_id: meta_adset_id || null,
    meta_ad_id: meta_ad_id || null, meta_form_id: meta_form_id || null,
    utm_source: utm_source || null, utm_campaign: utm_campaign || null, utm_medium: utm_medium || null,
    country: country || null, course: course || null, intake: intake || null,
    loan_amount_paise: loan_amount_paise || null,
    assigned_staff_id: assigned_staff_id || null,
    priority, intent_score: Number(intent_score) || 50,
    tags: tags ? JSON.stringify(tags) : '[]',
    assignment_mode,
    assigned_at: assigned_staff_id ? new Date().toISOString() : null,
  });

  logTimeline(id, 'CREATED', req.user.id, req.user.name, 'Lead created');

  const lead = db.prepare(`SELECT l.*, u.name as assigned_staff_name FROM leads l LEFT JOIN users u ON u.id = l.assigned_staff_id WHERE l.id = ?`).get(id);
  res.status(201).json(lead);
});

// ─── POST /api/leads/merge ────────────────────────────────────────────────────
router.post('/merge', (req, res) => {
  const { primary_id, duplicate_id, reason } = req.body;
  if (!primary_id || !duplicate_id) return res.status(400).json({ error: 'primary_id and duplicate_id required' });

  const primary   = db.prepare('SELECT * FROM leads WHERE id = ?').get(primary_id);
  const duplicate = db.prepare('SELECT * FROM leads WHERE id = ?').get(duplicate_id);
  if (!primary)   return res.status(404).json({ error: 'Primary lead not found' });
  if (!duplicate) return res.status(404).json({ error: 'Duplicate lead not found' });

  db.prepare(`UPDATE lead_notes     SET lead_id = ? WHERE lead_id = ?`).run(primary_id, duplicate_id);
  db.prepare(`UPDATE lead_calls     SET lead_id = ? WHERE lead_id = ?`).run(primary_id, duplicate_id);
  db.prepare(`UPDATE lead_followups SET lead_id = ? WHERE lead_id = ?`).run(primary_id, duplicate_id);

  db.prepare(`UPDATE leads SET stage = 'DUPLICATE', is_locked = 1, updated_at = datetime('now') WHERE id = ?`).run(duplicate_id);
  logTimeline(primary_id, 'MERGE', req.user.id, req.user.name, `Merged with duplicate lead ${duplicate_id}. Reason: ${reason || 'Not specified'}`);

  const updated = db.prepare(`SELECT l.*, u.name as assigned_staff_name FROM leads l LEFT JOIN users u ON u.id = l.assigned_staff_id WHERE l.id = ?`).get(primary_id);
  res.json({ success: true, primary: updated });
});

// ─── PATCH /api/leads/:id ────────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  if (lead.is_locked && req.body.stage && req.body.stage !== lead.stage) {
    return res.status(403).json({ error: 'Lead is locked (case already created). Cannot change stage.' });
  }

  const {
    stage, priority, assigned_staff_id, full_name, phone_e164, email, city,
    country, course, intake, loan_amount_paise, source, campaign_name,
    intent_score, tags, lead_source_type, meta_campaign_id, meta_adset_id,
    meta_ad_id, meta_form_id, utm_source, utm_campaign, utm_medium,
    admission_case_id, admission_sync_status, event_registration_id,
    source_reference_id, assignment_mode,
  } = req.body;

  if (stage && stage !== lead.stage) {
    const allowed = VALID_TRANSITIONS[lead.stage] || [];
    if (!allowed.includes(stage)) {
      return res.status(400).json({ error: `Invalid transition: ${lead.stage} → ${stage}. Allowed: ${allowed.join(', ') || 'none'}` });
    }
  }

  const sets = [];
  const params = {};

  if (stage                !== undefined) { sets.push('stage = @stage');                                   params.stage = stage; }
  if (priority             !== undefined) { sets.push('priority = @priority');                             params.priority = priority; }
  if (assigned_staff_id    !== undefined) { sets.push('assigned_staff_id = @assigned_staff_id');           params.assigned_staff_id = assigned_staff_id; }
  if (full_name            !== undefined) { sets.push('full_name = @full_name');                           params.full_name = full_name; }
  if (phone_e164           !== undefined) { sets.push('phone_e164 = @phone_e164');                         params.phone_e164 = phone_e164; }
  if (email                !== undefined) { sets.push('email = @email');                                   params.email = email; }
  if (city                 !== undefined) { sets.push('city = @city');                                     params.city = city; }
  if (country              !== undefined) { sets.push('country = @country');                               params.country = country; }
  if (course               !== undefined) { sets.push('course = @course');                                 params.course = course; }
  if (intake               !== undefined) { sets.push('intake = @intake');                                 params.intake = intake; }
  if (loan_amount_paise    !== undefined) { sets.push('loan_amount_paise = @loan_amount_paise');           params.loan_amount_paise = loan_amount_paise; }
  if (source               !== undefined) { sets.push('source = @source');                                 params.source = source; }
  if (campaign_name        !== undefined) { sets.push('campaign_name = @campaign_name');                   params.campaign_name = campaign_name; }
  if (intent_score         !== undefined) { sets.push('intent_score = @intent_score');                     params.intent_score = Number(intent_score); }
  if (tags                 !== undefined) { sets.push('tags = @tags');                                     params.tags = typeof tags === 'string' ? tags : JSON.stringify(tags); }
  if (lead_source_type     !== undefined) { sets.push('lead_source_type = @lead_source_type');             params.lead_source_type = lead_source_type; }
  if (meta_campaign_id     !== undefined) { sets.push('meta_campaign_id = @meta_campaign_id');             params.meta_campaign_id = meta_campaign_id; }
  if (meta_adset_id        !== undefined) { sets.push('meta_adset_id = @meta_adset_id');                   params.meta_adset_id = meta_adset_id; }
  if (meta_ad_id           !== undefined) { sets.push('meta_ad_id = @meta_ad_id');                         params.meta_ad_id = meta_ad_id; }
  if (meta_form_id         !== undefined) { sets.push('meta_form_id = @meta_form_id');                     params.meta_form_id = meta_form_id; }
  if (utm_source           !== undefined) { sets.push('utm_source = @utm_source');                         params.utm_source = utm_source; }
  if (utm_campaign         !== undefined) { sets.push('utm_campaign = @utm_campaign');                     params.utm_campaign = utm_campaign; }
  if (utm_medium           !== undefined) { sets.push('utm_medium = @utm_medium');                         params.utm_medium = utm_medium; }
  if (admission_case_id    !== undefined) { sets.push('admission_case_id = @admission_case_id');           params.admission_case_id = admission_case_id; }
  if (admission_sync_status!== undefined) { sets.push('admission_sync_status = @admission_sync_status');   params.admission_sync_status = admission_sync_status; }
  if (event_registration_id!== undefined) { sets.push('event_registration_id = @event_registration_id');   params.event_registration_id = event_registration_id; }
  if (source_reference_id  !== undefined) { sets.push('source_reference_id = @source_reference_id');       params.source_reference_id = source_reference_id; }
  if (assignment_mode      !== undefined) { sets.push('assignment_mode = @assignment_mode');               params.assignment_mode = assignment_mode; }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  sets.push(`updated_at = datetime('now')`);
  sets.push(`last_activity_at = datetime('now')`);
  params.id = req.params.id;

  db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = @id`).run(params);

  if (stage && stage !== lead.stage) {
    logTimeline(req.params.id, 'STAGE_CHANGE', req.user.id, req.user.name, `Stage changed from ${lead.stage} to ${stage}`);
  }

  const updated = db.prepare(`SELECT l.*, u.name as assigned_staff_name FROM leads l LEFT JOIN users u ON u.id = l.assigned_staff_id WHERE l.id = ?`).get(req.params.id);
  res.json(updated);
});

// ─── POST /api/leads/:id/qualification ──────────────────────────────────────
router.post('/:id/qualification', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { admission_received, university, country, course, loan_amount_paise, coapp_income_paise, collateral_available, cibil_known, visa_urgency } = req.body;

  const existing = db.prepare('SELECT id FROM lead_qualification WHERE lead_id = ?').get(req.params.id);
  if (existing) {
    db.prepare(`
      UPDATE lead_qualification SET
        admission_received = @admission_received, university = @university, country = @country,
        course = @course, loan_amount_paise = @loan_amount_paise, coapp_income_paise = @coapp_income_paise,
        collateral_available = @collateral_available, cibil_known = @cibil_known, visa_urgency = @visa_urgency,
        updated_at = datetime('now')
      WHERE lead_id = @lead_id
    `).run({ lead_id: req.params.id, admission_received: admission_received ? 1 : 0, university: university || null, country: country || null, course: course || null, loan_amount_paise: loan_amount_paise || null, coapp_income_paise: coapp_income_paise || null, collateral_available: collateral_available ? 1 : 0, cibil_known: cibil_known ? 1 : 0, visa_urgency: visa_urgency || 'NORMAL' });
  } else {
    const id = genSubId();
    db.prepare(`
      INSERT INTO lead_qualification (id, lead_id, admission_received, university, country, course, loan_amount_paise, coapp_income_paise, collateral_available, cibil_known, visa_urgency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, admission_received ? 1 : 0, university || null, country || null, course || null, loan_amount_paise || null, coapp_income_paise || null, collateral_available ? 1 : 0, cibil_known ? 1 : 0, visa_urgency || 'NORMAL');
  }

  logTimeline(req.params.id, 'QUALIFICATION', req.user.id, req.user.name, 'Qualification panel updated');

  const qual = db.prepare('SELECT * FROM lead_qualification WHERE lead_id = ?').get(req.params.id);
  res.json(qual);
});

// ─── POST /api/leads/:id/mark-qualified ─────────────────────────────────────
router.post('/:id/mark-qualified', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const allowed = VALID_TRANSITIONS[lead.stage] || [];
  if (!allowed.includes('QUALIFIED')) {
    return res.status(400).json({ error: `Cannot mark as QUALIFIED from stage ${lead.stage}` });
  }

  db.prepare(`UPDATE leads SET stage = 'QUALIFIED', updated_at = datetime('now'), last_activity_at = datetime('now') WHERE id = ?`).run(req.params.id);
  logTimeline(req.params.id, 'QUALIFIED', req.user.id, req.user.name, 'Lead marked as QUALIFIED');

  const updated = db.prepare(`SELECT l.*, u.name as assigned_staff_name FROM leads l LEFT JOIN users u ON u.id = l.assigned_staff_id WHERE l.id = ?`).get(req.params.id);
  res.json(updated);
});

// ─── POST /api/leads/:id/note ────────────────────────────────────────────────
router.post('/:id/note', (req, res) => {
  const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { note_text } = req.body;
  if (!note_text) return res.status(400).json({ error: 'note_text is required' });

  const id = genSubId();
  db.prepare(`INSERT INTO lead_notes (id, lead_id, staff_id, staff_name, note_text) VALUES (?, ?, ?, ?, ?)`).run(id, req.params.id, req.user.id, req.user.name, note_text);
  db.prepare(`UPDATE leads SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(req.params.id);

  const note = db.prepare('SELECT * FROM lead_notes WHERE id = ?').get(id);
  res.status(201).json(note);
});

// ─── POST /api/leads/:id/call-log ────────────────────────────────────────────
router.post('/:id/call-log', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { call_status = 'ATTEMPTED', duration_seconds, notes } = req.body;
  const id = genSubId();

  db.prepare(`INSERT INTO lead_calls (id, lead_id, staff_id, staff_name, call_status, duration_seconds, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, req.params.id, req.user.id, req.user.name, call_status, duration_seconds || null, notes || null);

  let newStage = lead.stage;
  if (call_status === 'CONNECTED' && lead.stage === 'NEW') {
    db.prepare(`UPDATE leads SET stage = 'CONTACT_ATTEMPTED', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
    newStage = 'CONTACT_ATTEMPTED';
  }

  logTimeline(req.params.id, 'CALL', req.user.id, req.user.name, `Call logged: ${call_status}${duration_seconds ? ` (${duration_seconds}s)` : ''}${notes ? ' — ' + notes : ''}`);

  const call        = db.prepare('SELECT * FROM lead_calls WHERE id = ?').get(id);
  const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.status(201).json({ call, lead: updatedLead, stage_changed: newStage !== lead.stage });
});

// ─── POST /api/leads/:id/followup ───────────────────────────────────────────
router.post('/:id/followup', (req, res) => {
  const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const { type = 'CALL', scheduled_at, note } = req.body;
  if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at is required' });

  const id = genSubId();
  db.prepare(`INSERT INTO lead_followups (id, lead_id, staff_id, type, scheduled_at, note, status) VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED')`).run(id, req.params.id, req.user.id, type, scheduled_at, note || null);
  db.prepare(`UPDATE leads SET next_followup_at = ?, updated_at = datetime('now') WHERE id = ?`).run(scheduled_at, req.params.id);

  logTimeline(req.params.id, 'FOLLOWUP', req.user.id, req.user.name, `Follow-up set: ${type} at ${scheduled_at}`);

  const followup = db.prepare('SELECT * FROM lead_followups WHERE id = ?').get(id);
  res.status(201).json(followup);
});

// ─── POST /api/leads/:id/followup/:fid/complete ─────────────────────────────
router.post('/:id/followup/:fid/complete', (req, res) => {
  const f = db.prepare('SELECT * FROM lead_followups WHERE id = ? AND lead_id = ?').get(req.params.fid, req.params.id);
  if (!f) return res.status(404).json({ error: 'Follow-up not found' });

  db.prepare(`UPDATE lead_followups SET status = 'COMPLETED' WHERE id = ?`).run(req.params.fid);
  logTimeline(req.params.id, 'FOLLOWUP_DONE', req.user.id, req.user.name, `Follow-up completed: ${f.type}`);

  res.json({ success: true });
});

// ─── POST /api/leads/:id/convert ────────────────────────────────────────────
router.post('/:id/convert', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  if (!['QUALIFIED', 'DOCS_RECEIVED'].includes(lead.stage)) {
    return res.status(400).json({ error: `Lead must be in QUALIFIED or DOCS_RECEIVED stage to convert. Current: ${lead.stage}` });
  }

  const { branch_id, case_owner_id, student_phone, student_email } = req.body;

  const caseCount = db.prepare('SELECT COUNT(*) as c FROM applications').get().c;
  const case_id   = `NX-2026-${String(1000 + caseCount).padStart(4, '0')}`;

  db.prepare(`
    INSERT INTO applications (id, student_name, student_email, student_phone, bank, university, course, country, intake, loan_amount_requested, status, sub_status, awaiting_from, priority, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NOT_CONNECTED', '-', 'Nexthara', ?, ?)
  `).run(
    case_id,
    lead.full_name,
    student_email || lead.email || '',
    student_phone || lead.phone_e164 || '',
    branch_id || 'TBD',
    lead.course || 'TBD',
    lead.course || 'TBD',
    lead.country || null,
    lead.intake  || null,
    lead.loan_amount_paise ? lead.loan_amount_paise / 100 : null,
    lead.priority === 'URGENT' ? 'Urgent' : lead.priority === 'HIGH' ? 'High' : 'Normal',
    case_owner_id ? String(case_owner_id) : null
  );

  db.prepare(`INSERT INTO status_history (application_id, status, sub_status, awaiting_from, changed_by, notes) VALUES (?, 'NOT_CONNECTED', '-', 'Nexthara', 'System', ?)`).run(case_id, `Created from Lead ${lead.id}`);

  db.prepare(`UPDATE leads SET stage = 'CASE_CREATED', is_locked = 1, updated_at = datetime('now'), last_activity_at = datetime('now') WHERE id = ?`).run(lead.id);

  const mapId = genSubId();
  db.prepare(`INSERT INTO lead_to_case_mapping (id, lead_id, case_id, converted_by_staff_id, converted_by_staff_name) VALUES (?, ?, ?, ?, ?)`).run(mapId, lead.id, case_id, req.user.id, req.user.name);

  logTimeline(lead.id, 'CASE_CREATED', req.user.id, req.user.name, `Converted to Loan Case ${case_id}`);

  res.json({ case_id, status: 'CASE_CREATED' });
});

// ─── POST /api/leads/:id/drop ────────────────────────────────────────────────
router.post('/:id/drop', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (lead.stage === 'CASE_CREATED') return res.status(400).json({ error: 'Cannot drop a converted lead' });

  const { reason, stage: dropStage = 'DROPPED' } = req.body;
  const finalStage = ['DROPPED', 'LOST', 'DUPLICATE'].includes(dropStage) ? dropStage : 'DROPPED';

  db.prepare(`UPDATE leads SET stage = ?, updated_at = datetime('now'), last_activity_at = datetime('now') WHERE id = ?`).run(finalStage, lead.id);
  logTimeline(lead.id, 'DROPPED', req.user.id, req.user.name, `Lead marked as ${finalStage}. Reason: ${reason || 'Not specified'}`);

  res.json({ success: true });
});

export default router;
