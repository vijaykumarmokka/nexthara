import { Router } from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const multer = require('multer');

const STUDENT_JWT_SECRET = process.env.STUDENT_JWT_SECRET || 'student_secret_nexthara_2026';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /pdf|jpg|jpeg|png|heic|gif/i.test(path.extname(file.originalname).slice(1));
    cb(null, ok);
  },
});

// ─── Student-friendly status mapping ─────────────────────────────────────────
const STUDENT_STATUS_MAP = {
  NOT_CONNECTED:            { stage: 'STARTED',        label: 'Started',           desc: "We've opened your case. Next: upload required documents.",         color: 'info' },
  CONTACTED:                { stage: 'STARTED',        label: 'Started',           desc: "Our team is reviewing your details to start processing.",          color: 'info' },
  YET_TO_CONNECT:           { stage: 'STARTED',        label: 'Started',           desc: "We'll connect with you soon. Upload documents to speed up.",       color: 'info' },
  LOGIN_SUBMITTED:          { stage: 'SENT_TO_BANK',   label: 'Sent to bank',      desc: "We submitted your details to the bank to start the process.",      color: 'progress' },
  LOGIN_IN_PROGRESS:        { stage: 'SENT_TO_BANK',   label: 'Sent to bank',      desc: "Bank has started processing your application.",                    color: 'progress' },
  DOCS_SUBMITTED:           { stage: 'SENT_TO_BANK',   label: 'Sent to bank',      desc: "Your documents were submitted to the bank.",                       color: 'progress' },
  DOCS_VERIFICATION:        { stage: 'BANK_REVIEWING', label: 'Bank reviewing',    desc: "Bank is verifying your documents.",                                color: 'progress' },
  UNDER_REVIEW:             { stage: 'BANK_REVIEWING', label: 'Bank reviewing',    desc: "Bank is reviewing your application.",                              color: 'progress' },
  CREDIT_CHECK_IN_PROGRESS: { stage: 'BANK_REVIEWING', label: 'Bank reviewing',    desc: "Bank is doing eligibility/credit review.",                         color: 'progress' },
  FIELD_VERIFICATION:       { stage: 'BANK_REVIEWING', label: 'Bank reviewing',    desc: "Bank verification is in progress.",                                color: 'progress' },
  DOCS_PENDING:             { stage: 'DOCS_NEEDED',    label: 'Documents needed',  desc: "We need a few documents to continue. Upload them here.",            color: 'action' },
  QUERY_RAISED:             { stage: 'DOCS_NEEDED',    label: 'Documents needed',  desc: "Bank requested additional documents/clarification.",               color: 'action' },
  CONDITIONAL_SANCTION:     { stage: 'DECISION_READY', label: 'Decision ready',    desc: "Bank is ready with an offer, subject to conditions.",              color: 'success' },
  SANCTIONED:               { stage: 'DECISION_READY', label: 'Decision ready',    desc: "Great news — bank has approved the loan offer.",                   color: 'success' },
  SANCTION_ACCEPTED:        { stage: 'DECISION_READY', label: 'Offer accepted',    desc: "You accepted the offer. Next: agreement and disbursement.",         color: 'success' },
  AGREEMENT_SIGNED:         { stage: 'BANK_REVIEWING', label: 'Agreement stage',   desc: "Agreement signed. Next: bank disbursement process.",               color: 'progress' },
  DISBURSEMENT_PENDING:     { stage: 'BANK_REVIEWING', label: 'Disbursement stage',desc: "Bank is preparing disbursement.",                                  color: 'progress' },
  DISBURSED:                { stage: 'COMPLETED',      label: 'Completed',         desc: "Loan disbursed successfully.",                                     color: 'success' },
  LOGIN_REJECTED:           { stage: 'NOT_APPROVED',   label: 'Not approved',      desc: "Bank could not proceed at login stage. We'll suggest alternatives.",color: 'reject' },
  REJECTED:                 { stage: 'NOT_APPROVED',   label: 'Not approved',      desc: "Bank could not approve. We'll suggest other options.",              color: 'reject' },
  ALREADY_PROCESSED:        { stage: 'NOT_APPROVED',   label: 'Not approved',      desc: "This bank shows the application exists from another source.",       color: 'reject' },
  CLOSED:                   { stage: 'COMPLETED',      label: 'Closed',            desc: "Your case is closed as completed/finished.",                       color: 'success' },
  DROPPED:                  { stage: 'ON_HOLD',        label: 'On hold',           desc: "Case paused/dropped. Contact support to restart.",                 color: 'reject' },
  EXPIRED:                  { stage: 'ON_HOLD',        label: 'On hold',           desc: "Case expired due to inactivity. You can restart anytime.",         color: 'reject' },
};

const STAGE_PROGRESS = {
  STARTED: 10, DOCS_NEEDED: 25, SENT_TO_BANK: 40,
  BANK_REVIEWING: 60, DECISION_READY: 80, COMPLETED: 100,
  NOT_APPROVED: 0, ON_HOLD: 0,
};

function mapStatus(status) {
  return STUDENT_STATUS_MAP[status] || { stage: 'STARTED', label: 'In progress', desc: "Your case is being processed.", color: 'info' };
}

function getHelpText(docName) {
  const hints = [
    ['Offer Letter', 'Required to confirm your university admission'],
    ['Admission Letter', 'Proof of admission from the university'],
    ['Passport', 'Valid passport for identity verification'],
    ['Aadhar', 'Government ID for KYC'],
    ['PAN Card', 'Required for financial processing'],
    ['ITR', 'Used to verify co-applicant income'],
    ['Bank Statement', 'Shows financial history (last 6 months)'],
    ['Salary Slip', 'Proof of regular income for co-applicant'],
    ['Property', 'Required if collateral loan is applied'],
  ];
  for (const [key, val] of hints) {
    if (docName?.includes(key)) return val;
  }
  return 'Required document for loan processing.';
}

function formatTimelineMsg(h, bank) {
  if (h.entry_type === 'docs') {
    const docName = h.notes?.replace('[DOC] Uploaded: ', '') || 'a document';
    return `You uploaded ${docName}`;
  }
  if (h.entry_type === 'query') return `${bank} requested additional information`;
  const mapped = mapStatus(h.status);
  return mapped.desc || `Updated to ${mapped.label}`;
}

// ─── Student auth middleware ──────────────────────────────────────────────────
function requireStudentAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.student = jwt.verify(header.slice(7), STUDENT_JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

const router = Router();

// ─── OTP Auth ─────────────────────────────────────────────────────────────────

// POST /api/student/auth/otp/request
router.post('/auth/otp/request', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  // Find app by phone (flexible match)
  const digits = phone.replace(/\D/g, '').slice(-10);
  const app = db.prepare(`SELECT id, student_name FROM applications WHERE student_phone LIKE ? LIMIT 1`).get(`%${digits}%`);
  if (!app) return res.status(404).json({ error: 'No application found for this phone number. Please contact Nexthara support.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare(`DELETE FROM student_auth_sessions WHERE phone_e164 = ?`).run(phone);
  db.prepare(`INSERT INTO student_auth_sessions (phone_e164, otp_hash, expires_at) VALUES (?, ?, ?)`).run(phone, otp, expiresAt);

  res.json({
    success: true,
    name: app.student_name.split(' ')[0],
    dev_otp: otp, // DEV ONLY — remove / hide in production
  });
});

// POST /api/student/auth/otp/verify
router.post('/auth/otp/verify', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  const session = db.prepare(`
    SELECT * FROM student_auth_sessions
    WHERE phone_e164 = ? AND otp_hash = ? AND is_used = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(phone, otp.trim());

  if (!session) return res.status(401).json({ error: 'Invalid OTP. Please try again.' });
  if (new Date(session.expires_at) < new Date()) return res.status(401).json({ error: 'OTP expired. Please request a new one.' });

  db.prepare(`UPDATE student_auth_sessions SET is_used = 1 WHERE id = ?`).run(session.id);

  const digits = phone.replace(/\D/g, '').slice(-10);
  const apps = db.prepare(`SELECT id, student_name FROM applications WHERE student_phone LIKE ? ORDER BY created_at DESC`).all(`%${digits}%`);

  const token = jwt.sign(
    { phone, student_name: apps[0]?.student_name || 'Student', app_ids: apps.map(a => a.id), role: 'student' },
    STUDENT_JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, student: { name: apps[0]?.student_name || 'Student', phone } });
});

// All routes below require student auth
router.use(requireStudentAuth);

// ─── Case endpoints ───────────────────────────────────────────────────────────

// GET /api/student/case
router.get('/case', (req, res) => {
  const { app_ids } = req.student;
  if (!app_ids?.length) return res.json([]);
  const placeholders = app_ids.map(() => '?').join(',');
  const apps = db.prepare(`SELECT * FROM applications WHERE id IN (${placeholders}) ORDER BY created_at DESC`).all(...app_ids);
  res.json(apps.map(app => {
    const m = mapStatus(app.status);
    return { id: app.id, bank: app.bank, university: app.university, course: app.course,
      country: app.country, intake: app.intake, stage: m.stage, stage_label: m.label,
      stage_desc: m.desc, stage_color: m.color, progress_percent: STAGE_PROGRESS[m.stage] || 10,
      awaiting_from: app.awaiting_from, updated_at: app.updated_at };
  }));
});

// GET /api/student/case/:caseId/dashboard
router.get('/case/:caseId/dashboard', (req, res) => {
  const { app_ids } = req.student;
  if (!app_ids.includes(req.params.caseId)) return res.status(403).json({ error: 'Forbidden' });
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.caseId);
  if (!app) return res.status(404).json({ error: 'Not found' });

  const docs = db.prepare('SELECT * FROM documents WHERE application_id = ?').all(req.params.caseId);
  const pendingDocs = docs.filter(d => ['Missing', 'Invalid'].includes(d.status));
  const receivedDocs = docs.filter(d => ['Received', 'Verified'].includes(d.status)).length;
  const m = mapStatus(app.status);

  let next_action = null;
  if (pendingDocs.length > 0) {
    next_action = { title: `Upload ${pendingDocs[0].doc_name}`, cta: 'Upload Now', tab: 'documents' };
  } else if (app.awaiting_from === 'Student') {
    next_action = { title: 'Action needed from you', cta: 'View Details', tab: 'status' };
  }

  res.json({
    student: { name: app.student_name },
    case: {
      case_ref: app.id, bank: app.bank, university: app.university,
      course: app.course, country: app.country, intake: app.intake,
      loan_amount_requested: app.loan_amount_requested,
      stage: m.stage, stage_label: m.label, stage_desc: m.desc, stage_color: m.color,
      progress_percent: STAGE_PROGRESS[m.stage] || 10,
      awaiting_from: app.awaiting_from,
      pending_docs_count: pendingDocs.length,
      total_docs_count: docs.length,
      received_docs_count: receivedDocs,
      last_update_at: app.updated_at,
      next_action,
    },
  });
});

// GET /api/student/case/:caseId/documents
router.get('/case/:caseId/documents', (req, res) => {
  const { app_ids } = req.student;
  if (!app_ids.includes(req.params.caseId)) return res.status(403).json({ error: 'Forbidden' });

  const docs = db.prepare('SELECT * FROM documents WHERE application_id = ? ORDER BY doc_category, doc_name').all(req.params.caseId);
  const CAT_ORDER = ['Admission Documents', 'Student KYC', 'Co-applicant KYC', 'Financial / Income', 'Bank Statements', 'Collateral', 'Other'];
  const groups = {};

  for (const doc of docs) {
    const cat = doc.doc_category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({
      id: doc.id, doc_name: doc.doc_name, doc_category: doc.doc_category,
      owner: doc.owner, status: doc.status, has_file: !!doc.file_path,
      file_size: doc.file_size, mime_type: doc.mime_type,
      remarks: doc.status === 'Invalid' ? doc.remarks : null,
      uploaded_at: doc.uploaded_at, help_text: getHelpText(doc.doc_name),
    });
  }

  const result = [...CAT_ORDER.filter(c => groups[c]).map(c => ({ group: c, items: groups[c] })),
    ...Object.keys(groups).filter(c => !CAT_ORDER.includes(c)).map(c => ({ group: c, items: groups[c] }))];

  res.json({ groups: result });
});

// GET /api/student/case/:caseId/checklist — student-visible checklist items
router.get('/case/:caseId/checklist', (req, res) => {
  const { app_ids } = req.student;
  if (!app_ids.includes(req.params.caseId)) return res.status(403).json({ error: 'Forbidden' });

  try {
    const items = db.prepare(`
      SELECT c.id, c.doc_code, c.doc_name, c.status, c.requirement_level,
             c.owner_entity_type, c.remarks, c.due_at, c.uploaded_at, c.verified_at,
             d.description as help_text, d.file_rules,
             ca.name as coapp_name, ca.coapp_type as coapp_type_val
      FROM case_document_checklist_items c
      LEFT JOIN document_master d ON d.doc_code = c.doc_code AND d.visible_to_student = 1
      LEFT JOIN co_applicants ca ON ca.id = CAST(c.owner_entity_id AS INTEGER) AND c.owner_entity_type = 'COAPPLICANT'
      WHERE c.case_id = ? AND c.status != 'WAIVED'
      ORDER BY c.owner_entity_type, c.requirement_level DESC, c.doc_name ASC
    `).all(req.params.caseId);

    // Group by owner entity
    const groups = {};
    for (const item of items) {
      let groupKey;
      if (item.owner_entity_type === 'STUDENT')      groupKey = 'Student Documents';
      else if (item.owner_entity_type === 'COAPPLICANT') groupKey = item.coapp_name ? `Co-Applicant: ${item.coapp_name}` : 'Co-Applicant';
      else if (item.owner_entity_type === 'COLLATERAL')  groupKey = 'Collateral Documents';
      else groupKey = 'Other';
      if (!groups[groupKey]) groups[groupKey] = { group: groupKey, items: [] };
      groups[groupKey].items.push(item);
    }

    const required_total = items.filter(i => i.requirement_level === 'REQUIRED').length;
    const required_done  = items.filter(i => i.requirement_level === 'REQUIRED' && ['VERIFIED','UPLOADED'].includes(i.status)).length;

    res.json({
      summary: { required_total, required_done, progress_pct: required_total ? Math.round((required_done / required_total) * 100) : 0 },
      groups: Object.values(groups),
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/student/case/:caseId/documents/upload
router.post('/case/:caseId/documents/upload', upload.single('file'), (req, res) => {
  const { app_ids } = req.student;
  if (!app_ids.includes(req.params.caseId)) return res.status(403).json({ error: 'Forbidden' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { doc_id, doc_name, doc_category = 'Other', checklist_item_id } = req.body;
  const caseId = req.params.caseId;

  // Step 1 — Insert or update the document record
  let documentRow;
  if (doc_id) {
    db.prepare(`
      UPDATE documents SET status = 'Received', file_path = ?, file_size = ?, mime_type = ?,
      uploaded_by = 'Student', uploaded_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND application_id = ?
    `).run(req.file.filename, req.file.size, req.file.mimetype, doc_id, caseId);
    documentRow = db.prepare('SELECT * FROM documents WHERE id = ?').get(doc_id);
  } else {
    const result = db.prepare(`
      INSERT INTO documents (application_id, doc_name, doc_category, owner, status, file_path, file_size, mime_type, uploaded_by, uploaded_at)
      VALUES (?, ?, ?, 'Student', 'Received', ?, ?, ?, 'Student', datetime('now'))
    `).run(caseId, doc_name || req.file.originalname, doc_category, req.file.filename, req.file.size, req.file.mimetype);
    documentRow = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  }

  // Step 2 — Find matching checklist item (by explicit id, doc_id, or doc_name match)
  let checklistItem = null;
  if (checklist_item_id) {
    checklistItem = db.prepare('SELECT * FROM case_document_checklist_items WHERE id = ? AND case_id = ?').get(checklist_item_id, caseId);
  } else if (doc_id) {
    // Try to find checklist item linked to this doc
    const docName = documentRow?.doc_name;
    if (docName) {
      checklistItem = db.prepare(`SELECT * FROM case_document_checklist_items WHERE case_id = ? AND doc_name = ? AND status IN ('PENDING','REQUESTED') LIMIT 1`).get(caseId, docName);
    }
  } else if (doc_name) {
    checklistItem = db.prepare(`SELECT * FROM case_document_checklist_items WHERE case_id = ? AND doc_name = ? AND status IN ('PENDING','REQUESTED') LIMIT 1`).get(caseId, doc_name);
  }

  // Step 3 — Update checklist item status to UPLOADED
  if (checklistItem) {
    db.prepare(`UPDATE case_document_checklist_items SET status = 'UPLOADED', uploaded_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(checklistItem.id);
  }

  // Step 4 — Log timeline entry
  try {
    db.prepare(`
      INSERT INTO status_history (application_id, status, sub_status, awaiting_from, changed_by, entry_type, notes)
      SELECT id, status, sub_status, awaiting_from, 'Student Portal', 'docs', ?
      FROM applications WHERE id = ?
    `).run(`[DOC] Student uploaded: ${documentRow?.doc_name || req.file.originalname}`, caseId);
  } catch(e) {}

  // Step 5 — Check if any query is now resolved (if the checklist item was query-linked)
  if (checklistItem?.required_by === 'BANK') {
    try {
      // Mark any open query linked to this checklist item as potentially resolvable
      const pendingQuery = db.prepare(`SELECT id FROM bank_queries WHERE bank_application_id IN (SELECT id FROM bank_applications WHERE case_id = ?) AND status = 'OPEN' LIMIT 1`).get(caseId);
      if (pendingQuery) {
        // Don't auto-close — just add a note that student uploaded
        db.prepare(`UPDATE bank_applications SET updated_at = datetime('now') WHERE case_id = ?`).run(caseId);
      }
    } catch(e) {}
  }

  res.status(201).json({ document: documentRow, checklist_updated: !!checklistItem });
});

// GET /api/student/case/:caseId/lenders
router.get('/case/:caseId/lenders', (req, res) => {
  const { app_ids } = req.student;
  if (!app_ids.includes(req.params.caseId)) return res.status(403).json({ error: 'Forbidden' });
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.caseId);
  if (!app) return res.status(404).json({ error: 'Not found' });

  const m = mapStatus(app.status);
  res.json([{
    bank: app.bank, stage: m.stage, stage_label: m.label, stage_desc: m.desc,
    stage_color: m.color, action_required: app.awaiting_from === 'Student',
    awaiting_from: app.awaiting_from, last_update: app.updated_at,
    offer: ['DECISION_READY', 'COMPLETED'].includes(m.stage) ? {
      sanction_amount: app.sanction_amount, roi: app.roi,
      tenure: app.tenure, processing_fee: app.processing_fee,
    } : null,
  }]);
});

// GET /api/student/case/:caseId/timeline
router.get('/case/:caseId/timeline', (req, res) => {
  const { app_ids } = req.student;
  if (!app_ids.includes(req.params.caseId)) return res.status(403).json({ error: 'Forbidden' });
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.caseId);
  if (!app) return res.status(404).json({ error: 'Not found' });

  const history = db.prepare(`
    SELECT * FROM status_history WHERE application_id = ?
    AND entry_type IN ('status', 'docs', 'query')
    ORDER BY created_at DESC LIMIT 30
  `).all(req.params.caseId);

  res.json(history.map(h => ({
    id: h.id, event_type: h.entry_type,
    message: formatTimelineMsg(h, app.bank),
    created_at: h.created_at,
  })));
});

// GET /api/student/case/:caseId/notifications
router.get('/case/:caseId/notifications', (req, res) => {
  const { app_ids } = req.student;
  if (!app_ids.includes(req.params.caseId)) return res.status(403).json({ error: 'Forbidden' });
  const notifs = db.prepare(`SELECT * FROM student_notifications WHERE case_id = ? ORDER BY created_at DESC LIMIT 30`).all(req.params.caseId);
  res.json(notifs);
});

// GET /api/student/case/:caseId/offers
router.get('/case/:caseId/offers', (req, res) => {
  const { app_ids } = req.student;
  if (!app_ids.includes(req.params.caseId)) return res.status(403).json({ error: 'Forbidden' });
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.caseId);
  if (!app) return res.status(404).json({ error: 'Not found' });
  const m = mapStatus(app.status);
  if (!['DECISION_READY', 'COMPLETED'].includes(m.stage)) return res.json([]);

  res.json([{
    bank: app.bank, sanction_amount: app.sanction_amount, roi: app.roi,
    tenure: app.tenure, processing_fee: app.processing_fee,
    stage: m.stage, stage_label: m.label,
  }]);
});

export default router;
