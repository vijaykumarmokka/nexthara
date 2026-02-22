import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function checkCase(req, res, caseId) {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(caseId);
  if (!app) { res.status(404).json({ error: 'Case not found' }); return null; }
  if (req.user.role === 'bank_user' && app.bank !== req.user.bank) {
    res.status(403).json({ error: 'Forbidden' }); return null;
  }
  return app;
}

// ─── Next Actions ──────────────────────────────────────────────────────────

// GET /api/communication/cases/:caseId/next-actions
router.get('/cases/:caseId/next-actions', (req, res) => {
  if (!checkCase(req, res, req.params.caseId)) return;
  const rows = db.prepare(
    'SELECT * FROM next_actions WHERE case_id = ? ORDER BY created_at DESC'
  ).all(req.params.caseId);
  res.json(rows);
});

// POST /api/communication/cases/:caseId/next-actions
router.post('/cases/:caseId/next-actions', (req, res) => {
  if (!checkCase(req, res, req.params.caseId)) return;
  const { owner_type = 'NEXTHARA', action_code = 'REVIEW', title, description, due_at, priority = 'NORMAL' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = `NA-${uid()}`;
  db.prepare(`
    INSERT INTO next_actions (id, case_id, owner_type, action_code, title, description, due_at, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
  `).run(id, req.params.caseId, owner_type, action_code, title, description || null, due_at || null, priority);
  const row = db.prepare('SELECT * FROM next_actions WHERE id = ?').get(id);
  res.status(201).json(row);
});

// PUT /api/communication/next-actions/:actionId
router.put('/next-actions/:actionId', (req, res) => {
  const action = db.prepare('SELECT * FROM next_actions WHERE id = ?').get(req.params.actionId);
  if (!action) return res.status(404).json({ error: 'Not found' });
  if (!checkCase(req, res, action.case_id)) return;

  const { status, title, description, due_at, priority, owner_type, action_code } = req.body;
  const updates = ["updated_at = datetime('now')"];
  const params = { id: req.params.actionId };
  if (status !== undefined) { updates.push('status = @status'); params.status = status; }
  if (title !== undefined) { updates.push('title = @title'); params.title = title; }
  if (description !== undefined) { updates.push('description = @description'); params.description = description; }
  if (due_at !== undefined) { updates.push('due_at = @due_at'); params.due_at = due_at; }
  if (priority !== undefined) { updates.push('priority = @priority'); params.priority = priority; }
  if (owner_type !== undefined) { updates.push('owner_type = @owner_type'); params.owner_type = owner_type; }
  if (action_code !== undefined) { updates.push('action_code = @action_code'); params.action_code = action_code; }
  db.prepare(`UPDATE next_actions SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json(db.prepare('SELECT * FROM next_actions WHERE id = ?').get(req.params.actionId));
});

// ─── Reminder Rules ────────────────────────────────────────────────────────

// GET /api/communication/reminder-rules
router.get('/reminder-rules', (req, res) => {
  const rows = db.prepare('SELECT * FROM reminder_rules ORDER BY scope, trigger_type').all();
  res.json(rows);
});

// POST /api/communication/reminder-rules
router.post('/reminder-rules', (req, res) => {
  const { scope = 'STUDENT', trigger_type = 'AWAITING', condition = {}, template_name, send_after_minutes = 1440, repeat_every_minutes, max_retries = 3 } = req.body;
  if (!template_name) return res.status(400).json({ error: 'template_name required' });
  const id = `RR-${uid()}`;
  db.prepare(`
    INSERT INTO reminder_rules (id, scope, trigger_type, condition, template_name, send_after_minutes, repeat_every_minutes, max_retries)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, scope, trigger_type, JSON.stringify(condition), template_name, send_after_minutes, repeat_every_minutes ?? null, max_retries);
  res.status(201).json(db.prepare('SELECT * FROM reminder_rules WHERE id = ?').get(id));
});

// PUT /api/communication/reminder-rules/:id
router.put('/reminder-rules/:id', (req, res) => {
  const rule = db.prepare('SELECT * FROM reminder_rules WHERE id = ?').get(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Not found' });
  const { is_active, template_name, send_after_minutes, repeat_every_minutes, max_retries, condition } = req.body;
  const updates = [];
  const params = { id: req.params.id };
  if (is_active !== undefined) { updates.push('is_active = @is_active'); params.is_active = is_active ? 1 : 0; }
  if (template_name !== undefined) { updates.push('template_name = @template_name'); params.template_name = template_name; }
  if (send_after_minutes !== undefined) { updates.push('send_after_minutes = @sam'); params.sam = send_after_minutes; }
  if (repeat_every_minutes !== undefined) { updates.push('repeat_every_minutes = @rem'); params.rem = repeat_every_minutes; }
  if (max_retries !== undefined) { updates.push('max_retries = @max_retries'); params.max_retries = max_retries; }
  if (condition !== undefined) { updates.push('condition = @condition'); params.condition = JSON.stringify(condition); }
  if (updates.length) db.prepare(`UPDATE reminder_rules SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json(db.prepare('SELECT * FROM reminder_rules WHERE id = ?').get(req.params.id));
});

// DELETE /api/communication/reminder-rules/:id
router.delete('/reminder-rules/:id', (req, res) => {
  db.prepare('DELETE FROM reminder_rules WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ─── Reminder Jobs ─────────────────────────────────────────────────────────

// GET /api/communication/cases/:caseId/reminder-jobs
router.get('/cases/:caseId/reminder-jobs', (req, res) => {
  if (!checkCase(req, res, req.params.caseId)) return;
  const rows = db.prepare(
    "SELECT * FROM reminder_jobs WHERE case_id = ? ORDER BY created_at DESC LIMIT 50"
  ).all(req.params.caseId);
  res.json(rows);
});

// POST /api/communication/cases/:caseId/reminder-jobs  (queue a reminder immediately)
router.post('/cases/:caseId/reminder-jobs', (req, res) => {
  const app = checkCase(req, res, req.params.caseId);
  if (!app) return;
  const { to_type = 'STUDENT', to_address, channel = 'IN_APP', template_name = 'manual_reminder', payload = {} } = req.body;
  const addr = to_address || app.student_email;
  const id = `RJ-${uid()}`;
  db.prepare(`
    INSERT INTO reminder_jobs (id, case_id, to_type, to_address, channel, template_name, payload, scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 'QUEUED')
  `).run(id, req.params.caseId, to_type, addr, channel, template_name, JSON.stringify(payload));

  // Log to message_log
  const logId = `ML-${uid()}`;
  db.prepare(`
    INSERT INTO message_log (id, case_id, audience, channel, direction, to_address, template_name, message_text, delivery_status, sent_at)
    VALUES (?, ?, ?, ?, 'OUTBOUND', ?, ?, 'Manual reminder queued', 'QUEUED', datetime('now'))
  `).run(logId, req.params.caseId, to_type, channel, addr, template_name);

  res.status(201).json(db.prepare('SELECT * FROM reminder_jobs WHERE id = ?').get(id));
});

// PUT /api/communication/reminder-jobs/:jobId  (update status: SENT/FAILED/CANCELLED)
router.put('/reminder-jobs/:jobId', (req, res) => {
  const job = db.prepare('SELECT * FROM reminder_jobs WHERE id = ?').get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Not found' });
  const { status, last_error } = req.body;
  const updates = [];
  const params = { id: req.params.jobId };
  if (status !== undefined) { updates.push('status = @status'); params.status = status; }
  if (last_error !== undefined) { updates.push('last_error = @last_error'); params.last_error = last_error; }
  if (status === 'SENT' || status === 'FAILED') {
    updates.push('attempts = attempts + 1');
  }
  if (updates.length) db.prepare(`UPDATE reminder_jobs SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json(db.prepare('SELECT * FROM reminder_jobs WHERE id = ?').get(req.params.jobId));
});

// ─── Message Log ───────────────────────────────────────────────────────────

// GET /api/communication/cases/:caseId/message-log
router.get('/cases/:caseId/message-log', (req, res) => {
  if (!checkCase(req, res, req.params.caseId)) return;
  const rows = db.prepare(
    'SELECT * FROM message_log WHERE case_id = ? ORDER BY created_at DESC LIMIT 100'
  ).all(req.params.caseId);
  res.json(rows);
});

// POST /api/communication/cases/:caseId/message-log
router.post('/cases/:caseId/message-log', (req, res) => {
  if (!checkCase(req, res, req.params.caseId)) return;
  const { audience = 'STUDENT', channel = 'IN_APP', direction = 'OUTBOUND', to_address, from_address, template_name, message_text, payload, provider_message_id, delivery_status = 'QUEUED' } = req.body;
  const id = `ML-${uid()}`;
  db.prepare(`
    INSERT INTO message_log (id, case_id, audience, channel, direction, to_address, from_address, template_name, message_text, payload, provider_message_id, delivery_status, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, req.params.caseId, audience, channel, direction, to_address || null, from_address || null, template_name || null, message_text || null, payload ? JSON.stringify(payload) : null, provider_message_id || null, delivery_status);
  res.status(201).json(db.prepare('SELECT * FROM message_log WHERE id = ?').get(id));
});

// PUT /api/communication/message-log/:logId  (update delivery_status)
router.put('/message-log/:logId', (req, res) => {
  const { delivery_status, provider_message_id } = req.body;
  const updates = [];
  const params = { id: req.params.logId };
  if (delivery_status !== undefined) { updates.push('delivery_status = @delivery_status'); params.delivery_status = delivery_status; }
  if (provider_message_id !== undefined) { updates.push('provider_message_id = @pmid'); params.pmid = provider_message_id; }
  if (delivery_status === 'SENT' || delivery_status === 'DELIVERED') {
    updates.push("sent_at = datetime('now')");
  }
  if (updates.length) db.prepare(`UPDATE message_log SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json(db.prepare('SELECT * FROM message_log WHERE id = ?').get(req.params.logId));
});

// ─── Stage Expectations ────────────────────────────────────────────────────

// GET /api/communication/stage-expectations
router.get('/stage-expectations', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare('SELECT * FROM stage_expectations WHERE main_status = ? AND is_active = 1 ORDER BY bank_id NULLS FIRST LIMIT 1').all(status)
    : db.prepare('SELECT * FROM stage_expectations WHERE is_active = 1 ORDER BY main_status').all();
  res.json(rows);
});

// POST /api/communication/stage-expectations
router.post('/stage-expectations', (req, res) => {
  const { bank_id, main_status, expected_min_days, expected_max_days, student_text, staff_text } = req.body;
  if (!main_status || !student_text) return res.status(400).json({ error: 'main_status and student_text required' });
  const id = `SE-${uid()}`;
  db.prepare(`
    INSERT INTO stage_expectations (id, bank_id, main_status, expected_min_days, expected_max_days, student_text, staff_text, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, bank_id || null, main_status, expected_min_days ?? 1, expected_max_days ?? 7, student_text, staff_text);
  res.status(201).json(db.prepare('SELECT * FROM stage_expectations WHERE id = ?').get(id));
});

// PUT /api/communication/stage-expectations/:id
router.put('/stage-expectations/:id', (req, res) => {
  const exp = db.prepare('SELECT * FROM stage_expectations WHERE id = ?').get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Not found' });
  const { expected_min_days, expected_max_days, student_text, staff_text, is_active } = req.body;
  const updates = [];
  const params = { id: req.params.id };
  if (expected_min_days !== undefined) { updates.push('expected_min_days = @min'); params.min = expected_min_days; }
  if (expected_max_days !== undefined) { updates.push('expected_max_days = @max'); params.max = expected_max_days; }
  if (student_text !== undefined) { updates.push('student_text = @st'); params.st = student_text; }
  if (staff_text !== undefined) { updates.push('staff_text = @sft'); params.sft = staff_text; }
  if (is_active !== undefined) { updates.push('is_active = @is_active'); params.is_active = is_active ? 1 : 0; }
  if (updates.length) db.prepare(`UPDATE stage_expectations SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json(db.prepare('SELECT * FROM stage_expectations WHERE id = ?').get(req.params.id));
});

// ─── Escalations ───────────────────────────────────────────────────────────

// GET /api/communication/cases/:caseId/escalations
router.get('/cases/:caseId/escalations', (req, res) => {
  if (!checkCase(req, res, req.params.caseId)) return;
  const rows = db.prepare(
    'SELECT * FROM escalations WHERE case_id = ? ORDER BY created_at DESC'
  ).all(req.params.caseId);
  res.json(rows);
});

// POST /api/communication/cases/:caseId/escalations
router.post('/cases/:caseId/escalations', (req, res) => {
  if (!checkCase(req, res, req.params.caseId)) return;
  const { level = 1, reason = 'SLA_BREACH' } = req.body;
  const id = `ESC-${uid()}`;
  db.prepare(`
    INSERT INTO escalations (id, case_id, level, reason) VALUES (?, ?, ?, ?)
  `).run(id, req.params.caseId, level, reason);

  // Auto-create a high-priority next_action for staff
  const naId = `NA-${uid()}`;
  db.prepare(`
    INSERT INTO next_actions (id, case_id, owner_type, action_code, title, description, priority, status)
    VALUES (?, ?, 'NEXTHARA', 'ESCALATE', 'Escalation: Review this case immediately', ?, 'URGENT', 'OPEN')
  `).run(naId, req.params.caseId, `Level ${level} escalation triggered — Reason: ${reason}`);

  res.status(201).json(db.prepare('SELECT * FROM escalations WHERE id = ?').get(id));
});

// POST /api/communication/escalations/:escalationId/resolve
router.post('/escalations/:escalationId/resolve', (req, res) => {
  const esc = db.prepare('SELECT * FROM escalations WHERE id = ?').get(req.params.escalationId);
  if (!esc) return res.status(404).json({ error: 'Not found' });
  if (!checkCase(req, res, esc.case_id)) return;
  db.prepare(`
    UPDATE escalations SET resolved_at = datetime('now'), resolved_by_staff_id = ? WHERE id = ?
  `).run(req.user.email || 'Staff', req.params.escalationId);
  res.json(db.prepare('SELECT * FROM escalations WHERE id = ?').get(req.params.escalationId));
});

// ─── Dashboard: All open next_actions for staff ────────────────────────────

// GET /api/communication/open-actions?owner_type=STUDENT|BANK|NEXTHARA
router.get('/open-actions', (req, res) => {
  const { owner_type, priority } = req.query;
  let where = ["na.status = 'OPEN'"];
  const params = {};
  if (req.user.role === 'bank_user') {
    where.push("a.bank = @bank");
    params.bank = req.user.bank;
  }
  if (owner_type) { where.push('na.owner_type = @owner_type'); params.owner_type = owner_type; }
  if (priority)   { where.push('na.priority = @priority');     params.priority = priority; }
  const rows = db.prepare(`
    SELECT na.*, a.student_name, a.bank, a.status as case_status, a.awaiting_from
    FROM next_actions na
    JOIN applications a ON a.id = na.case_id
    WHERE ${where.join(' AND ')}
    ORDER BY CASE na.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 ELSE 2 END, na.due_at ASC NULLS LAST
    LIMIT 100
  `).all(params);
  res.json(rows);
});

export default router;
