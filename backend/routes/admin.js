import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(requireAuth);
router.use(requireSuperAdmin);

// helper: safe query
function safeQ(fn, fallback = []) { try { return fn(); } catch(e) { console.warn('Admin query warn:', e.message); return fallback; } }

// ─── MASTER DASHBOARD ─────────────────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // KPI Strip
    const newLeads = safeQ(() => db.prepare(`SELECT COUNT(*) as c FROM leads WHERE created_at >= datetime('now','-${days} days')`).get().c, 0);
    const totalLeads = safeQ(() => db.prepare(`SELECT COUNT(*) as c FROM leads WHERE created_at >= datetime('now','-${days} days')`).get().c, 0);
    const connectedLeads = safeQ(() => db.prepare(`SELECT COUNT(*) as c FROM leads WHERE stage IN ('CONNECTED','QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED') AND created_at >= datetime('now','-${days} days')`).get().c, 0);
    const casesCreated = safeQ(() => db.prepare(`SELECT COUNT(*) as c FROM applications WHERE created_at >= datetime('now','-${days} days')`).get().c, 0);
    const totalApps = safeQ(() => db.prepare(`SELECT COUNT(*) as c FROM applications`).get().c, 0);
    const sanctioned = safeQ(() => db.prepare(`SELECT COUNT(*) as c FROM applications WHERE status IN ('SANCTIONED','DISBURSED')`).get().c, 0);
    const slaBreaches = safeQ(() => db.prepare(`SELECT COUNT(*) as c FROM bank_applications WHERE sla_due_at < datetime('now') AND status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED')`).get().c, 0);
    const commsFailed = safeQ(() => db.prepare(`SELECT COUNT(*) as c FROM message_log WHERE delivery_status='FAILED'`).get().c, 0);

    const kpis = {
      new_leads: newLeads,
      connected_pct: totalLeads > 0 ? Math.round(connectedLeads * 100 / totalLeads) : 0,
      cases_created: casesCreated,
      sanction_pct: totalApps > 0 ? Math.round(sanctioned * 100 / totalApps) : 0,
      sla_breaches: slaBreaches,
      comms_failed: commsFailed,
    };

    // Live Queue 1: Overdue Follow-ups
    const overdueFollowups = safeQ(() => db.prepare(`
      SELECT l.id, l.full_name as lead_name, lf.scheduled_at as overdue_at,
        CAST((julianday('now') - julianday(lf.scheduled_at)) * 24 AS INTEGER) as hours_overdue
      FROM lead_followups lf
      JOIN leads l ON lf.lead_id = l.id
      WHERE lf.scheduled_at < datetime('now') AND lf.status = 'PENDING'
      ORDER BY lf.scheduled_at ASC LIMIT 10
    `).all());

    // Live Queue 2: Docs Pending > 48h
    const docsPending = safeQ(() => db.prepare(`
      SELECT a.id, a.student_name, a.updated_at,
        CAST((julianday('now') - julianday(a.updated_at)) * 24 AS INTEGER) as hours_pending,
        COUNT(CASE WHEN d.status='Missing' THEN 1 END) as missing_docs
      FROM applications a
      JOIN documents d ON d.application_id = a.id
      WHERE a.status NOT IN ('DISBURSED','REJECTED','CLOSED')
        AND (julianday('now') - julianday(a.updated_at)) * 24 > 48
      GROUP BY a.id HAVING missing_docs > 0
      ORDER BY hours_pending DESC LIMIT 10
    `).all());

    // Live Queue 3: Bank SLA Risk
    const slaRisk = safeQ(() => db.prepare(`
      SELECT ba.id, b.name as bank_name, ba.status, ba.sla_due_at,
        CAST((julianday(ba.sla_due_at) - julianday('now')) * 24 AS INTEGER) as hours_left
      FROM bank_applications ba
      JOIN banks b ON ba.bank_id = b.id
      WHERE ba.sla_due_at IS NOT NULL
        AND ba.status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED')
      ORDER BY ba.sla_due_at ASC LIMIT 10
    `).all());

    // Live Queue 4: Message Failures
    const msgFailures = safeQ(() => db.prepare(`
      SELECT id, audience as entity_type, to_address as recipient, template_name as template, delivery_status as status, created_at
      FROM message_log WHERE delivery_status='FAILED' ORDER BY created_at DESC LIMIT 10
    `).all());

    // Bank Performance Snapshot
    const bankPerf = safeQ(() => db.prepare(`
      SELECT b.name as bank_name, b.id as bank_id,
        COUNT(ba.id) as total_apps,
        COUNT(CASE WHEN ba.status='SANCTIONED' THEN 1 END) as sanctioned,
        COUNT(CASE WHEN ba.status='REJECTED' THEN 1 END) as rejected,
        COUNT(CASE WHEN ba.sla_due_at < datetime('now') AND ba.status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED') THEN 1 END) as sla_breaches,
        ROUND(100.0*COUNT(CASE WHEN ba.status='SANCTIONED' THEN 1 END)/MAX(COUNT(ba.id),1),1) as sanction_pct
      FROM banks b
      LEFT JOIN bank_applications ba ON ba.bank_id = b.id
      GROUP BY b.id ORDER BY total_apps DESC LIMIT 10
    `).all());

    // Staff Performance Snapshot
    const staffPerf = safeQ(() => db.prepare(`
      SELECT u.id, u.name,
        COUNT(DISTINCT l.id) as leads_assigned,
        COUNT(DISTINCT CASE WHEN l.stage IN ('CONNECTED','QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED') THEN l.id END) as connected,
        COUNT(DISTINCT CASE WHEN l.stage IN ('QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED') THEN l.id END) as qualified,
        COUNT(DISTINCT a.id) as cases
      FROM users u
      LEFT JOIN leads l ON l.assigned_staff_id = CAST(u.id AS TEXT)
      LEFT JOIN applications a ON a.assigned_to = u.name
      WHERE u.is_active = 1
      GROUP BY u.id ORDER BY leads_assigned DESC LIMIT 10
    `).all());

    // Campaign / Source Mix
    const sourceMix = safeQ(() => db.prepare(`
      SELECT lead_source_type as source, COUNT(*) as leads
      FROM leads WHERE created_at >= datetime('now','-${days} days')
      GROUP BY lead_source_type ORDER BY leads DESC
    `).all());

    const topCampaigns = safeQ(() => db.prepare(`
      SELECT meta_campaign_id as campaign_id, utm_campaign as campaign_name,
        COUNT(*) as leads,
        COUNT(CASE WHEN stage='CASE_CREATED' THEN 1 END) as cases
      FROM leads
      WHERE meta_campaign_id IS NOT NULL AND created_at >= datetime('now','-${days} days')
      GROUP BY meta_campaign_id ORDER BY leads DESC LIMIT 5
    `).all());

    res.json({
      kpis,
      live_queues: { overdue_followups: overdueFollowups, docs_pending: docsPending, sla_risk: slaRisk, msg_failures: msgFailures },
      bank_performance: bankPerf,
      staff_performance: staffPerf,
      campaign_mix: { source_mix: sourceMix, top_campaigns: topCampaigns },
    });
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ─── AUTOMATION RULES ─────────────────────────────────────────────────────────
router.get('/automation-rules', (req, res) => {
  const rules = db.prepare('SELECT * FROM automation_rules ORDER BY scope, priority').all();
  res.json(rules.map(r => ({ ...r, conditions: safeQ(() => JSON.parse(r.conditions), {}), actions: safeQ(() => JSON.parse(r.actions), []) })));
});

router.post('/automation-rules', (req, res) => {
  const { name, scope, trigger_type, conditions = {}, actions = [], priority = 0 } = req.body;
  if (!name || !scope || !trigger_type) return res.status(400).json({ error: 'name, scope, trigger_type required' });
  const id = `AR-${Date.now()}`;
  db.prepare('INSERT INTO automation_rules (id,name,scope,trigger_type,conditions,actions,priority) VALUES (?,?,?,?,?,?,?)').run(id, name, scope, trigger_type, JSON.stringify(conditions), JSON.stringify(actions), priority);
  res.status(201).json({ id });
});

router.put('/automation-rules/:id', (req, res) => {
  const { name, scope, trigger_type, conditions, actions, priority, is_active } = req.body;
  const fields = [], vals = [];
  if (name !== undefined) { fields.push('name=?'); vals.push(name); }
  if (scope !== undefined) { fields.push('scope=?'); vals.push(scope); }
  if (trigger_type !== undefined) { fields.push('trigger_type=?'); vals.push(trigger_type); }
  if (conditions !== undefined) { fields.push('conditions=?'); vals.push(JSON.stringify(conditions)); }
  if (actions !== undefined) { fields.push('actions=?'); vals.push(JSON.stringify(actions)); }
  if (priority !== undefined) { fields.push('priority=?'); vals.push(priority); }
  if (is_active !== undefined) { fields.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  if (!fields.length) return res.json({ updated: false });
  vals.push(req.params.id);
  db.prepare(`UPDATE automation_rules SET ${fields.join(',')} WHERE id=?`).run(...vals);
  res.json({ updated: true });
});

router.delete('/automation-rules/:id', (req, res) => {
  db.prepare('DELETE FROM automation_rules WHERE id=?').run(req.params.id);
  res.json({ deleted: true });
});

// ─── MESSAGE TEMPLATES ────────────────────────────────────────────────────────
router.get('/message-templates', (req, res) => {
  const { category, channel } = req.query;
  let q = 'SELECT * FROM message_templates WHERE 1=1'; const p = [];
  if (category) { q += ' AND category=?'; p.push(category); }
  if (channel) { q += ' AND channel=?'; p.push(channel); }
  const rows = db.prepare(q + ' ORDER BY category, name').all(...p);
  res.json(rows.map(r => ({ ...r, variables_json: safeQ(() => JSON.parse(r.variables_json), []) })));
});

router.post('/message-templates', (req, res) => {
  const { name, category, channel, language = 'en', body, variables_json = [] } = req.body;
  if (!name || !category || !channel || !body) return res.status(400).json({ error: 'name, category, channel, body required' });
  const id = `TPL-${Date.now()}`;
  db.prepare('INSERT INTO message_templates (id,name,category,channel,language,body,variables_json) VALUES (?,?,?,?,?,?,?)').run(id, name, category, channel, language, body, JSON.stringify(variables_json));
  res.status(201).json({ id });
});

router.put('/message-templates/:id', (req, res) => {
  const { name, category, channel, language, body, variables_json, is_active } = req.body;
  const fields = [], vals = [];
  if (name !== undefined) { fields.push('name=?'); vals.push(name); }
  if (category !== undefined) { fields.push('category=?'); vals.push(category); }
  if (channel !== undefined) { fields.push('channel=?'); vals.push(channel); }
  if (language !== undefined) { fields.push('language=?'); vals.push(language); }
  if (body !== undefined) { fields.push('body=?'); vals.push(body); }
  if (variables_json !== undefined) { fields.push('variables_json=?'); vals.push(JSON.stringify(variables_json)); }
  if (is_active !== undefined) { fields.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  if (!fields.length) return res.json({ updated: false });
  vals.push(req.params.id);
  db.prepare(`UPDATE message_templates SET ${fields.join(',')} WHERE id=?`).run(...vals);
  res.json({ updated: true });
});

router.delete('/message-templates/:id', (req, res) => {
  db.prepare('DELETE FROM message_templates WHERE id=?').run(req.params.id);
  res.json({ deleted: true });
});

// ─── MASTERS ──────────────────────────────────────────────────────────────────
// Universities
router.get('/universities', (req, res) => res.json(db.prepare('SELECT * FROM universities ORDER BY name').all()));
router.post('/universities', (req, res) => {
  const { name, country } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = `UNIV-${Date.now()}`;
  db.prepare('INSERT INTO universities (id,name,country) VALUES (?,?,?)').run(id, name, country || null);
  res.status(201).json({ id });
});
router.put('/universities/:id', (req, res) => {
  const { name, country, is_active } = req.body;
  const fields = [], vals = [];
  if (name !== undefined) { fields.push('name=?'); vals.push(name); }
  if (country !== undefined) { fields.push('country=?'); vals.push(country); }
  if (is_active !== undefined) { fields.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  if (!fields.length) return res.json({ updated: false });
  vals.push(req.params.id);
  db.prepare(`UPDATE universities SET ${fields.join(',')} WHERE id=?`).run(...vals);
  res.json({ updated: true });
});
router.delete('/universities/:id', (req, res) => { db.prepare('DELETE FROM universities WHERE id=?').run(req.params.id); res.json({ deleted: true }); });

// Courses
router.get('/courses', (req, res) => res.json(db.prepare('SELECT * FROM courses ORDER BY name').all()));
router.post('/courses', (req, res) => {
  const { name, intake_months = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = `CRS-${Date.now()}`;
  db.prepare('INSERT INTO courses (id,name,intake_months) VALUES (?,?,?)').run(id, name, JSON.stringify(intake_months));
  res.status(201).json({ id });
});
router.put('/courses/:id', (req, res) => {
  const { name, intake_months, is_active } = req.body;
  const fields = [], vals = [];
  if (name !== undefined) { fields.push('name=?'); vals.push(name); }
  if (intake_months !== undefined) { fields.push('intake_months=?'); vals.push(JSON.stringify(intake_months)); }
  if (is_active !== undefined) { fields.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  if (!fields.length) return res.json({ updated: false });
  vals.push(req.params.id);
  db.prepare(`UPDATE courses SET ${fields.join(',')} WHERE id=?`).run(...vals);
  res.json({ updated: true });
});
router.delete('/courses/:id', (req, res) => { db.prepare('DELETE FROM courses WHERE id=?').run(req.params.id); res.json({ deleted: true }); });

// Countries
router.get('/countries', (req, res) => res.json(db.prepare('SELECT * FROM country_master ORDER BY name').all()));
router.post('/countries', (req, res) => {
  const { name, code } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = `CNT-${Date.now()}`;
  db.prepare('INSERT INTO country_master (id,name,code) VALUES (?,?,?)').run(id, name, code || null);
  res.status(201).json({ id });
});
router.put('/countries/:id', (req, res) => {
  const { name, code, is_active } = req.body;
  const fields = [], vals = [];
  if (name !== undefined) { fields.push('name=?'); vals.push(name); }
  if (code !== undefined) { fields.push('code=?'); vals.push(code); }
  if (is_active !== undefined) { fields.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  if (!fields.length) return res.json({ updated: false });
  vals.push(req.params.id);
  db.prepare(`UPDATE country_master SET ${fields.join(',')} WHERE id=?`).run(...vals);
  res.json({ updated: true });
});
router.delete('/countries/:id', (req, res) => { db.prepare('DELETE FROM country_master WHERE id=?').run(req.params.id); res.json({ deleted: true }); });

// Document Master
router.get('/document-master', (req, res) => res.json(db.prepare('SELECT * FROM document_master ORDER BY sort_order').all()));
router.post('/document-master', (req, res) => {
  const { document_name, doc_code, category = 'STUDENT', mandatory = true, visible_in_stage, sort_order = 0 } = req.body;
  if (!document_name || !doc_code) return res.status(400).json({ error: 'document_name and doc_code required' });
  const id = `DM-${Date.now()}`;
  db.prepare('INSERT INTO document_master (id,document_name,doc_code,category,mandatory,visible_in_stage,sort_order) VALUES (?,?,?,?,?,?,?)').run(id, document_name, doc_code, category, mandatory ? 1 : 0, visible_in_stage || null, sort_order);
  res.status(201).json({ id });
});
router.put('/document-master/:id', (req, res) => {
  const { document_name, doc_code, category, mandatory, visible_in_stage, sort_order, is_active } = req.body;
  const fields = [], vals = [];
  if (document_name !== undefined) { fields.push('document_name=?'); vals.push(document_name); }
  if (doc_code !== undefined) { fields.push('doc_code=?'); vals.push(doc_code); }
  if (category !== undefined) { fields.push('category=?'); vals.push(category); }
  if (mandatory !== undefined) { fields.push('mandatory=?'); vals.push(mandatory ? 1 : 0); }
  if (visible_in_stage !== undefined) { fields.push('visible_in_stage=?'); vals.push(visible_in_stage); }
  if (sort_order !== undefined) { fields.push('sort_order=?'); vals.push(sort_order); }
  if (is_active !== undefined) { fields.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  if (!fields.length) return res.json({ updated: false });
  vals.push(req.params.id);
  db.prepare(`UPDATE document_master SET ${fields.join(',')} WHERE id=?`).run(...vals);
  res.json({ updated: true });
});
router.delete('/document-master/:id', (req, res) => { db.prepare('DELETE FROM document_master WHERE id=?').run(req.params.id); res.json({ deleted: true }); });

// Stage Master
router.get('/stage-master', (req, res) => {
  const { scope } = req.query;
  const rows = scope
    ? db.prepare('SELECT * FROM stage_master WHERE scope=? ORDER BY sort_order').all(scope)
    : db.prepare('SELECT * FROM stage_master ORDER BY scope, sort_order').all();
  res.json(rows);
});
router.post('/stage-master', (req, res) => {
  const { scope, stage_key, label, sort_order = 0, allowed_transitions = [] } = req.body;
  if (!scope || !stage_key || !label) return res.status(400).json({ error: 'scope, stage_key, label required' });
  const id = `SM-${Date.now()}`;
  db.prepare('INSERT INTO stage_master (id,scope,stage_key,label,sort_order,allowed_transitions) VALUES (?,?,?,?,?,?)').run(id, scope, stage_key, label, sort_order, JSON.stringify(allowed_transitions));
  res.status(201).json({ id });
});
router.put('/stage-master/:id', (req, res) => {
  const { label, sort_order, is_active, allowed_transitions } = req.body;
  const fields = [], vals = [];
  if (label !== undefined) { fields.push('label=?'); vals.push(label); }
  if (sort_order !== undefined) { fields.push('sort_order=?'); vals.push(sort_order); }
  if (is_active !== undefined) { fields.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  if (allowed_transitions !== undefined) { fields.push('allowed_transitions=?'); vals.push(JSON.stringify(allowed_transitions)); }
  if (!fields.length) return res.json({ updated: false });
  vals.push(req.params.id);
  db.prepare(`UPDATE stage_master SET ${fields.join(',')} WHERE id=?`).run(...vals);
  res.json({ updated: true });
});
router.delete('/stage-master/:id', (req, res) => { db.prepare('DELETE FROM stage_master WHERE id=?').run(req.params.id); res.json({ deleted: true }); });

// Loss Reasons
router.get('/loss-reasons', (req, res) => {
  const { scope } = req.query;
  const rows = scope
    ? db.prepare('SELECT * FROM loss_reason_master WHERE scope=? ORDER BY reason_code').all(scope)
    : db.prepare('SELECT * FROM loss_reason_master ORDER BY scope, reason_code').all();
  res.json(rows);
});
router.post('/loss-reasons', (req, res) => {
  const { scope, reason_code, label } = req.body;
  if (!scope || !reason_code || !label) return res.status(400).json({ error: 'scope, reason_code, label required' });
  const id = `LR-${Date.now()}`;
  db.prepare('INSERT INTO loss_reason_master (id,scope,reason_code,label) VALUES (?,?,?,?)').run(id, scope, reason_code, label);
  res.status(201).json({ id });
});
router.put('/loss-reasons/:id', (req, res) => {
  const { label, is_active } = req.body;
  const fields = [], vals = [];
  if (label !== undefined) { fields.push('label=?'); vals.push(label); }
  if (is_active !== undefined) { fields.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  if (!fields.length) return res.json({ updated: false });
  vals.push(req.params.id);
  db.prepare(`UPDATE loss_reason_master SET ${fields.join(',')} WHERE id=?`).run(...vals);
  res.json({ updated: true });
});
router.delete('/loss-reasons/:id', (req, res) => { db.prepare('DELETE FROM loss_reason_master WHERE id=?').run(req.params.id); res.json({ deleted: true }); });

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM super_admin_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});
router.put('/settings', (req, res) => {
  const updates = req.body;
  const upsert = db.prepare(`INSERT OR REPLACE INTO super_admin_settings (key,value,updated_at) VALUES (?,?,datetime('now'))`);
  for (const [k, v] of Object.entries(updates)) upsert.run(k, String(v));
  res.json({ updated: Object.keys(updates).length });
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────
router.get('/reports/leads', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const bySource = safeQ(() => db.prepare(`SELECT lead_source_type as source, COUNT(*) as total, COUNT(CASE WHEN stage='CASE_CREATED' THEN 1 END) as converted FROM leads WHERE created_at >= datetime('now','-${days} days') GROUP BY lead_source_type ORDER BY total DESC`).all());
    const funnel = safeQ(() => db.prepare(`SELECT stage, COUNT(*) as count FROM leads WHERE created_at >= datetime('now','-${days} days') GROUP BY stage ORDER BY count DESC`).all());
    const byDay = safeQ(() => db.prepare(`SELECT DATE(created_at) as date, COUNT(*) as leads FROM leads WHERE created_at >= datetime('now','-${days} days') GROUP BY DATE(created_at) ORDER BY date`).all());
    const lostReasons = safeQ(() => db.prepare(`SELECT reason_code, COUNT(*) as count FROM lead_loss_reasons WHERE created_at >= datetime('now','-${days} days') GROUP BY reason_code ORDER BY count DESC`).all());
    const topCampaigns = safeQ(() => db.prepare(`SELECT meta_campaign_id, utm_campaign, COUNT(*) as leads, COUNT(CASE WHEN stage='CASE_CREATED' THEN 1 END) as cases FROM leads WHERE meta_campaign_id IS NOT NULL AND created_at >= datetime('now','-${days} days') GROUP BY meta_campaign_id ORDER BY leads DESC LIMIT 10`).all());
    res.json({ by_source: bySource, funnel, by_day: byDay, lost_reasons: lostReasons, top_campaigns: topCampaigns });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/reports/cases', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const summary = safeQ(() => db.prepare(`SELECT COUNT(*) as total, COUNT(CASE WHEN status IN ('SANCTIONED','DISBURSED') THEN 1 END) as sanctioned, COUNT(CASE WHEN status='REJECTED' THEN 1 END) as rejected, COUNT(CASE WHEN status='DISBURSED' THEN 1 END) as disbursed FROM applications WHERE created_at >= datetime('now','-${days} days')`).get(), {});
    const byBank = safeQ(() => db.prepare(`SELECT bank, COUNT(*) as apps, COUNT(CASE WHEN status IN ('SANCTIONED','DISBURSED') THEN 1 END) as sanctioned FROM applications WHERE created_at >= datetime('now','-${days} days') GROUP BY bank ORDER BY apps DESC LIMIT 10`).all());
    const byStatus = safeQ(() => db.prepare(`SELECT status, COUNT(*) as count FROM applications GROUP BY status ORDER BY count DESC`).all());
    const byDay = safeQ(() => db.prepare(`SELECT DATE(created_at) as date, COUNT(*) as cases FROM applications WHERE created_at >= datetime('now','-${days} days') GROUP BY DATE(created_at) ORDER BY date`).all());
    res.json({ summary, by_bank: byBank, by_status: byStatus, by_day: byDay });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/reports/banks', (req, res) => {
  try {
    const banks = safeQ(() => db.prepare(`
      SELECT b.id, b.name,
        COUNT(ba.id) as total_apps,
        COUNT(CASE WHEN ba.status='SANCTIONED' THEN 1 END) as sanctioned,
        COUNT(CASE WHEN ba.status='REJECTED' THEN 1 END) as rejected,
        COUNT(CASE WHEN ba.status='DISBURSED' THEN 1 END) as disbursed,
        COUNT(CASE WHEN ba.sla_due_at < datetime('now') AND ba.status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED') THEN 1 END) as sla_breaches,
        ROUND(AVG(CASE WHEN ba.status='SANCTIONED' THEN julianday(ba.updated_at)-julianday(ba.created_at) END),1) as avg_days_to_sanction
      FROM banks b LEFT JOIN bank_applications ba ON ba.bank_id = b.id
      GROUP BY b.id ORDER BY total_apps DESC
    `).all());
    res.json({ banks });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/reports/staff', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const staff = safeQ(() => db.prepare(`
      SELECT u.id, u.name, u.role,
        COUNT(DISTINCT l.id) as leads_assigned,
        COUNT(DISTINCT CASE WHEN l.stage IN ('CONNECTED','QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED') THEN l.id END) as connected,
        COUNT(DISTINCT CASE WHEN l.stage IN ('QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED') THEN l.id END) as qualified,
        COUNT(DISTINCT a.id) as cases_created
      FROM users u
      LEFT JOIN leads l ON l.assigned_staff_id = CAST(u.id AS TEXT) AND l.created_at >= datetime('now','-${days} days')
      LEFT JOIN applications a ON a.assigned_to = u.name AND a.created_at >= datetime('now','-${days} days')
      WHERE u.is_active = 1
      GROUP BY u.id ORDER BY leads_assigned DESC
    `).all());
    res.json({ staff });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/reports/campaigns', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const campaigns = safeQ(() => db.prepare(`
      SELECT meta_campaign_id, utm_campaign as campaign_name, utm_source as source,
        COUNT(*) as leads, COUNT(CASE WHEN stage='CASE_CREATED' THEN 1 END) as cases,
        COUNT(CASE WHEN stage IN ('DROPPED','LOST') THEN 1 END) as lost,
        ROUND(AVG(intent_score),1) as avg_intent
      FROM leads
      WHERE meta_campaign_id IS NOT NULL AND created_at >= datetime('now','-${days} days')
      GROUP BY meta_campaign_id ORDER BY leads DESC LIMIT 20
    `).all());
    const spend = safeQ(() => db.prepare(`SELECT meta_campaign_id, SUM(spend_paise) as total_spend FROM ad_spend_daily WHERE date >= DATE('now','-${days} days') GROUP BY meta_campaign_id`).all());
    res.json({ campaigns, spend });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── COMMS DASHBOARD ──────────────────────────────────────────────────────────
router.get('/comms', (req, res) => {
  try {
    const summary = safeQ(() => db.prepare(`SELECT delivery_status as status, COUNT(*) as count FROM message_log GROUP BY delivery_status`).all());
    const byChannel = safeQ(() => db.prepare(`SELECT channel, COUNT(*) as total, COUNT(CASE WHEN delivery_status='DELIVERED' THEN 1 END) as delivered, COUNT(CASE WHEN delivery_status='FAILED' THEN 1 END) as failed FROM message_log GROUP BY channel`).all());
    const recentFailed = safeQ(() => db.prepare(`SELECT id, audience as entity_type, to_address as recipient, template_name, delivery_status as status, created_at FROM message_log WHERE delivery_status='FAILED' ORDER BY created_at DESC LIMIT 20`).all());
    const templateStats = safeQ(() => db.prepare(`SELECT template_name, COUNT(*) as sent, COUNT(CASE WHEN delivery_status='DELIVERED' THEN 1 END) as delivered FROM message_log WHERE template_name IS NOT NULL GROUP BY template_name ORDER BY sent DESC LIMIT 10`).all());
    res.json({ summary, by_channel: byChannel, recent_failed: recentFailed, template_stats: templateStats });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── ORGANIZATIONS ────────────────────────────────────────────────────────────
router.get('/orgs', (req, res) => {
  try {
    const orgs = db.prepare(`
      SELECT o.id, o.name, o.status, o.plan_id,
        COUNT(DISTINCT au.id) as user_count,
        COUNT(DISTINCT al.id) as lead_count
      FROM organizations o
      LEFT JOIN agent_users au ON au.organization_id = o.id
      LEFT JOIN agent_leads al ON al.organization_id = o.id
      GROUP BY o.id ORDER BY o.name
    `).all();
    res.json({ orgs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
router.get('/audit-logs', (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const logs = safeQ(() => db.prepare(`SELECT * FROM agent_audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(parseInt(limit), offset));
    const total = safeQ(() => db.prepare(`SELECT COUNT(*) as c FROM agent_audit_log`).get().c, 0);
    res.json({ logs, total, page: parseInt(page) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
router.get('/notifications', (req, res) => {
  try {
    const { user_id } = req.query;
    const notifs = user_id
      ? db.prepare('SELECT * FROM notifications_outbox WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(user_id)
      : db.prepare('SELECT * FROM notifications_outbox ORDER BY created_at DESC LIMIT 50').all();
    res.json({ notifications: notifs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.patch('/notifications/:id/read', (req, res) => {
  db.prepare('UPDATE notifications_outbox SET status=? WHERE id=?').run('READ', req.params.id);
  res.json({ updated: true });
});

// ─── CONTROL ROOM ─────────────────────────────────────────────────────────────
router.get('/control-room', (req, res) => {
  try {
    // Queue: overdue next_actions
    const overdueActions = safeQ(() => db.prepare(`
      SELECT ta.id, ta.title, ta.scope as entity_type,
        COALESCE(ta.case_id, ta.lead_id, ta.bank_application_id) as entity_id,
        ta.owner_party, ta.priority, ta.due_at,
        CAST((julianday('now') - julianday(ta.due_at)) * 24 AS INTEGER) as hours_overdue,
        u.name as assigned_to_name
      FROM task_next_actions ta
      LEFT JOIN users u ON ta.owner_user_id = CAST(u.id AS TEXT)
      WHERE ta.due_at < datetime('now') AND ta.status NOT IN ('DONE','CANCELLED')
      ORDER BY ta.due_at ASC LIMIT 20
    `).all());

    // Queue: SLA breaches
    const slaBreaches = safeQ(() => db.prepare(`
      SELECT ba.id, b.name as bank_name, ba.status, ba.sla_due_at, a.student_name,
        CAST((julianday('now') - julianday(ba.sla_due_at)) * 24 AS INTEGER) as hours_breached
      FROM bank_applications ba
      JOIN banks b ON ba.bank_id = b.id
      LEFT JOIN applications a ON ba.case_id = a.id
      WHERE ba.sla_due_at < datetime('now')
        AND ba.status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED')
      ORDER BY ba.sla_due_at ASC LIMIT 20
    `).all());

    // Message Health
    const msgHealth = safeQ(() => db.prepare(`
      SELECT channel,
        COUNT(*) as total,
        COUNT(CASE WHEN status='DELIVERED' THEN 1 END) as delivered,
        COUNT(CASE WHEN status='FAILED' THEN 1 END) as failed,
        COUNT(CASE WHEN status='PENDING' THEN 1 END) as pending,
        ROUND(100.0*COUNT(CASE WHEN status='DELIVERED' THEN 1 END)/MAX(COUNT(*),1),1) as delivery_pct
      FROM message_log
      WHERE created_at >= datetime('now','-24 hours')
      GROUP BY channel
    `).all());

    const recentFailed = safeQ(() => db.prepare(`
      SELECT id, audience as entity_type, to_address as recipient, template_name,
        delivery_status as status, created_at
      FROM message_log WHERE delivery_status='FAILED'
      ORDER BY created_at DESC LIMIT 15
    `).all());

    // Automation Jobs
    const autoJobs = safeQ(() => db.prepare(`
      SELECT rj.id, rj.template_name as rule_name, rj.status,
        rj.scheduled_at as scheduled_for, rj.last_error as error_message
      FROM reminder_jobs rj
      ORDER BY rj.scheduled_at DESC LIMIT 20
    `).all());

    // Task Board
    const taskBoard = safeQ(() => db.prepare(`
      SELECT ta.id, ta.title, ta.scope as entity_type,
        COALESCE(ta.case_id, ta.lead_id, ta.bank_application_id) as entity_id,
        ta.status, ta.priority, ta.due_at, ta.owner_party, u.name as assigned_to_name
      FROM task_next_actions ta
      LEFT JOIN users u ON ta.owner_user_id = CAST(u.id AS TEXT)
      WHERE ta.status NOT IN ('DONE','CANCELLED')
      ORDER BY CASE ta.priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
        ta.due_at ASC LIMIT 30
    `).all());

    // Escalations
    const escalations = safeQ(() => db.prepare(`
      SELECT id,
        CASE WHEN case_id IS NOT NULL THEN 'CASE' ELSE 'BANK_APP' END as entity_type,
        COALESCE(case_id, bank_application_id) as entity_id,
        reason, level,
        CASE WHEN resolved_at IS NOT NULL THEN 'RESOLVED' ELSE 'OPEN' END as status,
        created_at
      FROM escalations ORDER BY created_at DESC LIMIT 20
    `).all());

    // Incidents
    const incidents = safeQ(() => db.prepare(`
      SELECT * FROM system_incidents ORDER BY created_at DESC LIMIT 20
    `).all());

    res.json({ overdue_actions: overdueActions, sla_breaches: slaBreaches, msg_health: msgHealth, recent_failed: recentFailed, auto_jobs: autoJobs, task_board: taskBoard, escalations, incidents });
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// Create incident
router.post('/incidents', (req, res) => {
  const { title, severity = 'MEDIUM', description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = `INC-${Date.now()}`;
  db.prepare('INSERT INTO system_incidents (id,title,severity,description) VALUES (?,?,?,?)').run(id, title, severity, description || null);
  res.status(201).json({ id });
});

router.patch('/incidents/:id', (req, res) => {
  const { status, resolved_by } = req.body;
  const fields = [], vals = [];
  if (status) { fields.push('status=?'); vals.push(status); }
  if (resolved_by) { fields.push('resolved_by=?', 'resolved_at=datetime("now")'); vals.push(resolved_by); }
  if (!fields.length) return res.json({ updated: false });
  vals.push(req.params.id);
  db.prepare(`UPDATE system_incidents SET ${fields.join(',')} WHERE id=?`).run(...vals);
  res.json({ updated: true });
});

// ─── FEATURE FLAGS ─────────────────────────────────────────────────────────────
router.get('/feature-flags', (req, res) => {
  const flags = db.prepare('SELECT * FROM feature_flags ORDER BY key').all();
  res.json(flags);
});

router.post('/feature-flags', (req, res) => {
  const { key, label, description, enabled = 0 } = req.body;
  if (!key || !label) return res.status(400).json({ error: 'key and label required' });
  db.prepare(`INSERT OR REPLACE INTO feature_flags (key,label,description,enabled,updated_at,updated_by) VALUES (?,?,?,?,datetime('now'),?)`).run(key, label, description || null, enabled ? 1 : 0, req.user?.id || 'admin');
  res.status(201).json({ key });
});

router.patch('/feature-flags/:key/toggle', (req, res) => {
  const { enabled } = req.body;
  db.prepare(`UPDATE feature_flags SET enabled=?, updated_at=datetime('now'), updated_by=? WHERE key=?`).run(enabled ? 1 : 0, req.user?.id || 'admin', req.params.key);
  // Log toggle in audit
  safeQ(() => db.prepare(`INSERT INTO admin_audit_log (actor_id, actor_name, action, entity_type, entity_id, new_value) VALUES (?,?,?,?,?,?)`).run(req.user?.id || 'admin', req.user?.name || 'admin', 'FEATURE_FLAG_TOGGLE', 'feature_flag', req.params.key, String(enabled)));
  res.json({ updated: true });
});

// ─── REPORT SUBSCRIPTIONS ─────────────────────────────────────────────────────
router.get('/report-subscriptions', (req, res) => {
  const subs = db.prepare('SELECT * FROM report_subscriptions ORDER BY created_at DESC').all();
  res.json(subs.map(s => ({ ...s, filters: safeQ(() => JSON.parse(s.filters), {}) })));
});

router.post('/report-subscriptions', (req, res) => {
  const { report_type, user_id, schedule = 'WEEKLY', filters = {} } = req.body;
  if (!report_type) return res.status(400).json({ error: 'report_type required' });
  const id = `RS-${Date.now()}`;
  db.prepare('INSERT INTO report_subscriptions (id,report_type,user_id,schedule,filters) VALUES (?,?,?,?,?)').run(id, report_type, user_id || null, schedule, JSON.stringify(filters));
  res.status(201).json({ id });
});

router.delete('/report-subscriptions/:id', (req, res) => {
  db.prepare('DELETE FROM report_subscriptions WHERE id=?').run(req.params.id);
  res.json({ deleted: true });
});

// Report Runs
router.get('/report-runs', (req, res) => {
  const { report_type } = req.query;
  const runs = report_type
    ? db.prepare('SELECT * FROM report_runs WHERE report_type=? ORDER BY created_at DESC LIMIT 20').all(report_type)
    : db.prepare('SELECT * FROM report_runs ORDER BY created_at DESC LIMIT 50').all();
  res.json(runs.map(r => ({ ...r, filters: safeQ(() => JSON.parse(r.filters), {}) })));
});

router.post('/report-runs/:type', (req, res) => {
  const id = `RR-${Date.now()}`;
  db.prepare(`INSERT INTO report_runs (id,report_type,filters,status,created_by,started_at) VALUES (?,?,?,'RUNNING',?,datetime('now'))`).run(id, req.params.type, JSON.stringify(req.body || {}), req.user?.id || 'admin');
  // Simulate completion
  setTimeout(() => {
    try { db.prepare(`UPDATE report_runs SET status='COMPLETED', completed_at=datetime('now') WHERE id=?`).run(id); } catch(e){}
  }, 1000);
  res.status(201).json({ id });
});

// ─── LEADS & CASES MONITOR ────────────────────────────────────────────────────
router.get('/monitor/leads', (req, res) => {
  try {
    const { days = 30, stage, source, assigned_to } = req.query;
    const funnel = safeQ(() => db.prepare(`SELECT stage, COUNT(*) as count FROM leads WHERE created_at >= datetime('now','-${days} days') GROUP BY stage ORDER BY count DESC`).all());
    const bySource = safeQ(() => db.prepare(`SELECT lead_source_type, COUNT(*) as count FROM leads WHERE created_at >= datetime('now','-${days} days') GROUP BY lead_source_type ORDER BY count DESC`).all());
    const byStaff = safeQ(() => db.prepare(`
      SELECT u.id, u.name, COUNT(l.id) as leads, COUNT(CASE WHEN l.stage='CASE_CREATED' THEN 1 END) as converted
      FROM users u LEFT JOIN leads l ON l.assigned_staff_id = CAST(u.id AS TEXT) AND l.created_at >= datetime('now','-${days} days')
      WHERE u.is_active=1 GROUP BY u.id ORDER BY leads DESC LIMIT 15
    `).all());
    const stuckLeads = safeQ(() => db.prepare(`
      SELECT l.id, l.full_name, l.stage, l.assigned_staff_id as assigned_to, u.name as assigned_name,
        CAST((julianday('now') - julianday(l.updated_at)) * 24 AS INTEGER) as hours_stuck
      FROM leads l LEFT JOIN users u ON l.assigned_staff_id = CAST(u.id AS TEXT)
      WHERE l.stage NOT IN ('CASE_CREATED','DROPPED','LOST','DUPLICATE')
        AND l.updated_at < datetime('now','-48 hours')
      ORDER BY hours_stuck DESC LIMIT 20
    `).all());
    const daily = safeQ(() => db.prepare(`SELECT DATE(created_at) as date, COUNT(*) as leads FROM leads WHERE created_at >= datetime('now','-${days} days') GROUP BY DATE(created_at) ORDER BY date`).all());
    res.json({ funnel, by_source: bySource, by_staff: byStaff, stuck_leads: stuckLeads, daily });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/monitor/cases', (req, res) => {
  try {
    const { days = 30 } = req.query;
    const summary = safeQ(() => db.prepare(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN status IN ('SANCTIONED','DISBURSED') THEN 1 END) as sanctioned,
        COUNT(CASE WHEN status='REJECTED' THEN 1 END) as rejected,
        COUNT(CASE WHEN status='DISBURSED' THEN 1 END) as disbursed,
        SUM(CASE WHEN status='DISBURSED' THEN COALESCE(disbursed_amount,0) END) as total_disbursed
      FROM applications WHERE created_at >= datetime('now','-${days} days')
    `).get(), {});
    const byStatus = safeQ(() => db.prepare(`SELECT status, COUNT(*) as count FROM applications GROUP BY status ORDER BY count DESC`).all());
    const byBank = safeQ(() => db.prepare(`
      SELECT bank, COUNT(*) as apps, COUNT(CASE WHEN status IN ('SANCTIONED','DISBURSED') THEN 1 END) as sanctioned
      FROM applications WHERE created_at >= datetime('now','-${days} days')
      GROUP BY bank ORDER BY apps DESC LIMIT 10
    `).all());
    const slaRisk = safeQ(() => db.prepare(`
      SELECT ba.id, b.name as bank_name, a.student_name, ba.status, ba.sla_due_at,
        CAST((julianday(ba.sla_due_at) - julianday('now')) * 24 AS INTEGER) as hours_left
      FROM bank_applications ba
      JOIN banks b ON ba.bank_id = b.id
      LEFT JOIN applications a ON ba.case_id = a.id
      WHERE ba.sla_due_at IS NOT NULL AND ba.status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED')
      ORDER BY ba.sla_due_at ASC LIMIT 20
    `).all());
    const daily = safeQ(() => db.prepare(`SELECT DATE(created_at) as date, COUNT(*) as cases FROM applications WHERE created_at >= datetime('now','-${days} days') GROUP BY DATE(created_at) ORDER BY date`).all());
    res.json({ summary, by_status: byStatus, by_bank: byBank, sla_risk: slaRisk, daily });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── EVENTS CONTROL ────────────────────────────────────────────────────────────
router.get('/events-control', (req, res) => {
  try {
    const events = safeQ(() => db.prepare(`
      SELECT e.id, e.title, e.event_start_at as event_date, e.venue_name as city, e.status,
        COUNT(DISTINCT er.id) as registrations,
        COUNT(DISTINCT ec.id) as checkins,
        COUNT(DISTINCT ell.lead_id) as leads_converted
      FROM events e
      LEFT JOIN event_registrations er ON er.event_id = e.id
      LEFT JOIN event_checkins ec ON ec.event_id = e.id
      LEFT JOIN event_lead_links ell ON ell.event_id = e.id
      GROUP BY e.id ORDER BY e.event_start_at DESC LIMIT 20
    `).all());
    const kpis = safeQ(() => db.prepare(`
      SELECT COUNT(DISTINCT e.id) as total_events,
        COUNT(DISTINCT er.id) as total_registrations,
        COUNT(DISTINCT ec.id) as total_checkins,
        COUNT(DISTINCT ell.lead_id) as total_leads
      FROM events e
      LEFT JOIN event_registrations er ON er.event_id = e.id
      LEFT JOIN event_checkins ec ON ec.event_id = e.id
      LEFT JOIN event_lead_links ell ON ell.event_id = e.id
    `).get(), {});
    res.json({ events, kpis });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── AGENTS CONTROL ────────────────────────────────────────────────────────────
router.get('/agents-control', (req, res) => {
  try {
    const orgs = safeQ(() => db.prepare(`
      SELECT o.id, o.name, o.status, o.plan_id,
        COUNT(DISTINCT au.id) as users,
        COUNT(DISTINCT al.id) as leads,
        COUNT(DISTINCT c.id) as commissions,
        SUM(CASE WHEN c.status='PAID' THEN c.commission_amount_paise ELSE 0 END) as paid_commissions
      FROM organizations o
      LEFT JOIN agent_users au ON au.organization_id = o.id
      LEFT JOIN agent_leads al ON al.organization_id = o.id
      LEFT JOIN commissions c ON c.organization_id = o.id
      GROUP BY o.id ORDER BY o.name
    `).all());
    const kpis = safeQ(() => db.prepare(`
      SELECT COUNT(DISTINCT id) as total_orgs,
        COUNT(DISTINCT CASE WHEN status='ACTIVE' THEN id END) as active_orgs
      FROM organizations
    `).get(), {});
    res.json({ orgs, kpis });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── ENHANCED AUDIT LOGS ─────────────────────────────────────────────────────
router.get('/audit-logs-admin', (req, res) => {
  try {
    const { page = 1, limit = 50, actor_id, entity_type, bank_id, from_date, to_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let q = 'SELECT * FROM admin_audit_log WHERE 1=1'; const p = [];
    if (actor_id) { q += ' AND actor_id=?'; p.push(actor_id); }
    if (entity_type) { q += ' AND entity_type=?'; p.push(entity_type); }
    if (bank_id) { q += ' AND bank_id=?'; p.push(bank_id); }
    if (from_date) { q += ' AND created_at >= ?'; p.push(from_date); }
    if (to_date) { q += ' AND created_at <= ?'; p.push(to_date + ' 23:59:59'); }
    const total = safeQ(() => db.prepare(q.replace('SELECT *', 'SELECT COUNT(*) as c')).get(...p).c, 0);
    const logs = safeQ(() => db.prepare(q + ' ORDER BY created_at DESC LIMIT ? OFFSET ?').all(...p, parseInt(limit), offset));
    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Log admin action helper endpoint
router.post('/audit-log', (req, res) => {
  const { action, entity_type, entity_id, bank_id, old_value, new_value } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });
  safeQ(() => db.prepare(`INSERT INTO admin_audit_log (actor_id, actor_name, actor_role, action, entity_type, entity_id, bank_id, old_value, new_value) VALUES (?,?,?,?,?,?,?,?,?)`).run(req.user?.id || 'admin', req.user?.name || 'admin', req.user?.role || 'super_admin', action, entity_type || null, entity_id || null, bank_id || null, old_value ? JSON.stringify(old_value) : null, new_value ? JSON.stringify(new_value) : null));
  res.json({ logged: true });
});

// ─── CONTROL ROOM ACTIONS ─────────────────────────────────────────────────────
router.post('/control-room/reassign', (req, res) => {
  const { entity_type, entity_id, new_owner_user_id, reason } = req.body;
  if (!entity_type || !entity_id || !new_owner_user_id) return res.status(400).json({ error: 'entity_type, entity_id, new_owner_user_id required' });
  try {
    if (entity_type === 'LEAD') {
      db.prepare('UPDATE leads SET assigned_staff_id=?, updated_at=datetime("now") WHERE id=?').run(new_owner_user_id, entity_id);
    } else if (entity_type === 'CASE') {
      db.prepare('UPDATE applications SET assigned_to=?, updated_at=datetime("now") WHERE id=?').run(new_owner_user_id, entity_id);
    }
    safeQ(() => db.prepare(`INSERT INTO admin_audit_log (actor_id, actor_name, action, entity_type, entity_id, new_value) VALUES (?,?,?,?,?,?)`).run(req.user?.id || 'admin', req.user?.name || 'admin', 'REASSIGN', entity_type, entity_id, JSON.stringify({ new_owner_user_id, reason })));
    res.json({ reassigned: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/control-room/trigger-reminder', (req, res) => {
  const { entity_type, entity_id, message } = req.body;
  if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type, entity_id required' });
  const id = `MSG-${Date.now()}`;
  safeQ(() => db.prepare('INSERT INTO message_log (id, audience, channel, to_address, template_name, delivery_status) VALUES (?,?,?,?,?,?)').run(id, entity_type, 'WHATSAPP', 'pending', 'MANUAL_REMINDER', 'PENDING'));
  safeQ(() => db.prepare(`INSERT INTO admin_audit_log (actor_id, actor_name, action, entity_type, entity_id) VALUES (?,?,?,?,?)`).run(req.user?.id || 'admin', req.user?.name || 'admin', 'TRIGGER_REMINDER', entity_type, entity_id));
  res.json({ triggered: true });
});

router.post('/control-room/flag', (req, res) => {
  const { entity_type, entity_id, reason, level = 1 } = req.body;
  if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type, entity_id required' });
  const id = `ESC-${Date.now()}`;
  safeQ(() => db.prepare('INSERT INTO escalations (id, case_id, bank_application_id, reason, level) VALUES (?,?,?,?,?)').run(id, entity_type === 'CASE' ? entity_id : null, entity_type === 'BANK_APP' ? entity_id : null, reason || 'Flagged by Director', level));
  safeQ(() => db.prepare(`INSERT INTO admin_audit_log (actor_id, actor_name, action, entity_type, entity_id) VALUES (?,?,?,?,?)`).run(req.user?.id || 'admin', req.user?.name || 'admin', 'FLAG_ESCALATE', entity_type, entity_id));
  res.json({ flagged: true, escalation_id: id });
});

// ─── BANKS GOVERNANCE ─────────────────────────────────────────────────────────
router.get('/banks-governance', (req, res) => {
  try {
    const banks = safeQ(() => db.prepare(`
      SELECT b.id, b.name, b.is_active,
        COUNT(DISTINCT bp.id) as products,
        COUNT(DISTINCT bb.id) as branches,
        COUNT(DISTINCT bpu.id) as portal_users,
        COUNT(DISTINCT ba.id) as total_apps,
        COUNT(DISTINCT CASE WHEN ba.status='SANCTIONED' THEN ba.id END) as sanctioned,
        COUNT(DISTINCT CASE WHEN ba.sla_due_at < datetime('now') AND ba.status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED') THEN ba.id END) as sla_breaches,
        ROUND(100.0*COUNT(DISTINCT CASE WHEN ba.status='SANCTIONED' THEN ba.id END)/MAX(COUNT(DISTINCT ba.id),1),1) as sanction_pct
      FROM banks b
      LEFT JOIN bank_products bp ON bp.bank_id = b.id
      LEFT JOIN bank_branches bb ON bb.bank_id = b.id
      LEFT JOIN bank_portal_users bpu ON bpu.bank_id = b.id
      LEFT JOIN bank_applications ba ON ba.bank_id = b.id
      GROUP BY b.id ORDER BY b.name
    `).all());
    res.json({ banks });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Create bank (Super Admin)
router.post('/banks', async (req, res) => {
  const { name, logo_url, country = 'India', default_sla_days = 7, allow_product_management, allow_announcements, allow_api, require_proof_for_sanction, admin_name, admin_email, admin_phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Bank name required' });
  const id = `BANK-${Date.now()}`;
  try {
    db.prepare('INSERT INTO banks (id, name, logo_url, country, default_sla_days, is_active) VALUES (?, ?, ?, ?, ?, 1)').run(id, name, logo_url || null, country, default_sla_days);
    let admin_user_id = null;
    if (admin_email) {
      const existing = db.prepare('SELECT id FROM bank_portal_users WHERE email = ?').get(admin_email.toLowerCase());
      if (!existing) {
        const tempPassword = 'Nexthara@123';
        const hash = await bcrypt.hash(tempPassword, 10);
        admin_user_id = `BPU-${Date.now()}`;
        db.prepare('INSERT INTO bank_portal_users (id, bank_id, name, email, phone, role, password_hash, assigned_states) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(admin_user_id, id, admin_name || admin_email, admin_email.toLowerCase(), admin_phone || null, 'SUPER_ADMIN', hash, '[]');
      }
    }
    safeQ(() => db.prepare(`INSERT INTO admin_audit_log (actor_id, actor_name, action, entity_type, entity_id, new_value) VALUES (?,?,?,?,?,?)`).run(req.user?.id || 'admin', req.user?.name || 'admin', 'BANK_CREATED', 'bank', id, name));
    res.status(201).json({ id, name, admin_user_id, temp_password: admin_email ? 'Nexthara@123' : null });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Activate/deactivate bank
router.patch('/banks/:bankId/toggle', (req, res) => {
  const { is_active } = req.body;
  db.prepare('UPDATE banks SET is_active=? WHERE id=?').run(is_active ? 1 : 0, req.params.bankId);
  safeQ(() => db.prepare(`INSERT INTO admin_audit_log (actor_id, actor_name, action, entity_type, entity_id, new_value) VALUES (?,?,?,?,?,?)`).run(req.user?.id || 'admin', req.user?.name || 'admin', is_active ? 'BANK_ACTIVATED' : 'BANK_DEACTIVATED', 'bank', req.params.bankId, String(is_active)));
  res.json({ updated: true });
});

// ─── STAGES & TIMELINES ───────────────────────────────────────────────────────
router.get('/stages-config', (req, res) => {
  try {
    const leadStages = safeQ(() => db.prepare(`SELECT * FROM stage_master WHERE scope='LEAD' ORDER BY sort_order`).all());
    const caseStages = safeQ(() => db.prepare(`SELECT * FROM stage_master WHERE scope='CASE' ORDER BY sort_order`).all());
    const bankAppStages = safeQ(() => db.prepare(`SELECT * FROM stage_master WHERE scope='BANK_APP' ORDER BY sort_order`).all());
    const expectations = safeQ(() => db.prepare(`SELECT * FROM stage_expectations ORDER BY id`).all());
    res.json({ lead_stages: leadStages, case_stages: caseStages, bank_app_stages: bankAppStages, stage_expectations: expectations });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

export default router;

