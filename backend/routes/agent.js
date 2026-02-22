import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import db from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// ─── Agent Auth Middleware ────────────────────────────────────────────────────

function requireAgentAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.portal !== 'agent') return res.status(401).json({ error: 'Invalid agent token' });
    req.agentUser = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.agentUser?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Returns orgId for filtering, or null if platform admin (sees all)
function getOrgId(req) {
  if (req.agentUser?.role === 'NEXTHARA_PLATFORM_ADMIN') return null;
  return req.agentUser?.organization_id;
}

// ─── Public Auth Routes ───────────────────────────────────────────────────────

// POST /agent/auth/register-org  (first-time org onboarding)
router.post('/auth/register-org', (req, res) => {
  const { org_name, legal_name, gstin, admin_name, admin_email, admin_phone, admin_password, branch_name, branch_city } = req.body;
  if (!org_name || !admin_name || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'org_name, admin_name, admin_email, admin_password required' });
  }
  const existing = db.prepare('SELECT id FROM agent_users WHERE email = ?').get(admin_email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const orgId = nanoid();
  const branchId = nanoid();
  const userId = nanoid();
  const hash = bcrypt.hashSync(admin_password, 10);

  db.transaction(() => {
    db.prepare('INSERT INTO organizations (id, name, legal_name, gstin) VALUES (?, ?, ?, ?)').run(orgId, org_name, legal_name || null, gstin || null);
    db.prepare('INSERT INTO branches (id, organization_id, name, city) VALUES (?, ?, ?, ?)').run(branchId, orgId, branch_name || 'Head Office', branch_city || null);
    db.prepare('INSERT INTO agent_users (id, organization_id, branch_id, name, email, phone_e164, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, \'ORG_OWNER\')').run(userId, orgId, branchId, admin_name, admin_email, admin_phone || null, hash);
  })();

  res.status(201).json({ message: 'Organization registered successfully', organization_id: orgId });
});

// POST /agent/auth/login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare(`
    SELECT au.*, o.name as org_name, o.status as org_status
    FROM agent_users au
    JOIN organizations o ON o.id = au.organization_id
    WHERE au.email = ? AND au.is_active = 1
  `).get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.org_status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Organization suspended. Contact Nexthara support.' });
  }

  db.prepare('UPDATE agent_users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);

  const payload = {
    portal: 'agent',
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
    org_name: user.org_name,
    branch_id: user.branch_id,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: payload });
});

// ─── Apply agent auth to all subsequent routes ────────────────────────────────

router.use(requireAgentAuth);

router.get('/auth/me', (req, res) => res.json(req.agentUser));

// ─── Dashboard ────────────────────────────────────────────────────────────────

router.get('/dashboard', (req, res) => {
  const orgId = getOrgId(req);
  const orgP = orgId ? [orgId] : [];
  const orgW = orgId ? 'WHERE organization_id = ?' : '';
  const andOrW = orgId ? 'WHERE organization_id = ? AND' : 'WHERE';

  const totalLeads   = db.prepare(`SELECT COUNT(*) as c FROM agent_leads ${orgW}`).get(...orgP).c;
  const activeLeads  = db.prepare(`SELECT COUNT(*) as c FROM agent_leads ${andOrW} stage NOT IN ('CASE_CREATED','DROPPED','LOST','DUPLICATE')`).get(...orgP).c;
  const casesCreated = db.prepare(`SELECT COUNT(*) as c FROM agent_leads ${andOrW} internal_case_id IS NOT NULL`).get(...orgP).c;

  const commW  = orgId ? 'WHERE organization_id = ?' : '';
  const commAW = orgId ? 'WHERE organization_id = ? AND' : 'WHERE';
  const totalCommPaise = db.prepare(`SELECT COALESCE(SUM(commission_amount_paise),0) as t FROM commissions ${commW}`).get(...orgP).t;
  const paidCommPaise  = db.prepare(`SELECT COALESCE(SUM(commission_amount_paise),0) as t FROM commissions ${commAW} status = 'PAID'`).get(...orgP).t;

  const STAGES = ['NEW','CONTACT_ATTEMPTED','CONNECTED','QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED'];
  const funnel = STAGES.map(stage => ({
    stage,
    count: db.prepare(`SELECT COUNT(*) as c FROM agent_leads ${andOrW} stage = ?`).get(...orgP, stage).c,
  }));

  const recentLeads = db.prepare(`
    SELECT id, full_name, phone_e164, stage, created_at
    FROM agent_leads ${orgW} ORDER BY created_at DESC LIMIT 10
  `).all(...orgP);

  const overdueLeads = db.prepare(`
    SELECT id, full_name, phone_e164, stage, updated_at
    FROM agent_leads ${andOrW} stage NOT IN ('CASE_CREATED','DROPPED','LOST','DUPLICATE')
    ORDER BY updated_at ASC LIMIT 10
  `).all(...orgP);

  res.json({
    kpis: { totalLeads, activeLeads, casesCreated, totalCommPaise, paidCommPaise },
    funnel,
    recentLeads,
    overdueLeads,
  });
});

// ─── Leads ────────────────────────────────────────────────────────────────────

router.get('/leads', (req, res) => {
  const orgId = getOrgId(req);
  const { search, stage, page = 1, limit = 30 } = req.query;
  const conds = [];
  const params = [];
  if (orgId)  { conds.push('organization_id = ?');                            params.push(orgId); }
  if (stage)  { conds.push('stage = ?');                                      params.push(stage); }
  if (search) { conds.push('(full_name LIKE ? OR phone_e164 LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const where  = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const total  = db.prepare(`SELECT COUNT(*) as c FROM agent_leads ${where}`).get(...params).c;
  const data   = db.prepare(`SELECT * FROM agent_leads ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.post('/leads', (req, res) => {
  const orgId = getOrgId(req) || req.body.organization_id;
  const { full_name, phone_e164, email, city, country, course, university, intake, loan_amount_paise, source, notes } = req.body;
  if (!full_name || !phone_e164) return res.status(400).json({ error: 'full_name and phone_e164 required' });
  const id = nanoid();
  db.prepare(`
    INSERT INTO agent_leads (id, organization_id, branch_id, submitted_by, full_name, phone_e164, email, city, country, course, university, intake, loan_amount_paise, source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, orgId, req.agentUser.branch_id || null, req.agentUser.id, full_name, phone_e164, email || null, city || null, country || null, course || null, university || null, intake || null, loan_amount_paise || null, source || 'AGENT_SUBMITTED', notes || null);
  db.prepare(`INSERT INTO agent_audit_log (organization_id, actor_id, action, entity_type, entity_id) VALUES (?, ?, 'CREATE_LEAD', 'agent_lead', ?)`).run(orgId, req.agentUser.id, id);
  res.status(201).json(db.prepare('SELECT * FROM agent_leads WHERE id = ?').get(id));
});

router.get('/leads/:id', (req, res) => {
  const orgId = getOrgId(req);
  const lead = db.prepare('SELECT * FROM agent_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (orgId && lead.organization_id !== orgId) return res.status(403).json({ error: 'Access denied' });
  const notes = db.prepare('SELECT * FROM agent_lead_notes WHERE agent_lead_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...lead, notes });
});

router.patch('/leads/:id', (req, res) => {
  const orgId = getOrgId(req);
  const lead = db.prepare('SELECT * FROM agent_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (orgId && lead.organization_id !== orgId) return res.status(403).json({ error: 'Access denied' });
  const allowed = ['stage','priority','notes','email','city','country','course','university','intake','loan_amount_paise','internal_case_id','internal_lead_id'];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (req.body[k] !== undefined) { sets.push(`${k} = ?`); vals.push(req.body[k]); }
  }
  if (!sets.length) return res.status(400).json({ error: 'No updatable fields provided' });
  sets.push('updated_at = datetime(\'now\')');
  db.prepare(`UPDATE agent_leads SET ${sets.join(', ')} WHERE id = ?`).run(...vals, req.params.id);
  res.json(db.prepare('SELECT * FROM agent_leads WHERE id = ?').get(req.params.id));
});

router.post('/leads/:id/note', (req, res) => {
  const orgId = getOrgId(req);
  const lead = db.prepare('SELECT * FROM agent_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (orgId && lead.organization_id !== orgId) return res.status(403).json({ error: 'Access denied' });
  const { note_text } = req.body;
  if (!note_text?.trim()) return res.status(400).json({ error: 'note_text required' });
  const id = nanoid();
  db.prepare(`INSERT INTO agent_lead_notes (id, agent_lead_id, agent_user_id, agent_user_name, note_text) VALUES (?, ?, ?, ?, ?)`).run(id, req.params.id, req.agentUser.id, req.agentUser.name, note_text.trim());
  db.prepare(`UPDATE agent_leads SET updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.status(201).json(db.prepare('SELECT * FROM agent_lead_notes WHERE id = ?').get(id));
});

// POST /agent/leads/:id/convert-to-case
router.post('/leads/:id/convert-to-case', (req, res) => {
  const orgId = getOrgId(req);
  const lead = db.prepare('SELECT * FROM agent_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (orgId && lead.organization_id !== orgId) return res.status(403).json({ error: 'Access denied' });
  if (lead.internal_case_id) return res.status(409).json({ error: 'Lead is already linked to a case' });
  if (['DROPPED','LOST','DUPLICATE'].includes(lead.stage)) return res.status(400).json({ error: 'Cannot convert a dropped/lost/duplicate lead' });

  const { bank, loan_amount_requested, notes } = req.body;
  if (!bank) return res.status(400).json({ error: 'bank is required' });

  const caseId = nanoid();
  const now = new Date().toISOString();

  db.transaction(() => {
    // Create the application record
    db.prepare(`
      INSERT INTO applications (id, student_name, student_email, student_phone, country, university, course, intake,
        bank, loan_amount_requested, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'LEAD_CONVERTED', ?, ?)
    `).run(
      caseId,
      lead.full_name,
      lead.email || 'N/A',
      lead.phone_e164 || null,
      lead.country || null,
      lead.university || 'N/A',
      lead.course || 'N/A',
      lead.intake || null,
      bank,
      loan_amount_requested ? Number(loan_amount_requested) : (lead.loan_amount_paise ? lead.loan_amount_paise / 100 : null),
      now, now
    );

    // Initial status history entry
    db.prepare(`
      INSERT INTO status_history (application_id, status, changed_by, notes, created_at)
      VALUES (?, 'LEAD_CONVERTED', ?, ?, ?)
    `).run(caseId, req.agentUser.name, notes || 'Converted from agent lead', now);

    // Link lead → case and move to CASE_CREATED
    db.prepare(`
      UPDATE agent_leads SET internal_case_id = ?, stage = 'CASE_CREATED', updated_at = datetime('now') WHERE id = ?
    `).run(caseId, req.params.id);

    // Audit log
    db.prepare(`
      INSERT INTO agent_audit_log (organization_id, actor_id, action, entity_type, entity_id, created_at)
      VALUES (?, ?, 'CONVERT_TO_CASE', 'agent_lead', ?, ?)
    `).run(lead.organization_id, req.agentUser.id, req.params.id, now);
  })();

  const updatedLead = db.prepare('SELECT * FROM agent_leads WHERE id = ?').get(req.params.id);
  res.status(201).json({ case_id: caseId, lead: updatedLead });
});

// ─── Cases (applications linked to org's leads) ───────────────────────────────

router.get('/cases', (req, res) => {
  const orgId = getOrgId(req);
  const { search, status, page = 1, limit = 30 } = req.query;
  const conds = ['al.internal_case_id IS NOT NULL'];
  const params = [];
  if (orgId)  { conds.push('al.organization_id = ?'); params.push(orgId); }
  if (status) { conds.push('a.status = ?');           params.push(status); }
  if (search) { conds.push('(al.full_name LIKE ? OR a.student_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const where  = `WHERE ${conds.join(' AND ')}`;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const total  = db.prepare(`SELECT COUNT(*) as c FROM agent_leads al LEFT JOIN applications a ON a.id = al.internal_case_id ${where}`).get(...params).c;
  const data   = db.prepare(`
    SELECT al.id as agent_lead_id, al.full_name, al.phone_e164,
           a.id as case_id, a.student_name, a.bank, a.university, a.course,
           a.status, a.sub_status, a.awaiting_from, a.loan_amount_requested,
           a.sanction_amount, a.created_at as case_created_at
    FROM agent_leads al
    LEFT JOIN applications a ON a.id = al.internal_case_id
    ${where}
    ORDER BY al.updated_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  res.json({ data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.get('/cases/:id', (req, res) => {
  const orgId = getOrgId(req);
  const lead = orgId
    ? db.prepare('SELECT * FROM agent_leads WHERE internal_case_id = ? AND organization_id = ?').get(req.params.id, orgId)
    : db.prepare('SELECT * FROM agent_leads WHERE internal_case_id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Case not found or access denied' });
  const appCase = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!appCase) return res.status(404).json({ error: 'Application not found' });
  const commission = db.prepare('SELECT * FROM commissions WHERE case_id = ? AND organization_id = ?').get(req.params.id, lead.organization_id);
  const history = db.prepare('SELECT * FROM status_history WHERE application_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ ...appCase, history, commission, agent_lead: lead });
});

// ─── Bank Applications (per case) ─────────────────────────────────────────────

router.get('/bank-apps', (req, res) => {
  const orgId = getOrgId(req);
  const { status, page = 1, limit = 30 } = req.query;
  const conds = ['al.internal_case_id IS NOT NULL'];
  const params = [];
  if (orgId)  { conds.push('al.organization_id = ?'); params.push(orgId); }
  if (status) { conds.push('a.status = ?');           params.push(status); }
  const where  = `WHERE ${conds.join(' AND ')}`;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const total  = db.prepare(`SELECT COUNT(*) as c FROM agent_leads al LEFT JOIN applications a ON a.id = al.internal_case_id ${where}`).get(...params).c;
  const data   = db.prepare(`
    SELECT al.id as agent_lead_id, al.full_name, al.phone_e164,
           a.id as app_id, a.bank, a.status, a.sub_status, a.awaiting_from,
           a.loan_amount_requested, a.sanction_amount, a.bank_application_ref,
           a.sla_days, a.priority, a.created_at
    FROM agent_leads al
    LEFT JOIN applications a ON a.id = al.internal_case_id
    ${where}
    ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  res.json({ data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// ─── Students ─────────────────────────────────────────────────────────────────

router.get('/students', (req, res) => {
  const orgId = getOrgId(req);
  const { search, page = 1, limit = 30 } = req.query;
  const conds = [];
  const params = [];
  if (orgId)  { conds.push('organization_id = ?'); params.push(orgId); }
  if (search) { conds.push('(full_name LIKE ? OR phone_e164 LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const where  = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const total  = db.prepare(`SELECT COUNT(*) as c FROM agent_leads ${where}`).get(...params).c;
  const data   = db.prepare(`
    SELECT id, full_name, phone_e164, email, city, country, course, university,
           intake, loan_amount_paise, stage, internal_case_id, created_at
    FROM agent_leads ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  res.json({ data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.get('/students/:id', (req, res) => {
  const orgId = getOrgId(req);
  const lead = db.prepare('SELECT * FROM agent_leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Student not found' });
  if (orgId && lead.organization_id !== orgId) return res.status(403).json({ error: 'Access denied' });
  const notes = db.prepare('SELECT * FROM agent_lead_notes WHERE agent_lead_id = ? ORDER BY created_at DESC').all(req.params.id);
  const commission = lead.internal_case_id ? db.prepare('SELECT * FROM commissions WHERE case_id = ?').get(lead.internal_case_id) : null;
  const caseData = lead.internal_case_id ? db.prepare('SELECT id, bank, status, sub_status, loan_amount_requested, sanction_amount FROM applications WHERE id = ?').get(lead.internal_case_id) : null;
  res.json({ ...lead, notes, commission, case: caseData });
});

// ─── Commissions ──────────────────────────────────────────────────────────────

router.get('/commissions', (req, res) => {
  const orgId = getOrgId(req);
  const { status, page = 1, limit = 30 } = req.query;
  const conds = [];
  const params = [];
  if (orgId)  { conds.push('c.organization_id = ?'); params.push(orgId); }
  if (status) { conds.push('c.status = ?');          params.push(status); }
  const where  = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const total  = db.prepare(`SELECT COUNT(*) as c FROM commissions c ${where}`).get(...params).c;
  const data   = db.prepare(`
    SELECT c.*, al.full_name as student_name, al.phone_e164
    FROM commissions c
    LEFT JOIN agent_leads al ON al.id = c.agent_lead_id
    ${where}
    ORDER BY c.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  const totP = [...params];
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(commission_amount_paise), 0) as total_paise,
      COALESCE(SUM(CASE WHEN status = 'PAID'    THEN commission_amount_paise ELSE 0 END), 0) as paid_paise,
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN commission_amount_paise ELSE 0 END), 0) as pending_paise,
      COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN commission_amount_paise ELSE 0 END), 0) as confirmed_paise
    FROM commissions ${orgId ? 'WHERE organization_id = ?' : ''}
  `).get(...(orgId ? [orgId] : []));
  res.json({ data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), totals });
});

router.get('/commissions/:id', (req, res) => {
  const orgId = getOrgId(req);
  const comm = db.prepare(`
    SELECT c.*, al.full_name as student_name, al.phone_e164
    FROM commissions c LEFT JOIN agent_leads al ON al.id = c.agent_lead_id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!comm) return res.status(404).json({ error: 'Commission not found' });
  if (orgId && comm.organization_id !== orgId) return res.status(403).json({ error: 'Access denied' });
  res.json(comm);
});

// ─── Reports ──────────────────────────────────────────────────────────────────

router.get('/reports', (req, res) => {
  const orgId = getOrgId(req);
  const orgP  = orgId ? [orgId] : [];
  const orgW  = orgId ? 'WHERE organization_id = ?' : '';

  const leadsByStage = db.prepare(`SELECT stage, COUNT(*) as count FROM agent_leads ${orgW} GROUP BY stage`).all(...orgP);
  const leadsByMonth = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM agent_leads ${orgW} GROUP BY month ORDER BY month DESC LIMIT 12
  `).all(...orgP);
  const conversionRate = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN internal_case_id IS NOT NULL THEN 1 ELSE 0 END) as converted
    FROM agent_leads ${orgW}
  `).get(...orgP);
  const commByStatus = db.prepare(`
    SELECT status, COUNT(*) as count, COALESCE(SUM(commission_amount_paise), 0) as total_paise
    FROM commissions ${orgW} GROUP BY status
  `).all(...orgP);

  res.json({ leadsByStage, leadsByMonth, conversionRate, commByStatus });
});

// ─── Settings ────────────────────────────────────────────────────────────────

// GET org profile
router.get('/settings/profile', (req, res) => {
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ error: 'No org context for platform admin' });
  res.json(db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId));
});

// PATCH org profile
router.patch('/settings/profile', requireRole('ORG_OWNER', 'NEXTHARA_PLATFORM_ADMIN'), (req, res) => {
  const orgId = getOrgId(req);
  const { name, legal_name, gstin } = req.body;
  db.prepare('UPDATE organizations SET name = COALESCE(?, name), legal_name = COALESCE(?, legal_name), gstin = COALESCE(?, gstin) WHERE id = ?')
    .run(name || null, legal_name || null, gstin || null, orgId);
  res.json(db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId));
});

// GET branches
router.get('/settings/branches', (req, res) => {
  const orgId = getOrgId(req);
  const branches = db.prepare(`SELECT * FROM branches ${orgId ? 'WHERE organization_id = ?' : ''} ORDER BY created_at ASC`).all(...(orgId ? [orgId] : []));
  res.json(branches);
});

// POST branch
router.post('/settings/branches', requireRole('ORG_OWNER', 'BRANCH_MANAGER', 'NEXTHARA_PLATFORM_ADMIN'), (req, res) => {
  const orgId = getOrgId(req);
  const { name, city, timezone } = req.body;
  if (!name) return res.status(400).json({ error: 'Branch name required' });
  const id = nanoid();
  db.prepare('INSERT INTO branches (id, organization_id, name, city, timezone) VALUES (?, ?, ?, ?, ?)').run(id, orgId, name, city || null, timezone || 'Asia/Kolkata');
  res.status(201).json(db.prepare('SELECT * FROM branches WHERE id = ?').get(id));
});

// GET users in org
router.get('/settings/users', (req, res) => {
  const orgId = getOrgId(req);
  const users = db.prepare(`
    SELECT id, name, email, phone_e164, role, branch_id, is_active, last_login_at, created_at
    FROM agent_users ${orgId ? 'WHERE organization_id = ?' : ''} ORDER BY created_at ASC
  `).all(...(orgId ? [orgId] : []));
  res.json(users);
});

// POST user
router.post('/settings/users', requireRole('ORG_OWNER', 'BRANCH_MANAGER', 'NEXTHARA_PLATFORM_ADMIN'), (req, res) => {
  const orgId = getOrgId(req);
  const { name, email, phone_e164, password, role, branch_id } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  if (db.prepare('SELECT id FROM agent_users WHERE email = ?').get(email)) return res.status(409).json({ error: 'Email already exists' });
  const VALID_ROLES = ['ORG_OWNER','BRANCH_MANAGER','COUNSELOR','ACCOUNTANT','VIEW_ONLY'];
  const userRole = VALID_ROLES.includes(role) ? role : 'COUNSELOR';
  const id = nanoid();
  db.prepare('INSERT INTO agent_users (id, organization_id, branch_id, name, email, phone_e164, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, orgId, branch_id || null, name, email, phone_e164 || null, bcrypt.hashSync(password, 10), userRole);
  res.status(201).json({ id, name, email, role: userRole, organization_id: orgId });
});

// PATCH user
router.patch('/settings/users/:id', requireRole('ORG_OWNER', 'NEXTHARA_PLATFORM_ADMIN'), (req, res) => {
  const orgId = getOrgId(req);
  const user = db.prepare('SELECT * FROM agent_users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (orgId && user.organization_id !== orgId) return res.status(403).json({ error: 'Access denied' });
  const { name, role, is_active, branch_id } = req.body;
  db.prepare('UPDATE agent_users SET name = COALESCE(?, name), role = COALESCE(?, role), is_active = COALESCE(?, is_active), branch_id = COALESCE(?, branch_id) WHERE id = ?')
    .run(name || null, role || null, is_active !== undefined ? is_active : null, branch_id !== undefined ? branch_id : null, req.params.id);
  res.json(db.prepare('SELECT id, name, email, role, branch_id, is_active FROM agent_users WHERE id = ?').get(req.params.id));
});

// Nexthara platform admin: create/manage commissions
router.post('/commissions', requireRole('NEXTHARA_PLATFORM_ADMIN', 'ORG_OWNER'), (req, res) => {
  const { organization_id, agent_lead_id, case_id, sanction_amount_paise, commission_percent, status } = req.body;
  const orgId = getOrgId(req) || organization_id;
  if (!orgId) return res.status(400).json({ error: 'organization_id required' });
  const commission_amount_paise = Math.round((sanction_amount_paise || 0) * (commission_percent || 0) / 100);
  const id = nanoid();
  db.prepare(`
    INSERT INTO commissions (id, organization_id, agent_lead_id, case_id, sanction_amount_paise, commission_percent, commission_amount_paise, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, orgId, agent_lead_id || null, case_id || null, sanction_amount_paise || 0, commission_percent || 0, commission_amount_paise, status || 'PENDING');
  res.status(201).json(db.prepare('SELECT * FROM commissions WHERE id = ?').get(id));
});

router.patch('/commissions/:id', requireRole('NEXTHARA_PLATFORM_ADMIN', 'ORG_OWNER'), (req, res) => {
  const orgId = getOrgId(req);
  const comm = db.prepare('SELECT * FROM commissions WHERE id = ?').get(req.params.id);
  if (!comm) return res.status(404).json({ error: 'Commission not found' });
  if (orgId && comm.organization_id !== orgId) return res.status(403).json({ error: 'Access denied' });
  const { status, invoice_number, paid_at } = req.body;
  const paidDate = status === 'PAID' && !comm.paid_at ? 'datetime(\'now\')' : `'${paid_at || comm.paid_at}'`;
  db.prepare(`UPDATE commissions SET status = COALESCE(?, status), invoice_number = COALESCE(?, invoice_number), paid_at = CASE WHEN ? = 'PAID' AND paid_at IS NULL THEN datetime('now') ELSE paid_at END WHERE id = ?`)
    .run(status || null, invoice_number || null, status || null, req.params.id);
  res.json(db.prepare('SELECT * FROM commissions WHERE id = ?').get(req.params.id));
});

export default router;
