/**
 * CRM Routes — /api/crm
 * Implements: Co-applicants, Checklist Engine, Query Threads, Tasks,
 *             Bank Requirement Overrides, References, Document Master
 */
import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All CRM routes require auth
router.use(requireAuth);

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Generate checklist for a case from document_master + co-applicants.
 * Called on case create or co-applicant type change.
 */
function generateChecklist(caseId) {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(caseId);
  if (!app) return;

  const coapps = db.prepare('SELECT * FROM co_applicants WHERE application_id = ?').all(caseId);
  const coappTypes = [...new Set(coapps.map(c => c.coapp_type).filter(Boolean))];

  // Get all default_required docs from master
  const allDocs = db.prepare(`SELECT * FROM document_master WHERE default_required = 1 AND is_active = 1 ORDER BY sort_order`).all();

  const ins = db.prepare(`
    INSERT OR IGNORE INTO case_document_checklist_items
      (id, case_id, doc_code, display_name, owner_entity_type, requirement_level, status, required_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'REQUIRED', 'PENDING', 'SYSTEM', datetime('now'), datetime('now'))
  `);

  for (const doc of allDocs) {
    // Student docs — always include
    if (doc.owner_type === 'STUDENT') {
      const existCheck = db.prepare(`SELECT id FROM case_document_checklist_items WHERE case_id = ? AND doc_code = ? AND owner_entity_type = 'STUDENT'`).get(caseId, doc.doc_code);
      if (!existCheck) ins.run(uid('CHK-'), caseId, doc.doc_code, doc.display_name || doc.document_name, 'STUDENT');
    }
    // Collateral docs
    else if (doc.owner_type === 'COLLATERAL') {
      if (app.collateral && app.collateral !== 'NA' && app.collateral !== 'None') {
        const existCheck = db.prepare(`SELECT id FROM case_document_checklist_items WHERE case_id = ? AND doc_code = ? AND owner_entity_type = 'COLLATERAL'`).get(caseId, doc.doc_code);
        if (!existCheck) ins.run(uid('CHK-'), caseId, doc.doc_code, doc.display_name || doc.document_name, 'COLLATERAL');
      }
    }
    // Co-applicant docs — match by coapp_type_scope
    else if (doc.owner_type === 'COAPPLICANT') {
      let scope = null;
      try { scope = doc.coapp_type_scope ? JSON.parse(doc.coapp_type_scope) : null; } catch(e) {}

      for (const coapp of coapps) {
        const matches = !scope || scope.includes(coapp.coapp_type);
        if (!matches) continue;
        const existCheck = db.prepare(`SELECT id FROM case_document_checklist_items WHERE case_id = ? AND doc_code = ? AND owner_entity_id = ?`).get(caseId, doc.doc_code, String(coapp.id));
        if (!existCheck) {
          db.prepare(`INSERT OR IGNORE INTO case_document_checklist_items
            (id, case_id, doc_code, display_name, owner_entity_type, owner_entity_id, requirement_level, status, required_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'COAPPLICANT', ?, 'REQUIRED', 'PENDING', 'SYSTEM', datetime('now'), datetime('now'))
          `).run(uid('CHK-'), caseId, doc.doc_code, doc.display_name || doc.document_name, String(coapp.id));
        }
      }
    }
  }
}

// ── Co-applicants ─────────────────────────────────────────────────────────────

// GET /api/crm/cases/:caseId/coapplicants
router.get('/cases/:caseId/coapplicants', (req, res) => {
  const { caseId } = req.params;
  try {
    const rows = db.prepare('SELECT * FROM co_applicants WHERE application_id = ? ORDER BY is_primary DESC, id ASC').all(caseId);
    res.json({ coapplicants: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/crm/cases/:caseId/coapplicants
router.post('/cases/:caseId/coapplicants', (req, res) => {
  const { caseId } = req.params;
  const {
    coapp_type = 'INDIA_SALARIED', name, relation, phone, email, age,
    income_source, monthly_income, last_drawn_salary, income,
    active_loans_summary, cibil_status = 'UNKNOWN', cibil_score,
    is_primary = 0, employment_type,
  } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const result = db.prepare(`
      INSERT INTO co_applicants
        (application_id, name, relation, phone, email, income, employment_type,
         coapp_type, age, income_source, monthly_income, last_drawn_salary,
         active_loans_summary, cibil_status, cibil_score, is_primary, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(caseId, name, relation || null, phone || null, email || null,
           income || monthly_income || null, employment_type || income_source || null,
           coapp_type, age || null, income_source || null, monthly_income || null,
           last_drawn_salary || null, active_loans_summary || null,
           cibil_status, cibil_score || null, is_primary ? 1 : 0);

    // Re-generate checklist when co-applicant type changes
    generateChecklist(caseId);

    const coapp = db.prepare('SELECT * FROM co_applicants WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ coapplicant: coapp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/crm/cases/:caseId/coapplicants/:coId
router.put('/cases/:caseId/coapplicants/:coId', (req, res) => {
  const { caseId, coId } = req.params;
  const {
    coapp_type, name, relation, phone, email, age,
    income_source, monthly_income, last_drawn_salary, income,
    active_loans_summary, cibil_status, cibil_score, is_primary, employment_type,
  } = req.body;
  try {
    db.prepare(`
      UPDATE co_applicants SET
        coapp_type = COALESCE(?, coapp_type),
        name = COALESCE(?, name),
        relation = COALESCE(?, relation),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        income = COALESCE(?, income),
        employment_type = COALESCE(?, employment_type),
        age = COALESCE(?, age),
        income_source = COALESCE(?, income_source),
        monthly_income = COALESCE(?, monthly_income),
        last_drawn_salary = COALESCE(?, last_drawn_salary),
        active_loans_summary = COALESCE(?, active_loans_summary),
        cibil_status = COALESCE(?, cibil_status),
        cibil_score = COALESCE(?, cibil_score),
        is_primary = COALESCE(?, is_primary),
        updated_at = datetime('now')
      WHERE id = ? AND application_id = ?
    `).run(coapp_type || null, name || null, relation || null, phone || null,
           email || null, income || monthly_income || null, employment_type || income_source || null,
           age || null, income_source || null, monthly_income || null, last_drawn_salary || null,
           active_loans_summary || null, cibil_status || null, cibil_score || null,
           is_primary != null ? (is_primary ? 1 : 0) : null, Number(coId), caseId);

    // Re-generate checklist if type changed
    generateChecklist(caseId);
    const coapp = db.prepare('SELECT * FROM co_applicants WHERE id = ?').get(Number(coId));
    res.json({ coapplicant: coapp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/crm/cases/:caseId/coapplicants/:coId
router.delete('/cases/:caseId/coapplicants/:coId', (req, res) => {
  const { caseId, coId } = req.params;
  try {
    db.prepare('DELETE FROM co_applicants WHERE id = ? AND application_id = ?').run(Number(coId), caseId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── References ───────────────────────────────────────────────────────────────

// GET /api/crm/cases/:caseId/references
router.get('/cases/:caseId/references', (req, res) => {
  const { caseId } = req.params;
  const refs = db.prepare('SELECT * FROM case_references WHERE case_id = ? ORDER BY ref_order ASC').all(caseId);
  res.json({ references: refs });
});

// POST /api/crm/cases/:caseId/references
router.post('/cases/:caseId/references', (req, res) => {
  const { caseId } = req.params;
  const { full_name, phone, email, address, ref_order = 1 } = req.body;
  if (!full_name) return res.status(400).json({ error: 'full_name required' });
  try {
    const id = uid('REF-');
    db.prepare(`INSERT INTO case_references (id, case_id, full_name, phone, email, address, ref_order) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, caseId, full_name, phone || null, email || null, address || null, ref_order);
    res.status(201).json({ reference: db.prepare('SELECT * FROM case_references WHERE id = ?').get(id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/crm/cases/:caseId/references/:refId
router.put('/cases/:caseId/references/:refId', (req, res) => {
  const { caseId, refId } = req.params;
  const { full_name, phone, email, address } = req.body;
  try {
    db.prepare(`UPDATE case_references SET full_name=COALESCE(?,full_name), phone=COALESCE(?,phone), email=COALESCE(?,email), address=COALESCE(?,address) WHERE id=? AND case_id=?`).run(full_name||null, phone||null, email||null, address||null, refId, caseId);
    res.json({ reference: db.prepare('SELECT * FROM case_references WHERE id = ?').get(refId) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/crm/cases/:caseId/references/:refId
router.delete('/cases/:caseId/references/:refId', (req, res) => {
  const { caseId, refId } = req.params;
  try {
    db.prepare('DELETE FROM case_references WHERE id = ? AND case_id = ?').run(refId, caseId);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Checklist ─────────────────────────────────────────────────────────────────

// POST /api/crm/cases/:caseId/checklist/generate
router.post('/cases/:caseId/checklist/generate', (req, res) => {
  const { caseId } = req.params;
  const app = db.prepare('SELECT id FROM applications WHERE id = ?').get(caseId);
  if (!app) return res.status(404).json({ error: 'Case not found' });
  try {
    generateChecklist(caseId);
    res.json({ success: true, message: 'Checklist generated' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/crm/cases/:caseId/checklist
router.get('/cases/:caseId/checklist', (req, res) => {
  const { caseId } = req.params;
  const { bank_id, owner_type, status } = req.query;

  try {
    let whereClause = 'c.case_id = ?';
    const params = [caseId];
    if (bank_id) { whereClause += ' AND (c.bank_id = ? OR c.bank_id IS NULL)'; params.push(bank_id); }
    if (owner_type) { whereClause += ' AND c.owner_entity_type = ?'; params.push(owner_type); }
    if (status) { whereClause += ' AND c.status = ?'; params.push(status); }

    const items = db.prepare(`
      SELECT c.*, d.category, d.description, d.coapp_type_scope, d.visible_to_student, d.visible_to_bank,
             d.file_rules, d.stage_visibility, d.bank_scope,
             ca.name as coapp_name, ca.coapp_type as coapp_type_val
      FROM case_document_checklist_items c
      LEFT JOIN document_master d ON d.doc_code = c.doc_code
      LEFT JOIN co_applicants ca ON ca.id = CAST(c.owner_entity_id AS INTEGER) AND c.owner_entity_type = 'COAPPLICANT'
      WHERE ${whereClause}
      ORDER BY d.sort_order ASC, c.created_at ASC
    `).all(...params);

    // Group items by category/owner
    const groups = {};
    for (const item of items) {
      let groupKey, groupLabel;
      if (item.owner_entity_type === 'STUDENT') {
        groupKey = `student_${item.category || 'OTHER'}`;
        groupLabel = `Student - ${capitalize(item.category || 'Other')}`;
      } else if (item.owner_entity_type === 'COAPPLICANT') {
        groupKey = `coapp_${item.owner_entity_id}`;
        groupLabel = `Co-App: ${item.coapp_name || 'Co-Applicant'} (${item.coapp_type_val || ''})`;
      } else if (item.owner_entity_type === 'COLLATERAL') {
        groupKey = 'collateral';
        groupLabel = 'Collateral';
      } else {
        groupKey = 'other';
        groupLabel = 'Other';
      }
      if (!groups[groupKey]) groups[groupKey] = { group: groupLabel, items: [] };
      groups[groupKey].items.push(item);
    }

    // Bank-requested items
    const bankItems = items.filter(i => i.required_by === 'BANK');
    const bankGroups = {};
    for (const item of bankItems) {
      const key = `bank_${item.bank_id || 'unknown'}`;
      if (!bankGroups[key]) bankGroups[key] = { group: `Bank Requested (${item.bank_id || 'Bank'})`, items: [] };
      bankGroups[key].items.push(item);
    }

    const allGroups = Object.values(groups).concat(Object.values(bankGroups));

    const summary = {
      required_total: items.filter(i => i.requirement_level === 'REQUIRED').length,
      required_completed: items.filter(i => i.requirement_level === 'REQUIRED' && ['VERIFIED','UPLOADED'].includes(i.status)).length,
      optional_total: items.filter(i => i.requirement_level === 'OPTIONAL').length,
      overdue_required: items.filter(i => i.requirement_level === 'REQUIRED' && i.status === 'PENDING' && i.due_at && new Date(i.due_at) < new Date()).length,
    };

    res.json({ case_id: caseId, summary, groups: allGroups, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/crm/checklist-items/:id
router.patch('/checklist-items/:id', (req, res) => {
  const { id } = req.params;
  const { requirement_level, status, notes, due_at, rejection_reason, document_id, last_requested_at } = req.body;
  try {
    db.prepare(`
      UPDATE case_document_checklist_items SET
        requirement_level = COALESCE(?, requirement_level),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        due_at = COALESCE(?, due_at),
        rejection_reason = COALESCE(?, rejection_reason),
        document_id = COALESCE(?, document_id),
        last_requested_at = COALESCE(?, last_requested_at),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(requirement_level||null, status||null, notes||null, due_at||null, rejection_reason||null, document_id||null, last_requested_at||null, id);
    const item = db.prepare('SELECT * FROM case_document_checklist_items WHERE id = ?').get(id);
    res.json({ checklist_item: item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/crm/bank-apps/:bankAppId/requirements/override
router.post('/bank-apps/:bankAppId/requirements/override', (req, res) => {
  const { bankAppId } = req.params;
  const { override_type, doc_code, owner_entity_type = 'STUDENT', owner_entity_id, reason, bank_id } = req.body;
  if (!override_type || !doc_code) return res.status(400).json({ error: 'override_type and doc_code required' });
  try {
    const id = uid('BRO-');
    db.prepare(`
      INSERT INTO bank_requirement_overrides
        (id, bank_application_id, bank_id, override_type, doc_code, owner_entity_type, owner_entity_id, reason, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, bankAppId, bank_id || null, override_type, doc_code, owner_entity_type, owner_entity_id || null, reason || null, req.user?.id || null);

    // Apply override: add checklist item if ADD_REQUIRED / ADD_OPTIONAL
    if (['ADD_REQUIRED','ADD_OPTIONAL'].includes(override_type)) {
      const bankApp = db.prepare('SELECT case_id FROM bank_applications WHERE id = ?').get(bankAppId);
      if (bankApp?.case_id) {
        const dm = db.prepare('SELECT * FROM document_master WHERE doc_code = ?').get(doc_code);
        const reqLevel = override_type === 'ADD_REQUIRED' ? 'REQUIRED' : 'OPTIONAL';
        db.prepare(`
          INSERT OR IGNORE INTO case_document_checklist_items
            (id, case_id, doc_code, display_name, owner_entity_type, owner_entity_id, requirement_level, status, required_by, bank_id, bank_application_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 'BANK', ?, ?, datetime('now'), datetime('now'))
        `).run(uid('CHK-'), bankApp.case_id, doc_code, dm?.display_name || dm?.document_name || doc_code, owner_entity_type, owner_entity_id || null, reqLevel, bank_id || null, bankAppId);
      }
    } else if (['WAIVE','SET_OPTIONAL'].includes(override_type)) {
      const bankApp = db.prepare('SELECT case_id FROM bank_applications WHERE id = ?').get(bankAppId);
      if (bankApp?.case_id) {
        const newLevel = override_type === 'WAIVE' ? 'NOT_NEEDED' : 'OPTIONAL';
        db.prepare(`UPDATE case_document_checklist_items SET requirement_level = ?, status = CASE WHEN ? = 'NOT_NEEDED' THEN 'WAIVED' ELSE status END, updated_at = datetime('now') WHERE case_id = ? AND doc_code = ? AND bank_application_id = ?`).run(newLevel, override_type, bankApp.case_id, doc_code, bankAppId);
      }
    }

    res.status(201).json({ override: db.prepare('SELECT * FROM bank_requirement_overrides WHERE id = ?').get(id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Query Threads ─────────────────────────────────────────────────────────────

// GET /api/crm/cases/:caseId/queries
router.get('/cases/:caseId/queries', (req, res) => {
  const { caseId } = req.params;
  const { status } = req.query;
  let q = 'SELECT * FROM query_threads WHERE case_id = ?';
  const params = [caseId];
  if (status) { q += ' AND status = ?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  const threads = db.prepare(q).all(...params);
  // Attach message count + latest message
  for (const t of threads) {
    t.message_count = db.prepare('SELECT COUNT(*) as c FROM query_messages WHERE thread_id = ?').get(t.id).c;
    t.latest_message = db.prepare('SELECT * FROM query_messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT 1').get(t.id);
  }
  res.json({ query_threads: threads });
});

// POST /api/crm/cases/:caseId/queries
router.post('/cases/:caseId/queries', (req, res) => {
  const { caseId } = req.params;
  const { scope = 'CASE', bank_application_id, raised_by_party = 'STAFF', title, priority = 'NORMAL', due_at, initial_message } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const id = uid('QT-');
    db.prepare(`
      INSERT INTO query_threads (id, scope, case_id, bank_application_id, raised_by_party, title, status, priority, due_at)
      VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
    `).run(id, scope, caseId, bank_application_id || null, raised_by_party, title, priority, due_at || null);

    // Create initial message if provided
    if (initial_message) {
      const msgId = uid('QM-');
      db.prepare(`INSERT INTO query_messages (id, thread_id, sender_party, sender_user_id, sender_name, message) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(msgId, id, raised_by_party, req.user?.id || null, req.user?.name || null, initial_message);
    }

    // Auto-create task for bank query
    if (raised_by_party === 'BANK') {
      db.prepare(`INSERT INTO task_next_actions (id, scope, case_id, bank_application_id, title, action_type, owner_party, status, priority, related_query_thread_id, created_at, updated_at)
        VALUES (?, 'CASE', ?, ?, ?, 'OTHER', 'STUDENT', 'OPEN', 'HIGH', ?, datetime('now'), datetime('now'))`)
        .run(uid('TNA-'), caseId, bank_application_id || null, `Respond to bank query: ${title}`, id);
    }

    const thread = db.prepare('SELECT * FROM query_threads WHERE id = ?').get(id);
    res.status(201).json({ query_thread: thread });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/crm/queries/:threadId
router.get('/queries/:threadId', (req, res) => {
  const { threadId } = req.params;
  const thread = db.prepare('SELECT * FROM query_threads WHERE id = ?').get(threadId);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  const messages = db.prepare('SELECT * FROM query_messages WHERE thread_id = ? ORDER BY created_at ASC').all(threadId);
  const attachments = db.prepare('SELECT * FROM query_attachments WHERE thread_id = ? ORDER BY created_at ASC').all(threadId);
  res.json({ thread, messages, attachments });
});

// POST /api/crm/queries/:threadId/messages
router.post('/queries/:threadId/messages', (req, res) => {
  const { threadId } = req.params;
  const { sender_party = 'STAFF', message, attachments = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  try {
    const msgId = uid('QM-');
    db.prepare(`INSERT INTO query_messages (id, thread_id, sender_party, sender_user_id, sender_name, message) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(msgId, threadId, sender_party, req.user?.id || null, req.user?.name || null, message);

    // Save attachments
    for (const att of attachments) {
      db.prepare(`INSERT INTO query_attachments (id, thread_id, message_id, file_url, file_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(uid('QA-'), threadId, msgId, att.file_url, att.file_name || null, att.mime_type || null, att.size_bytes || null);
    }

    const msg = db.prepare('SELECT * FROM query_messages WHERE id = ?').get(msgId);
    res.status(201).json({ message: msg });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/crm/queries/:threadId/status
router.patch('/queries/:threadId/status', (req, res) => {
  const { threadId } = req.params;
  const { status } = req.body;
  const validStatuses = ['OPEN','WAITING_STUDENT','WAITING_STAFF','WAITING_BANK','RESOLVED','CLOSED'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const resolved_at = ['RESOLVED','CLOSED'].includes(status) ? "datetime('now')" : 'NULL';
  db.prepare(`UPDATE query_threads SET status = ?, resolved_at = ${['RESOLVED','CLOSED'].includes(status) ? "datetime('now')" : 'NULL'} WHERE id = ?`).run(status, threadId);
  res.json({ thread: db.prepare('SELECT * FROM query_threads WHERE id = ?').get(threadId) });
});

// ── Tasks (task_next_actions) ─────────────────────────────────────────────────

// GET /api/crm/cases/:caseId/tasks
router.get('/cases/:caseId/tasks', (req, res) => {
  const { caseId } = req.params;
  const { status, owner_party } = req.query;
  let q = 'SELECT * FROM task_next_actions WHERE case_id = ?';
  const params = [caseId];
  if (status) { q += ' AND status = ?'; params.push(status); }
  if (owner_party) { q += ' AND owner_party = ?'; params.push(owner_party); }
  q += ' ORDER BY CASE priority WHEN "URGENT" THEN 1 WHEN "HIGH" THEN 2 WHEN "NORMAL" THEN 3 ELSE 4 END, due_at ASC NULLS LAST';
  res.json({ tasks: db.prepare(q).all(...params) });
});

// POST /api/crm/tasks
router.post('/tasks', (req, res) => {
  const { scope = 'CASE', case_id, bank_application_id, lead_id, title, description, action_type = 'OTHER', owner_party = 'STAFF', owner_user_id, priority = 'NORMAL', due_at, related_checklist_item_id, related_query_thread_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const id = uid('TNA-');
    db.prepare(`
      INSERT INTO task_next_actions
        (id, scope, case_id, bank_application_id, lead_id, title, description, action_type, owner_party, owner_user_id, status, priority, due_at, related_checklist_item_id, related_query_thread_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(id, scope, case_id || null, bank_application_id || null, lead_id || null, title, description || null, action_type, owner_party, owner_user_id || null, priority, due_at || null, related_checklist_item_id || null, related_query_thread_id || null);
    res.status(201).json({ task: db.prepare('SELECT * FROM task_next_actions WHERE id = ?').get(id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/crm/tasks/:id
router.patch('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { status, priority, due_at, description, owner_user_id } = req.body;
  try {
    const completed_at = status === 'DONE' ? "datetime('now')" : 'completed_at';
    db.prepare(`
      UPDATE task_next_actions SET
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        due_at = COALESCE(?, due_at),
        description = COALESCE(?, description),
        owner_user_id = COALESCE(?, owner_user_id),
        completed_at = CASE WHEN ? = 'DONE' THEN datetime('now') ELSE completed_at END,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(status||null, priority||null, due_at||null, description||null, owner_user_id||null, status||null, id);
    res.json({ task: db.prepare('SELECT * FROM task_next_actions WHERE id = ?').get(id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Sanction Blockers Dashboard ──────────────────────────────────────────────

// GET /api/crm/dashboard/sanction-blockers
router.get('/dashboard/sanction-blockers', (req, res) => {
  try {
    const stuck_docs = db.prepare(`
      SELECT a.id as case_id, a.student_name, a.status,
             COUNT(c.id) as pending_docs,
             MIN(c.last_requested_at) as oldest_request
      FROM applications a
      JOIN case_document_checklist_items c ON c.case_id = a.id
      WHERE c.status = 'PENDING' AND c.requirement_level = 'REQUIRED'
        AND c.last_requested_at IS NOT NULL
        AND (julianday('now') - julianday(c.last_requested_at)) * 24 > 48
      GROUP BY a.id
      ORDER BY oldest_request ASC
      LIMIT 20
    `).all();

    const pending_queries = db.prepare(`
      SELECT q.case_id, q.id as query_id, q.title, q.created_at, q.priority,
             a.student_name
      FROM query_threads q JOIN applications a ON a.id = q.case_id
      WHERE q.status = 'OPEN'
        AND (julianday('now') - julianday(q.created_at)) * 24 > 24
      ORDER BY q.created_at ASC
      LIMIT 20
    `).all();

    const no_coapp = db.prepare(`
      SELECT a.id as case_id, a.student_name, a.status
      FROM applications a
      LEFT JOIN co_applicants ca ON ca.application_id = a.id
      WHERE a.status NOT IN ('DISBURSED','CLOSED','REJECTED')
        AND ca.id IS NULL
      LIMIT 20
    `).all();

    const sanction_no_proof = db.prepare(`
      SELECT a.id as case_id, a.student_name, ba.status as bank_status, ba.id as bank_app_id
      FROM applications a
      JOIN bank_applications ba ON ba.case_id = a.id
      LEFT JOIN bank_application_proofs bap ON bap.bank_application_id = ba.id
      WHERE ba.status IN ('SANCTIONED','DISBURSED') AND bap.id IS NULL
      LIMIT 20
    `).all();

    res.json({ stuck_docs, pending_queries, no_coapp, sanction_no_proof });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Document Master (admin) ──────────────────────────────────────────────────

// GET /api/crm/admin/document-master
router.get('/admin/document-master', (req, res) => {
  const { owner_type, category, is_active } = req.query;
  let q = 'SELECT * FROM document_master WHERE 1=1';
  const params = [];
  if (owner_type) { q += ' AND owner_type = ?'; params.push(owner_type); }
  if (category) { q += ' AND category = ?'; params.push(category); }
  if (is_active !== undefined) { q += ' AND is_active = ?'; params.push(Number(is_active)); }
  q += ' ORDER BY sort_order ASC';
  res.json({ documents: db.prepare(q).all(...params) });
});

// POST /api/crm/admin/document-master
router.post('/admin/document-master', (req, res) => {
  const { doc_code, display_name, description, category = 'IDENTITY', owner_type = 'STUDENT', coapp_type_scope, default_required = false, visible_to_student = true, visible_to_bank = true, file_rules, sort_order = 100, stage_visibility = 'CASE', bank_scope = 'ALL' } = req.body;
  if (!doc_code || !display_name) return res.status(400).json({ error: 'doc_code and display_name required' });
  try {
    const id = uid('DM-');
    db.prepare(`
      INSERT INTO document_master (id, doc_code, document_name, display_name, description, category, owner_type, coapp_type_scope, mandatory, default_required, visible_to_student, visible_to_bank, file_rules, sort_order, stage_visibility, bank_scope, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, doc_code, display_name, display_name, description||null, category, owner_type, coapp_type_scope ? JSON.stringify(coapp_type_scope) : null, default_required?1:0, default_required?1:0, visible_to_student?1:0, visible_to_bank?1:0, file_rules ? JSON.stringify(file_rules) : null, sort_order, stage_visibility, bank_scope);
    res.status(201).json({ document: db.prepare('SELECT * FROM document_master WHERE id = ?').get(id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/crm/admin/document-master/:doc_code
router.put('/admin/document-master/:doc_code', (req, res) => {
  const { doc_code } = req.params;
  const { display_name, description, category, owner_type, coapp_type_scope, default_required, visible_to_student, visible_to_bank, file_rules, sort_order, stage_visibility, bank_scope, is_active } = req.body;
  try {
    db.prepare(`
      UPDATE document_master SET
        display_name = COALESCE(?, display_name),
        document_name = COALESCE(?, document_name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        owner_type = COALESCE(?, owner_type),
        coapp_type_scope = COALESCE(?, coapp_type_scope),
        default_required = COALESCE(?, default_required),
        mandatory = COALESCE(?, mandatory),
        visible_to_student = COALESCE(?, visible_to_student),
        visible_to_bank = COALESCE(?, visible_to_bank),
        file_rules = COALESCE(?, file_rules),
        sort_order = COALESCE(?, sort_order),
        stage_visibility = COALESCE(?, stage_visibility),
        bank_scope = COALESCE(?, bank_scope),
        is_active = COALESCE(?, is_active)
      WHERE doc_code = ?
    `).run(
      display_name||null, display_name||null, description||null, category||null, owner_type||null,
      coapp_type_scope ? JSON.stringify(coapp_type_scope) : null,
      default_required!=null?Number(default_required):null, default_required!=null?Number(default_required):null,
      visible_to_student!=null?Number(visible_to_student):null, visible_to_bank!=null?Number(visible_to_bank):null,
      file_rules ? JSON.stringify(file_rules) : null, sort_order||null, stage_visibility||null, bank_scope||null,
      is_active!=null?Number(is_active):null, doc_code
    );
    res.json({ document: db.prepare('SELECT * FROM document_master WHERE doc_code = ?').get(doc_code) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/crm/admin/document-master/:doc_code (soft delete)
router.delete('/admin/document-master/:doc_code', (req, res) => {
  const { doc_code } = req.params;
  db.prepare('UPDATE document_master SET is_active = 0 WHERE doc_code = ?').run(doc_code);
  res.json({ success: true });
});

// ── Reminders Schedule ───────────────────────────────────────────────────────

// POST /api/crm/reminders/schedule (internal — schedule a reminder job)
router.post('/reminders/schedule', (req, res) => {
  const { scope, entity_id, reminder_type, channel = 'IN_APP', recipient_party = 'STUDENT', recipient_user_id, recipient_address, template_name, payload, scheduled_at, max_retries = 3, escalation_level = 0 } = req.body;
  if (!scope || !entity_id || !reminder_type || !scheduled_at) return res.status(400).json({ error: 'scope, entity_id, reminder_type, scheduled_at required' });
  try {
    const id = uid('RJ-');
    // Use existing reminder_jobs table (extended) or insert with compatible fields
    db.prepare(`
      INSERT INTO reminder_jobs (id, case_id, to_type, to_address, channel, template_name, payload, scheduled_at, status, attempts, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', 0, datetime('now'))
    `).run(id, entity_id, recipient_party, recipient_address || '', channel, template_name || reminder_type, JSON.stringify(payload || {}), scheduled_at);
    res.status(201).json({ reminder_job_id: id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Student Profile (extended fields) ────────────────────────────────────────

// GET /api/crm/cases/:caseId/profile
router.get('/cases/:caseId/profile', (req, res) => {
  const { caseId } = req.params;
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(caseId);
  if (!app) return res.status(404).json({ error: 'Case not found' });
  const coapps = db.prepare('SELECT * FROM co_applicants WHERE application_id = ? ORDER BY is_primary DESC, id ASC').all(caseId);
  const refs = db.prepare('SELECT * FROM case_references WHERE case_id = ? ORDER BY ref_order ASC').all(caseId);
  res.json({ profile: app, coapplicants: coapps, references: refs });
});

// PATCH /api/crm/cases/:caseId/profile
router.patch('/cases/:caseId/profile', (req, res) => {
  const { caseId } = req.params;
  const existing = db.prepare('SELECT id FROM applications WHERE id = ?').get(caseId);
  if (!existing) return res.status(404).json({ error: 'Case not found' });
  const {
    admit_status, exams, degree, duration_years, student_age, year_of_graduation,
    work_experience_months, active_loans, active_loans_details, student_cibil_status, student_cibil_score,
    university, course, country, intake, loan_amount_requested, student_name, student_email, student_phone,
  } = req.body;
  try {
    db.prepare(`
      UPDATE applications SET
        admit_status = COALESCE(?, admit_status),
        exams = COALESCE(?, exams),
        degree = COALESCE(?, degree),
        duration_years = COALESCE(?, duration_years),
        student_age = COALESCE(?, student_age),
        year_of_graduation = COALESCE(?, year_of_graduation),
        work_experience_months = COALESCE(?, work_experience_months),
        active_loans = COALESCE(?, active_loans),
        active_loans_details = COALESCE(?, active_loans_details),
        student_cibil_status = COALESCE(?, student_cibil_status),
        student_cibil_score = COALESCE(?, student_cibil_score),
        university = COALESCE(?, university),
        course = COALESCE(?, course),
        country = COALESCE(?, country),
        intake = COALESCE(?, intake),
        loan_amount_requested = COALESCE(?, loan_amount_requested),
        student_name = COALESCE(?, student_name),
        student_email = COALESCE(?, student_email),
        student_phone = COALESCE(?, student_phone),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      admit_status||null, exams ? JSON.stringify(exams) : null, degree||null, duration_years||null,
      student_age||null, year_of_graduation||null, work_experience_months||null,
      active_loans!=null?Number(active_loans):null, active_loans_details||null,
      student_cibil_status||null, student_cibil_score||null,
      university||null, course||null, country||null, intake||null, loan_amount_requested||null,
      student_name||null, student_email||null, student_phone||null, caseId
    );
    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(caseId);
    res.json({ profile: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Utility ──────────────────────────────────────────────────────────────────

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default router;
