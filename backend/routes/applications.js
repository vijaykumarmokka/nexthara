import { Router } from 'express';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const multer = require('multer');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|jpg|jpeg|png|gif|doc|docx|xlsx|xls|csv|txt/i;
    const ext = path.extname(file.originalname).slice(1);
    cb(null, allowed.test(ext));
  },
});

const router = Router();

// ── SLA computed expression (replaces stored sla_days for all queries) ──────
// Days since status/awaiting_from last changed — auto-grows without a cron
const SLA_DAYS_SQL = `CAST(julianday('now') - julianday(COALESCE(status_changed_at, created_at)) AS INTEGER)`;

// Shared SLA breach / warning expressions — reference computed days, not stored column
const SLA_BREACH_EXPR = `(
  (status IN ('NOT_CONNECTED','CONTACTED','YET_TO_CONNECT') AND ${SLA_DAYS_SQL} > 2) OR
  (status IN ('LOGIN_SUBMITTED','LOGIN_IN_PROGRESS','LOGIN_REJECTED','DUPLICATE_LOGIN') AND ${SLA_DAYS_SQL} > 3) OR
  (status IN ('DOCS_PENDING','DOCS_SUBMITTED','DOCS_VERIFICATION') AND ${SLA_DAYS_SQL} > 4) OR
  (status IN ('UNDER_REVIEW','CREDIT_CHECK_IN_PROGRESS','FIELD_VERIFICATION') AND ${SLA_DAYS_SQL} > 7) OR
  (status = 'QUERY_RAISED' AND ${SLA_DAYS_SQL} > 5) OR
  (status IN ('SANCTIONED','CONDITIONAL_SANCTION','REJECTED') AND ${SLA_DAYS_SQL} > 2) OR
  (status IN ('SANCTION_ACCEPTED','AGREEMENT_SIGNED') AND ${SLA_DAYS_SQL} > 5) OR
  (status IN ('DISBURSEMENT_PENDING','DISBURSED') AND ${SLA_DAYS_SQL} > 7)
) AND awaiting_from NOT IN ('Closed')`;

const SLA_WARNING_EXPR = `(
  (status IN ('NOT_CONNECTED','CONTACTED','YET_TO_CONNECT') AND ${SLA_DAYS_SQL} > 1 AND ${SLA_DAYS_SQL} <= 2) OR
  (status IN ('LOGIN_SUBMITTED','LOGIN_IN_PROGRESS','LOGIN_REJECTED','DUPLICATE_LOGIN') AND ${SLA_DAYS_SQL} > 2 AND ${SLA_DAYS_SQL} <= 3) OR
  (status IN ('DOCS_PENDING','DOCS_SUBMITTED','DOCS_VERIFICATION') AND ${SLA_DAYS_SQL} > 2 AND ${SLA_DAYS_SQL} <= 4) OR
  (status IN ('UNDER_REVIEW','CREDIT_CHECK_IN_PROGRESS','FIELD_VERIFICATION') AND ${SLA_DAYS_SQL} > 4 AND ${SLA_DAYS_SQL} <= 7) OR
  (status = 'QUERY_RAISED' AND ${SLA_DAYS_SQL} > 3 AND ${SLA_DAYS_SQL} <= 5) OR
  (status IN ('SANCTIONED','CONDITIONAL_SANCTION','REJECTED') AND ${SLA_DAYS_SQL} > 1 AND ${SLA_DAYS_SQL} <= 2) OR
  (status IN ('SANCTION_ACCEPTED','AGREEMENT_SIGNED') AND ${SLA_DAYS_SQL} > 3 AND ${SLA_DAYS_SQL} <= 5) OR
  (status IN ('DISBURSEMENT_PENDING','DISBURSED') AND ${SLA_DAYS_SQL} > 4 AND ${SLA_DAYS_SQL} <= 7)
) AND awaiting_from NOT IN ('Closed')`;

// Enrich a row with computed sla_days from status_changed_at
function withSla(row) {
  if (!row) return row;
  const base = row.status_changed_at || row.created_at;
  const sla_days = base ? Math.max(0, Math.floor((Date.now() - new Date(base).getTime()) / 86400000)) : 0;
  return { ...row, sla_days };
}

// All routes require authentication
router.use(requireAuth);

// GET /api/applications — list with filters, search, pagination
router.get('/', (req, res) => {
  const { search, status, awaiting, priority, stage, sla, sort_by, sort_dir, page = 1, limit = 50 } = req.query;

  const STAGE_MAP = { 1: ['NOT_CONNECTED','CONTACTED','YET_TO_CONNECT'], 2: ['LOGIN_SUBMITTED','LOGIN_IN_PROGRESS','LOGIN_REJECTED','DUPLICATE_LOGIN'], 3: ['DOCS_PENDING','DOCS_SUBMITTED','DOCS_VERIFICATION'], 4: ['UNDER_REVIEW','CREDIT_CHECK_IN_PROGRESS','FIELD_VERIFICATION','QUERY_RAISED'], 5: ['SANCTIONED','CONDITIONAL_SANCTION','REJECTED'], 6: ['SANCTION_ACCEPTED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED'], 7: ['CLOSED','DROPPED','EXPIRED'] };

  let where = [];
  let params = {};

  // Bank filter for bank_user role
  if (req.user.role === 'bank_user') {
    where.push('bank = @userBank');
    params.userBank = req.user.bank;
  }

  if (search) {
    where.push(`(student_name LIKE @search OR id LIKE @search OR bank LIKE @search OR course LIKE @search OR student_phone LIKE @search OR student_email LIKE @search)`);
    params.search = `%${search}%`;
  }
  if (status) { where.push('status = @status'); params.status = status; }
  if (awaiting) { where.push('awaiting_from = @awaiting'); params.awaiting = awaiting; }
  if (priority) { where.push('priority = @priority'); params.priority = priority; }
  const { intake } = req.query;
  if (intake) { where.push('intake = @intake'); params.intake = intake; }
  if (stage && STAGE_MAP[stage]) {
    const placeholders = STAGE_MAP[stage].map((_, i) => `@stage${i}`);
    where.push(`status IN (${placeholders.join(',')})`);
    STAGE_MAP[stage].forEach((s, i) => { params[`stage${i}`] = s; });
  }
  if (sla === 'breach') { where.push(SLA_BREACH_EXPR); }
  if (sla === 'warning') { where.push(SLA_WARNING_EXPR); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const validSorts = ['id', 'student_name', 'bank', 'status', 'awaiting_from', 'sla_days', 'priority', 'updated_at'];
  const orderCol = validSorts.includes(sort_by) ? sort_by : 'updated_at';
  const orderDir = sort_dir === 'asc' ? 'ASC' : 'DESC';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM applications ${whereClause}`).get(params);
  const rows = db.prepare(`SELECT * FROM applications ${whereClause} ORDER BY ${orderCol} ${orderDir} LIMIT ${parseInt(limit)} OFFSET ${offset}`).all(params);

  res.json({
    data: rows.map(withSla),
    total: countRow.total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(countRow.total / parseInt(limit)),
  });
});

// GET /api/applications/stats — dashboard KPIs
router.get('/stats', (req, res) => {
  const bankFilter = req.user.role === 'bank_user' ? `WHERE bank = '${req.user.bank.replace(/'/g, "''")}'` : '';
  const bankAnd = req.user.role === 'bank_user' ? `AND bank = '${req.user.bank.replace(/'/g, "''")}'` : '';

  const total = db.prepare(`SELECT COUNT(*) as c FROM applications ${bankFilter}`).get().c;
  const sanctioned = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE status IN ('SANCTIONED','CONDITIONAL_SANCTION','SANCTION_ACCEPTED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED','CLOSED') ${bankAnd}`).get().c;
  const pending = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE awaiting_from IN ('Student','Bank','Nexthara') AND status NOT IN ('CLOSED','DROPPED','EXPIRED','REJECTED','LOGIN_REJECTED') ${bankAnd}`).get().c;
  const rejected = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE status IN ('REJECTED','LOGIN_REJECTED','DROPPED','EXPIRED') ${bankAnd}`).get().c;
  const slaBreach = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE ${SLA_BREACH_EXPR} ${bankAnd}`).get().c;
  const slaWarning = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE ${SLA_WARNING_EXPR} ${bankAnd}`).get().c;
  const awaitingStudent = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE awaiting_from = 'Student' ${bankAnd}`).get().c;
  const awaitingBank = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE awaiting_from = 'Bank' ${bankAnd}`).get().c;
  const awaitingNexthara = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE awaiting_from = 'Nexthara' ${bankAnd}`).get().c;

  res.json({ total, sanctioned, pending, rejected, slaBreach, slaWarning, awaitingStudent, awaitingBank, awaitingNexthara });
});

// GET /api/applications/pipeline — stage counts
router.get('/pipeline', (req, res) => {
  const STAGE_MAP = {
    1: { label: 'Pre-Login', statuses: ['NOT_CONNECTED','CONTACTED','YET_TO_CONNECT'] },
    2: { label: 'Login Stage', statuses: ['LOGIN_SUBMITTED','LOGIN_IN_PROGRESS','LOGIN_REJECTED','DUPLICATE_LOGIN'] },
    3: { label: 'Doc Verification', statuses: ['DOCS_PENDING','DOCS_SUBMITTED','DOCS_VERIFICATION'] },
    4: { label: 'Credit Review', statuses: ['UNDER_REVIEW','CREDIT_CHECK_IN_PROGRESS','FIELD_VERIFICATION','QUERY_RAISED'] },
    5: { label: 'Decision', statuses: ['SANCTIONED','CONDITIONAL_SANCTION','REJECTED'] },
    6: { label: 'Post Sanction', statuses: ['SANCTION_ACCEPTED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED'] },
    7: { label: 'Closed', statuses: ['CLOSED','DROPPED','EXPIRED'] },
  };

  const bankAnd = req.user.role === 'bank_user' ? ` AND bank = '${req.user.bank.replace(/'/g, "''")}'` : '';

  const pipeline = {};
  for (const [stage, config] of Object.entries(STAGE_MAP)) {
    const placeholders = config.statuses.map(() => `?`).join(',');
    const count = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE status IN (${placeholders})${bankAnd}`).get(...config.statuses).c;
    pipeline[stage] = { ...config, count };
  }

  res.json(pipeline);
});

// GET /api/applications/sidebar-counts
router.get('/sidebar-counts', (req, res) => {
  const bankFilter = req.user.role === 'bank_user' ? `WHERE bank = '${req.user.bank.replace(/'/g, "''")}'` : '';
  const bankAnd = req.user.role === 'bank_user' ? ` AND bank = '${req.user.bank.replace(/'/g, "''")}'` : '';

  const all = db.prepare(`SELECT COUNT(*) as c FROM applications ${bankFilter}`).get().c;

  const stageStatuses = {
    1: ['NOT_CONNECTED','CONTACTED','YET_TO_CONNECT'],
    2: ['LOGIN_SUBMITTED','LOGIN_IN_PROGRESS','LOGIN_REJECTED','DUPLICATE_LOGIN'],
    3: ['DOCS_PENDING','DOCS_SUBMITTED','DOCS_VERIFICATION'],
    4: ['UNDER_REVIEW','CREDIT_CHECK_IN_PROGRESS','FIELD_VERIFICATION','QUERY_RAISED'],
    5: ['SANCTIONED','CONDITIONAL_SANCTION','REJECTED'],
    6: ['SANCTION_ACCEPTED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED'],
    7: ['CLOSED','DROPPED','EXPIRED'],
  };

  const stages = {};
  for (const [s, list] of Object.entries(stageStatuses)) {
    const ph = list.map(() => '?').join(',');
    stages[s] = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE status IN (${ph})${bankAnd}`).get(...list).c;
  }

  const awaitStudent = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE awaiting_from='Student'${bankAnd}`).get().c;
  const awaitBank = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE awaiting_from='Bank'${bankAnd}`).get().c;
  const awaitNexthara = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE awaiting_from='Nexthara'${bankAnd}`).get().c;
  const urgent = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE priority='Urgent'${bankAnd}`).get().c;
  const high = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE priority='High'${bankAnd}`).get().c;
  const slaBreach = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE ${SLA_BREACH_EXPR}${bankAnd}`).get().c;
  const slaWarning = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE ${SLA_WARNING_EXPR}${bankAnd}`).get().c;

  res.json({ all, stages, awaitStudent, awaitBank, awaitNexthara, urgent, high, slaBreach, slaWarning });
});

// GET /api/applications/:id — single application
router.get('/:id', (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  if (req.user.role === 'bank_user' && app.bank !== req.user.bank) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const history = db.prepare('SELECT * FROM status_history WHERE application_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...withSla(app), history });
});

// POST /api/applications — create new application
router.post('/', (req, res) => {
  const { student_name, student_email, student_phone, bank, university, course, country, intake, loan_amount_requested, collateral = 'NA', loan_type = 'NA', priority = 'Normal', notes } = req.body;
  if (!student_name || !student_email || !bank || !university || !course) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // bank_user can only create for their bank
  if (req.user.role === 'bank_user' && bank !== req.user.bank) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const count = db.prepare('SELECT COUNT(*) as c FROM applications').get().c;
  const id = `NX-2026-${String(1000 + count).padStart(4, '0')}`;

  db.prepare(`
    INSERT INTO applications (id, student_name, student_email, student_phone, bank, university, course, country, intake, loan_amount_requested, collateral, loan_type, status, sub_status, awaiting_from, priority, notes, status_changed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NOT_CONNECTED', '-', 'Nexthara', ?, ?, datetime('now'))
  `).run(id, student_name, student_email, student_phone || null, bank, university, course, country || null, intake || null, loan_amount_requested || null, collateral, loan_type, priority, notes || null);

  db.prepare(`
    INSERT INTO status_history (application_id, status, sub_status, awaiting_from, changed_by, notes)
    VALUES (?, 'NOT_CONNECTED', '-', 'Nexthara', 'System', 'Application created')
  `).run(id);

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
  res.status(201).json(app);
});

// PUT /api/applications/:id — update application status
router.put('/:id', (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  if (req.user.role === 'bank_user' && app.bank !== req.user.bank) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const {
    status, sub_status, awaiting_from, priority,
    student_phone, country, intake, loan_amount_requested, collateral, loan_type,
    bank_application_ref, sanction_amount, roi, tenure, processing_fee, margin_percent,
    sanction_accepted_date, agreement_date, disbursement_request_date,
    disbursed_amount, disbursed_date, disbursement_mode,
    rejection_reason, relook_possible, close_reason, notes, last_update_source,
    lender_conditions, confidence_score,
  } = req.body;

  // Enforce close_reason mandatory for closing statuses
  const CLOSE_REQUIRED = ['CLOSED', 'DROPPED', 'EXPIRED', 'REJECTED', 'LOGIN_REJECTED'];
  if (status && CLOSE_REQUIRED.includes(status) && !close_reason && !req.body.close_reason) {
    const existingReason = app.close_reason;
    if (!existingReason) {
      return res.status(400).json({ error: 'close_reason is required when setting status to ' + status });
    }
  }

  const updates = [];
  const params = {};

  if (status !== undefined) { updates.push('status = @status'); params.status = status; }
  if (sub_status !== undefined) { updates.push('sub_status = @sub_status'); params.sub_status = sub_status; }
  if (awaiting_from !== undefined) { updates.push('awaiting_from = @awaiting_from'); params.awaiting_from = awaiting_from; }
  if (priority !== undefined) { updates.push('priority = @priority'); params.priority = priority; }
  if (student_phone !== undefined) { updates.push('student_phone = @student_phone'); params.student_phone = student_phone; }
  if (country !== undefined) { updates.push('country = @country'); params.country = country; }
  if (intake !== undefined) { updates.push('intake = @intake'); params.intake = intake; }
  if (loan_amount_requested !== undefined) { updates.push('loan_amount_requested = @loan_amount_requested'); params.loan_amount_requested = loan_amount_requested; }
  if (collateral !== undefined) { updates.push('collateral = @collateral'); params.collateral = collateral; }
  if (loan_type !== undefined) { updates.push('loan_type = @loan_type'); params.loan_type = loan_type; }
  if (bank_application_ref !== undefined) { updates.push('bank_application_ref = @bank_application_ref'); params.bank_application_ref = bank_application_ref; }
  if (sanction_amount !== undefined) { updates.push('sanction_amount = @sanction_amount'); params.sanction_amount = sanction_amount; }
  if (roi !== undefined) { updates.push('roi = @roi'); params.roi = roi; }
  if (tenure !== undefined) { updates.push('tenure = @tenure'); params.tenure = tenure; }
  if (processing_fee !== undefined) { updates.push('processing_fee = @processing_fee'); params.processing_fee = processing_fee; }
  if (margin_percent !== undefined) { updates.push('margin_percent = @margin_percent'); params.margin_percent = margin_percent; }
  if (sanction_accepted_date !== undefined) { updates.push('sanction_accepted_date = @sanction_accepted_date'); params.sanction_accepted_date = sanction_accepted_date; }
  if (agreement_date !== undefined) { updates.push('agreement_date = @agreement_date'); params.agreement_date = agreement_date; }
  if (disbursement_request_date !== undefined) { updates.push('disbursement_request_date = @disbursement_request_date'); params.disbursement_request_date = disbursement_request_date; }
  if (disbursed_amount !== undefined) { updates.push('disbursed_amount = @disbursed_amount'); params.disbursed_amount = disbursed_amount; }
  if (disbursed_date !== undefined) { updates.push('disbursed_date = @disbursed_date'); params.disbursed_date = disbursed_date; }
  if (disbursement_mode !== undefined) { updates.push('disbursement_mode = @disbursement_mode'); params.disbursement_mode = disbursement_mode; }
  if (rejection_reason !== undefined) { updates.push('rejection_reason = @rejection_reason'); params.rejection_reason = rejection_reason; }
  if (relook_possible !== undefined) { updates.push('relook_possible = @relook_possible'); params.relook_possible = relook_possible; }
  if (close_reason !== undefined) { updates.push('close_reason = @close_reason'); params.close_reason = close_reason; }
  if (notes !== undefined) { updates.push('notes = @notes'); params.notes = notes; }
  if (last_update_source !== undefined) { updates.push('last_update_source = @last_update_source'); params.last_update_source = last_update_source; }
  if (lender_conditions !== undefined) { updates.push('lender_conditions = @lender_conditions'); params.lender_conditions = lender_conditions; }
  if (confidence_score !== undefined) { updates.push('confidence_score = @confidence_score'); params.confidence_score = confidence_score; }
  const { assigned_to, tags } = req.body;
  if (assigned_to !== undefined) { updates.push('assigned_to = @assigned_to'); params.assigned_to = assigned_to; }
  if (tags !== undefined) { updates.push('tags = @tags'); params.tags = typeof tags === 'string' ? tags : JSON.stringify(tags); }

  updates.push("updated_at = datetime('now')");
  // Reset SLA timer only when status or awaiting_from changes (not on notes-only updates)
  if (status !== undefined || awaiting_from !== undefined) {
    updates.push("status_changed_at = datetime('now')");
  }

  params.id = req.params.id;
  db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = @id`).run(params);

  // Add history entry
  const detectEntryType = (n) => {
    if (!n) return 'status';
    if (n.startsWith('[QUERY]'))    return 'query';
    if (n.startsWith('[PROOF]'))    return 'proof';
    if (n.startsWith('[DOC]'))      return 'docs';
    if (n.startsWith('[PACK]'))     return 'packs';
    if (n.startsWith('[WHATSAPP]')) return 'whatsapp';
    return 'status';
  };
  if (status) {
    const entryType = detectEntryType(notes);
    db.prepare(`
      INSERT INTO status_history (application_id, status, sub_status, awaiting_from, changed_by, entry_type, notes)
      VALUES (?, ?, ?, ?, 'Staff', ?, ?)
    `).run(req.params.id, status, sub_status || '-', awaiting_from || app.awaiting_from, entryType, notes || `Status changed to ${status}`);
  } else if (notes) {
    const entryType = detectEntryType(notes);
    db.prepare(`
      INSERT INTO status_history (application_id, status, sub_status, awaiting_from, changed_by, entry_type, notes)
      VALUES (?, ?, ?, ?, 'Staff', ?, ?)
    `).run(req.params.id, app.status, app.sub_status || '-', app.awaiting_from, entryType, notes);
  }

  const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);

  // Auto-update next_action when status or awaiting_from changes
  if (status !== undefined || awaiting_from !== undefined) {
    // Cancel all previous OPEN next_actions for this case
    db.prepare("UPDATE next_actions SET status = 'CANCELLED', updated_at = datetime('now') WHERE case_id = ? AND status = 'OPEN'").run(req.params.id);

    // Determine new next_action based on awaiting_from / status
    const newAwaiting = awaiting_from ?? updated.awaiting_from;
    const newStatus   = status ?? updated.status;

    const ACTION_MAP = {
      Student:  { owner_type: 'STUDENT',   action_code: 'UPLOAD_DOCS',  title: 'Student to upload required documents' },
      Bank:     { owner_type: 'BANK',       action_code: 'PING_BANK',    title: 'Bank to review and provide an update' },
      Nexthara: { owner_type: 'NEXTHARA',   action_code: 'VERIFY_PROOF', title: 'Nexthara to verify and take next step' },
    };
    const CLOSED_STATUSES = ['CLOSED', 'DROPPED', 'EXPIRED', 'REJECTED', 'LOGIN_REJECTED', 'DISBURSED'];
    if (!CLOSED_STATUSES.includes(newStatus)) {
      const actionDef = ACTION_MAP[newAwaiting] || ACTION_MAP['Nexthara'];
      // Special cases
      let finalAction = { ...actionDef };
      if (newStatus === 'QUERY_RAISED') {
        finalAction = { owner_type: 'STUDENT', action_code: 'UPLOAD_DOCS', title: 'Student to respond to the bank query' };
      } else if (newStatus === 'SANCTIONED' || newStatus === 'CONDITIONAL_SANCTION') {
        finalAction = { owner_type: 'NEXTHARA', action_code: 'VERIFY_PROOF', title: 'Review sanction letter and confirm acceptance' };
      } else if (newStatus === 'AGREEMENT_SIGNED') {
        finalAction = { owner_type: 'NEXTHARA', action_code: 'FOLLOW_UP', title: 'Follow up on disbursement timeline' };
      }
      const naId = `NA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      // Determine due_at: 2 days from now
      db.prepare(`
        INSERT INTO next_actions (id, case_id, owner_type, action_code, title, due_at, priority, status)
        VALUES (?, ?, ?, ?, ?, datetime('now', '+2 days'), ?, 'OPEN')
      `).run(naId, req.params.id, finalAction.owner_type, finalAction.action_code, finalAction.title,
             updated.priority === 'Urgent' ? 'URGENT' : updated.priority === 'High' ? 'HIGH' : 'NORMAL');
    }
  }

  const history = db.prepare('SELECT * FROM status_history WHERE application_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...updated, history });
});

// DELETE /api/applications/:id
router.delete('/:id', (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Not found' });

  if (req.user.role === 'bank_user' && app.bank !== req.user.bank) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM status_history WHERE application_id = ?').run(req.params.id);
  db.prepare('DELETE FROM documents WHERE application_id = ?').run(req.params.id);
  db.prepare('DELETE FROM co_applicants WHERE application_id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ─── Documents sub-routes ───────────────────────────────────────
function checkAppAccess(req, res, id) {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
  if (!app) { res.status(404).json({ error: 'Application not found' }); return null; }
  if (req.user.role === 'bank_user' && app.bank !== req.user.bank) {
    res.status(403).json({ error: 'Forbidden' }); return null;
  }
  return app;
}

// GET /api/applications/:id/documents
router.get('/:id/documents', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  const docs = db.prepare('SELECT * FROM documents WHERE application_id = ? ORDER BY doc_category, doc_name').all(req.params.id);
  res.json(docs);
});

// POST /api/applications/:id/documents
router.post('/:id/documents', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  const { doc_name, doc_category = 'Other', owner = 'Student', status = 'Missing', remarks } = req.body;
  if (!doc_name) return res.status(400).json({ error: 'doc_name required' });
  const result = db.prepare(`
    INSERT INTO documents (application_id, doc_name, doc_category, owner, status, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, doc_name, doc_category, owner, status, remarks || null);
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(doc);
});

// PUT /api/applications/:id/documents/:docId
router.put('/:id/documents/:docId', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  const { status, remarks, uploaded_by, label, share_with_lender, quality } = req.body;
  const updates = ["updated_at = datetime('now')"];
  const params = { docId: req.params.docId };
  if (status !== undefined) { updates.push('status = @status'); params.status = status; }
  if (remarks !== undefined) { updates.push('remarks = @remarks'); params.remarks = remarks; }
  if (uploaded_by !== undefined) { updates.push('uploaded_by = @uploaded_by'); params.uploaded_by = uploaded_by; }
  if (label !== undefined) { updates.push('label = @label'); params.label = label; }
  if (share_with_lender !== undefined) { updates.push('share_with_lender = @share_with_lender'); params.share_with_lender = share_with_lender ? 1 : 0; }
  if (quality !== undefined) { updates.push('quality = @quality'); params.quality = quality; }
  if (status && ['Received', 'Verified'].includes(status)) {
    updates.push("uploaded_at = datetime('now')");
  }
  db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = @docId`).run(params);
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.docId);
  res.json(doc);
});

// POST /api/applications/:id/documents/upload — multipart file upload
router.post('/:id/documents/upload', upload.single('file'), (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { doc_name, doc_category = 'Other', owner = 'Student', label = '' } = req.body;
  const name = doc_name || req.file.originalname;

  const result = db.prepare(`
    INSERT INTO documents (application_id, doc_name, doc_category, owner, status, file_path, file_size, mime_type, label, uploaded_by, uploaded_at)
    VALUES (?, ?, ?, ?, 'Received', ?, ?, ?, ?, 'Staff', datetime('now'))
  `).run(req.params.id, name, doc_category, owner, req.file.filename, req.file.size, req.file.mimetype, label);

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);

  // Log to history
  db.prepare(`
    INSERT INTO status_history (application_id, status, sub_status, awaiting_from, changed_by, entry_type, notes)
    SELECT status, sub_status, awaiting_from, 'Staff', 'docs', '[DOC] Uploaded: ' || ? FROM applications WHERE id = ?
  `).run(name, req.params.id);

  res.status(201).json(doc);
});

// GET /api/applications/:id/documents/:docId/file — serve file for view/download
router.get('/:id/documents/:docId/file', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND application_id = ?').get(req.params.docId, req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!doc.file_path) return res.status(404).json({ error: 'No file attached to this document' });

  const filePath = path.join(UPLOADS_DIR, doc.file_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  const disposition = req.query.download === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disposition}; filename="${doc.doc_name}"`);
  if (doc.mime_type) res.setHeader('Content-Type', doc.mime_type);
  res.sendFile(filePath);
});

// DELETE /api/applications/:id/documents/:docId
router.delete('/:id/documents/:docId', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  db.prepare('DELETE FROM documents WHERE id = ? AND application_id = ?').run(req.params.docId, req.params.id);
  res.json({ message: 'Deleted' });
});

// ─── Co-Applicants sub-routes ───────────────────────────────────────
// GET /api/applications/:id/co-applicants
router.get('/:id/co-applicants', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  const coApps = db.prepare('SELECT * FROM co_applicants WHERE application_id = ? ORDER BY id').all(req.params.id);
  res.json(coApps);
});

// POST /api/applications/:id/co-applicants
router.post('/:id/co-applicants', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  const { name, relation, phone, email, income, employment_type } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare(`
    INSERT INTO co_applicants (application_id, name, relation, phone, email, income, employment_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, name, relation || null, phone || null, email || null, income || null, employment_type || null);
  const co = db.prepare('SELECT * FROM co_applicants WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(co);
});

// PUT /api/applications/:id/co-applicants/:coId
router.put('/:id/co-applicants/:coId', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  const { name, relation, phone, email, income, employment_type } = req.body;
  const updates = [];
  const params = { coId: req.params.coId };
  if (name !== undefined) { updates.push('name = @name'); params.name = name; }
  if (relation !== undefined) { updates.push('relation = @relation'); params.relation = relation; }
  if (phone !== undefined) { updates.push('phone = @phone'); params.phone = phone; }
  if (email !== undefined) { updates.push('email = @email'); params.email = email; }
  if (income !== undefined) { updates.push('income = @income'); params.income = income; }
  if (employment_type !== undefined) { updates.push('employment_type = @employment_type'); params.employment_type = employment_type; }
  if (updates.length) db.prepare(`UPDATE co_applicants SET ${updates.join(', ')} WHERE id = @coId`).run(params);
  const co = db.prepare('SELECT * FROM co_applicants WHERE id = ?').get(req.params.coId);
  res.json(co);
});

// DELETE /api/applications/:id/co-applicants/:coId
router.delete('/:id/co-applicants/:coId', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  db.prepare('DELETE FROM co_applicants WHERE id = ? AND application_id = ?').run(req.params.coId, req.params.id);
  res.json({ message: 'Deleted' });
});

// ─── Pack History sub-routes ───────────────────────────────────────
// GET /api/applications/:id/packs
router.get('/:id/packs', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  const packs = db.prepare('SELECT * FROM pack_history WHERE application_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(packs);
});

// POST /api/applications/:id/packs
router.post('/:id/packs', (req, res) => {
  if (!checkAppAccess(req, res, req.params.id)) return;
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  const { generated_by = 'Staff', sent_via = 'Email', sent_to = '', notes = '' } = req.body;

  // Get doc count
  const docs_count = db.prepare('SELECT COUNT(*) as c FROM documents WHERE application_id = ? AND file_path IS NOT NULL').get(req.params.id).c;

  // Get next version number
  const lastPack = db.prepare('SELECT version FROM pack_history WHERE application_id = ? ORDER BY version DESC LIMIT 1').get(req.params.id);
  const version = (lastPack?.version || 0) + 1;

  const result = db.prepare(`
    INSERT INTO pack_history (application_id, version, generated_by, lender, docs_count, sent_via, sent_to, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, version, generated_by, app.bank, docs_count, sent_via, sent_to, notes);

  // Log to timeline
  db.prepare(`
    INSERT INTO status_history (application_id, status, sub_status, awaiting_from, changed_by, entry_type, notes)
    SELECT id, status, sub_status, awaiting_from, ?, 'packs', ?
    FROM applications WHERE id = ?
  `).run(generated_by, `[PACK] Pack v${version} generated — ${docs_count} docs, via ${sent_via}${sent_to ? ' to ' + sent_to : ''}`, req.params.id);

  const pack = db.prepare('SELECT * FROM pack_history WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(pack);
});

export default router;
