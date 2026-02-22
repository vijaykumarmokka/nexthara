import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID as uuidv4 } from 'crypto';
import db from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function requireBankAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    if (payload.portal !== 'bank_admin') return res.status(403).json({ error: 'Forbidden' });
    req.bankUser = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.bankUser.bank_role)) {
      return res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
    }
    next();
  };
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

// POST /api/bank-admin/auth/login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM bank_portal_users WHERE email = ? AND is_active = 1').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const bank = db.prepare('SELECT id, name, logo_url, country FROM banks WHERE id = ?').get(user.bank_id);

  const token = jwt.sign(
    {
      id: user.id,
      bank_id: user.bank_id,
      bank_role: user.role,
      branch_id: user.branch_id,
      name: user.name,
      email: user.email,
      portal: 'bank_admin',
      bank_name: bank?.name,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, bank_id: user.bank_id, branch_id: user.branch_id, portal: 'bank_admin', bank_name: bank?.name, bank_logo: bank?.logo_url } });
});

// GET /api/bank-admin/auth/me
router.get('/auth/me', requireBankAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, bank_id, branch_id, assigned_states FROM bank_portal_users WHERE id = ?').get(req.bankUser.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const bank = db.prepare('SELECT id, name, logo_url, country FROM banks WHERE id = ?').get(user.bank_id);
  res.json({ ...user, portal: 'bank_admin', bank_name: bank?.name, bank_logo: bank?.logo_url });
});

// ─── Banks CRUD ───────────────────────────────────────────────────────────────

// GET /api/bank-admin/banks
router.get('/banks', requireBankAuth, (req, res) => {
  const { bank_role, bank_id } = req.bankUser;
  if (bank_role === 'SUPER_ADMIN') {
    // SUPER_ADMIN sees only their own bank
    const bank = db.prepare('SELECT * FROM banks WHERE id = ?').get(bank_id);
    return res.json([bank].filter(Boolean));
  }
  const bank = db.prepare('SELECT * FROM banks WHERE id = ?').get(bank_id);
  res.json([bank].filter(Boolean));
});

// POST /api/bank-admin/banks (Nexthara admin can create banks via seeding; bank users manage their own)
router.post('/banks', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const { name, logo_url, country, default_sla_days } = req.body;
  if (!name) return res.status(400).json({ error: 'Bank name required' });
  const id = uuidv4();
  db.prepare('INSERT INTO banks (id, name, logo_url, country, default_sla_days) VALUES (?, ?, ?, ?, ?)').run(id, name, logo_url || null, country || 'India', default_sla_days || 7);
  res.json({ id, message: 'Bank created' });
});

// GET /api/bank-admin/banks/:id
router.get('/banks/:id', requireBankAuth, (req, res) => {
  if (req.bankUser.bank_id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  const bank = db.prepare('SELECT * FROM banks WHERE id = ?').get(req.params.id);
  if (!bank) return res.status(404).json({ error: 'Not found' });
  res.json(bank);
});

// PUT /api/bank-admin/banks/:id
router.put('/banks/:id', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  const { name, logo_url, country, default_sla_days, is_active } = req.body;
  db.prepare('UPDATE banks SET name=COALESCE(?,name), logo_url=COALESCE(?,logo_url), country=COALESCE(?,country), default_sla_days=COALESCE(?,default_sla_days), is_active=COALESCE(?,is_active) WHERE id=?')
    .run(name ?? null, logo_url ?? null, country ?? null, default_sla_days ?? null, is_active ?? null, req.params.id);
  res.json({ message: 'Updated' });
});

// ─── Bank Products ────────────────────────────────────────────────────────────

router.get('/banks/:bankId/products', requireBankAuth, (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const products = db.prepare('SELECT * FROM bank_products WHERE bank_id = ? ORDER BY created_at DESC').all(req.params.bankId);
  res.json(products);
});

router.post('/banks/:bankId/products', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const { product_name, loan_type, min_amount_paise, max_amount_paise, interest_range, tenure_range, processing_fee_percent, collateral_required, coapp_required, countries_supported } = req.body;
  if (!product_name) return res.status(400).json({ error: 'Product name required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO bank_products (id, bank_id, product_name, loan_type, min_amount_paise, max_amount_paise, interest_range, tenure_range, processing_fee_percent, collateral_required, coapp_required, countries_supported)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.bankId, product_name, loan_type || 'UNSECURED', min_amount_paise || 0, max_amount_paise || 0, interest_range || null, tenure_range || null, processing_fee_percent || 0, collateral_required ? 1 : 0, coapp_required ? 1 : 0, JSON.stringify(countries_supported || []));
  res.json({ id, message: 'Product created' });
});

router.get('/products/:productId', requireBankAuth, (req, res) => {
  const product = db.prepare('SELECT * FROM bank_products WHERE id = ?').get(req.params.productId);
  if (!product || product.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const criteria = db.prepare('SELECT * FROM bank_product_criteria WHERE product_id = ?').all(req.params.productId);
  const documents = db.prepare('SELECT * FROM bank_product_documents WHERE product_id = ? ORDER BY order_no').all(req.params.productId);
  res.json({ ...product, criteria, documents });
});

router.put('/products/:productId', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const product = db.prepare('SELECT * FROM bank_products WHERE id = ?').get(req.params.productId);
  if (!product || product.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { product_name, loan_type, min_amount_paise, max_amount_paise, interest_range, tenure_range, processing_fee_percent, collateral_required, coapp_required, countries_supported, is_active } = req.body;
  db.prepare(`UPDATE bank_products SET product_name=COALESCE(?,product_name), loan_type=COALESCE(?,loan_type), min_amount_paise=COALESCE(?,min_amount_paise), max_amount_paise=COALESCE(?,max_amount_paise), interest_range=COALESCE(?,interest_range), tenure_range=COALESCE(?,tenure_range), processing_fee_percent=COALESCE(?,processing_fee_percent), collateral_required=COALESCE(?,collateral_required), coapp_required=COALESCE(?,coapp_required), countries_supported=COALESCE(?,countries_supported), is_active=COALESCE(?,is_active) WHERE id=?`)
    .run(product_name ?? null, loan_type ?? null, min_amount_paise ?? null, max_amount_paise ?? null, interest_range ?? null, tenure_range ?? null, processing_fee_percent ?? null, collateral_required !== undefined ? (collateral_required ? 1 : 0) : null, coapp_required !== undefined ? (coapp_required ? 1 : 0) : null, countries_supported ? JSON.stringify(countries_supported) : null, is_active ?? null, req.params.productId);
  res.json({ message: 'Updated' });
});

router.delete('/products/:productId', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const product = db.prepare('SELECT * FROM bank_products WHERE id = ?').get(req.params.productId);
  if (!product || product.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM bank_product_criteria WHERE product_id = ?').run(req.params.productId);
  db.prepare('DELETE FROM bank_product_documents WHERE product_id = ?').run(req.params.productId);
  db.prepare('DELETE FROM bank_products WHERE id = ?').run(req.params.productId);
  res.json({ message: 'Deleted' });
});

// ─── Product Criteria ─────────────────────────────────────────────────────────

router.get('/products/:productId/criteria', requireBankAuth, (req, res) => {
  const product = db.prepare('SELECT * FROM bank_products WHERE id = ?').get(req.params.productId);
  if (!product || product.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  res.json(db.prepare('SELECT * FROM bank_product_criteria WHERE product_id = ?').all(req.params.productId));
});

router.post('/products/:productId/criteria', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const product = db.prepare('SELECT * FROM bank_products WHERE id = ?').get(req.params.productId);
  if (!product || product.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { criteria_type, criteria_value } = req.body;
  if (!criteria_type) return res.status(400).json({ error: 'criteria_type required' });
  const id = uuidv4();
  db.prepare('INSERT INTO bank_product_criteria (id, product_id, criteria_type, criteria_value) VALUES (?, ?, ?, ?)').run(id, req.params.productId, criteria_type, JSON.stringify(criteria_value || {}));
  res.json({ id, message: 'Criterion added' });
});

router.delete('/criteria/:id', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const criterion = db.prepare('SELECT bpc.*, bp.bank_id FROM bank_product_criteria bpc JOIN bank_products bp ON bpc.product_id = bp.id WHERE bpc.id = ?').get(req.params.id);
  if (!criterion || criterion.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM bank_product_criteria WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ─── Product Documents ────────────────────────────────────────────────────────

router.get('/products/:productId/documents', requireBankAuth, (req, res) => {
  const product = db.prepare('SELECT * FROM bank_products WHERE id = ?').get(req.params.productId);
  if (!product || product.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  res.json(db.prepare('SELECT * FROM bank_product_documents WHERE product_id = ? ORDER BY order_no').all(req.params.productId));
});

router.post('/products/:productId/documents', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const product = db.prepare('SELECT * FROM bank_products WHERE id = ?').get(req.params.productId);
  if (!product || product.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { doc_code, mandatory, order_no } = req.body;
  if (!doc_code) return res.status(400).json({ error: 'doc_code required' });
  const id = uuidv4();
  db.prepare('INSERT INTO bank_product_documents (id, product_id, doc_code, mandatory, order_no) VALUES (?, ?, ?, ?, ?)').run(id, req.params.productId, doc_code, mandatory !== false ? 1 : 0, order_no || 0);
  res.json({ id, message: 'Document added' });
});

router.delete('/product-documents/:id', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const doc = db.prepare('SELECT bpd.*, bp.bank_id FROM bank_product_documents bpd JOIN bank_products bp ON bpd.product_id = bp.id WHERE bpd.id = ?').get(req.params.id);
  if (!doc || doc.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM bank_product_documents WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ─── Branches ─────────────────────────────────────────────────────────────────

router.get('/banks/:bankId/branches', requireBankAuth, (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const branches = db.prepare('SELECT bb.*, COUNT(bpu.id) as user_count FROM bank_branches bb LEFT JOIN bank_portal_users bpu ON bpu.branch_id = bb.id WHERE bb.bank_id = ? GROUP BY bb.id ORDER BY bb.created_at DESC').all(req.params.bankId);
  res.json(branches);
});

router.post('/banks/:bankId/branches', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const { branch_name, region, state, city } = req.body;
  if (!branch_name) return res.status(400).json({ error: 'branch_name required' });
  const id = uuidv4();
  db.prepare('INSERT INTO bank_branches (id, bank_id, branch_name, region, state, city) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.params.bankId, branch_name, region || null, state || null, city || null);
  res.json({ id, message: 'Branch created' });
});

router.put('/branches/:id', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const branch = db.prepare('SELECT * FROM bank_branches WHERE id = ?').get(req.params.id);
  if (!branch || branch.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { branch_name, region, state, city, is_active } = req.body;
  db.prepare('UPDATE bank_branches SET branch_name=COALESCE(?,branch_name), region=COALESCE(?,region), state=COALESCE(?,state), city=COALESCE(?,city), is_active=COALESCE(?,is_active) WHERE id=?')
    .run(branch_name ?? null, region ?? null, state ?? null, city ?? null, is_active ?? null, req.params.id);
  res.json({ message: 'Updated' });
});

// ─── Bank Portal Users ────────────────────────────────────────────────────────

router.get('/banks/:bankId/users', requireBankAuth, requireRole('SUPER_ADMIN', 'REGION_HEAD'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const users = db.prepare(`
    SELECT bpu.id, bpu.name, bpu.email, bpu.phone, bpu.role, bpu.branch_id, bpu.is_active, bpu.created_at,
           bb.branch_name
    FROM bank_portal_users bpu
    LEFT JOIN bank_branches bb ON bpu.branch_id = bb.id
    WHERE bpu.bank_id = ?
    ORDER BY bpu.created_at DESC
  `).all(req.params.bankId);
  res.json(users);
});

router.post('/banks/:bankId/users', requireBankAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const { name, email, phone, role, branch_id, password, assigned_states } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  const validRoles = ['SUPER_ADMIN', 'REGION_HEAD', 'BRANCH_MANAGER', 'OFFICER'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const existing = db.prepare('SELECT id FROM bank_portal_users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(400).json({ error: 'Email already exists' });
  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  db.prepare('INSERT INTO bank_portal_users (id, bank_id, branch_id, name, email, phone, role, password_hash, assigned_states) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.bankId, branch_id || null, name, email.toLowerCase(), phone || null, role, hash, JSON.stringify(assigned_states || []));
  res.json({ id, message: 'User created' });
});

router.put('/bank-users/:id', requireBankAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  const user = db.prepare('SELECT * FROM bank_portal_users WHERE id = ?').get(req.params.id);
  if (!user || user.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { name, phone, role, branch_id, is_active, assigned_states, password } = req.body;
  let hash = user.password_hash;
  if (password) hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE bank_portal_users SET name=COALESCE(?,name), phone=COALESCE(?,phone), role=COALESCE(?,role), branch_id=COALESCE(?,branch_id), is_active=COALESCE(?,is_active), assigned_states=COALESCE(?,assigned_states), password_hash=? WHERE id=?')
    .run(name ?? null, phone ?? null, role ?? null, branch_id ?? null, is_active ?? null, assigned_states ? JSON.stringify(assigned_states) : null, hash, req.params.id);
  res.json({ message: 'Updated' });
});

// ─── Announcements ────────────────────────────────────────────────────────────

router.get('/banks/:bankId/announcements', requireBankAuth, (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const items = db.prepare('SELECT * FROM bank_announcements WHERE bank_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.bankId);
  res.json(items);
});

router.post('/banks/:bankId/announcements', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const { title, description, attachment_url, visible_to } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uuidv4();
  db.prepare('INSERT INTO bank_announcements (id, bank_id, created_by, title, description, attachment_url, visible_to) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.bankId, req.bankUser.id, title, description || null, attachment_url || null, visible_to || 'ALL');
  res.json({ id, message: 'Announcement created' });
});

router.delete('/announcements/:id', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const ann = db.prepare('SELECT * FROM bank_announcements WHERE id = ?').get(req.params.id);
  if (!ann || ann.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM bank_announcements WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// ─── API Keys ─────────────────────────────────────────────────────────────────

router.get('/banks/:bankId/api-keys', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  res.json(db.prepare('SELECT id, label, api_key, is_active, created_at FROM bank_api_keys WHERE bank_id = ? ORDER BY created_at DESC').all(req.params.bankId));
});

router.post('/banks/:bankId/api-keys', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const { label } = req.body;
  const id = uuidv4();
  const api_key = `nbpp_${uuidv4().replace(/-/g, '')}`;
  db.prepare('INSERT INTO bank_api_keys (id, bank_id, api_key, label) VALUES (?, ?, ?, ?)').run(id, req.params.bankId, api_key, label || 'API Key');
  res.json({ id, api_key, message: 'API key generated' });
});

router.patch('/api-keys/:id/toggle', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const key = db.prepare('SELECT * FROM bank_api_keys WHERE id = ?').get(req.params.id);
  if (!key || key.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE bank_api_keys SET is_active = ? WHERE id = ?').run(key.is_active ? 0 : 1, req.params.id);
  res.json({ message: 'Toggled' });
});

// ─── Performance Dashboard ────────────────────────────────────────────────────

router.get('/banks/:bankId/dashboard', requireBankAuth, (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const bankName = db.prepare('SELECT name FROM banks WHERE id = ?').get(req.params.bankId)?.name;
  const bankAnd = `AND bank = '${(bankName || '').replace(/'/g, "''")}'`;
  const bankWhere = `WHERE bank = '${(bankName || '').replace(/'/g, "''")}'`;

  const total = db.prepare(`SELECT COUNT(*) as c FROM applications ${bankWhere}`).get().c;
  const active = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE status NOT IN ('CLOSED','DROPPED','EXPIRED','REJECTED','LOGIN_REJECTED') ${bankAnd}`).get().c;
  const sanctioned = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE status IN ('SANCTIONED','CONDITIONAL_SANCTION','SANCTION_ACCEPTED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED','CLOSED') ${bankAnd}`).get().c;
  const rejected = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE status IN ('REJECTED','LOGIN_REJECTED','DROPPED') ${bankAnd}`).get().c;
  const sanction_pct = total > 0 ? ((sanctioned / total) * 100).toFixed(1) : '0.0';
  const rejection_pct = total > 0 ? ((rejected / total) * 100).toFixed(1) : '0.0';
  const avgSanction = db.prepare(`SELECT AVG(sanction_amount) as avg FROM applications WHERE sanction_amount IS NOT NULL ${bankAnd}`).get().avg || 0;
  const avgDisbursed = db.prepare(`SELECT AVG(disbursed_amount) as avg FROM applications WHERE disbursed_amount IS NOT NULL ${bankAnd}`).get().avg || 0;

  // SLA breaches
  const SLA_BREACH = `((status IN ('NOT_CONNECTED','CONTACTED','YET_TO_CONNECT') AND sla_days > 2) OR (status IN ('LOGIN_SUBMITTED','LOGIN_IN_PROGRESS') AND sla_days > 3) OR (status IN ('DOCS_PENDING','DOCS_SUBMITTED') AND sla_days > 4) OR (status IN ('UNDER_REVIEW','CREDIT_CHECK_IN_PROGRESS') AND sla_days > 7) OR (status = 'QUERY_RAISED' AND sla_days > 5)) AND awaiting_from NOT IN ('Closed')`;
  const slaBreach = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE ${SLA_BREACH} ${bankAnd}`).get().c;

  // Country breakdown
  const countryBreakdown = db.prepare(`SELECT country, COUNT(*) as count FROM applications ${bankWhere} AND country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10`).all();

  // Status breakdown
  const statusBreakdown = db.prepare(`SELECT status, COUNT(*) as count FROM applications ${bankWhere} GROUP BY status ORDER BY count DESC`).all();

  // Recent sanctioned
  const recentSanctions = db.prepare(`SELECT id, student_name, sanction_amount, country, course, created_at FROM applications WHERE status IN ('SANCTIONED','CONDITIONAL_SANCTION') ${bankAnd} ORDER BY updated_at DESC LIMIT 5`).all();

  res.json({
    total, active, sanctioned, rejected,
    sanction_pct, rejection_pct,
    avg_sanction_amount: Math.round(avgSanction),
    avg_disbursed_amount: Math.round(avgDisbursed),
    sla_breaches: slaBreach,
    country_breakdown: countryBreakdown,
    status_breakdown: statusBreakdown,
    recent_sanctions: recentSanctions,
  });
});

// ─── Advanced Analytics ───────────────────────────────────────────────────────

router.get('/banks/:bankId/analytics', requireBankAuth, requireRole('SUPER_ADMIN', 'REGION_HEAD'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const bankName = db.prepare('SELECT name FROM banks WHERE id = ?').get(req.params.bankId)?.name;
  const bankAnd = `AND bank = '${(bankName || '').replace(/'/g, "''")}'`;
  const bankWhere = `WHERE bank = '${(bankName || '').replace(/'/g, "''")}'`;

  // Country-wise exposure
  const countryExposure = db.prepare(`
    SELECT country, COUNT(*) as count,
           SUM(CASE WHEN status IN ('SANCTIONED','CONDITIONAL_SANCTION','SANCTION_ACCEPTED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED') THEN 1 ELSE 0 END) as sanctioned,
           SUM(CASE WHEN status IN ('REJECTED','LOGIN_REJECTED','DROPPED') THEN 1 ELSE 0 END) as rejected
    FROM applications ${bankWhere} AND country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10
  `).all();

  // Risk heatmap: rejection by country
  const rejectionByCountry = db.prepare(`
    SELECT country, COUNT(*) as rejected
    FROM applications WHERE status IN ('REJECTED','LOGIN_REJECTED') ${bankAnd} AND country IS NOT NULL
    GROUP BY country ORDER BY rejected DESC LIMIT 10
  `).all();

  // Rejection by intake
  const rejectionByIntake = db.prepare(`
    SELECT intake, COUNT(*) as rejected
    FROM applications WHERE status IN ('REJECTED','LOGIN_REJECTED') ${bankAnd} AND intake IS NOT NULL
    GROUP BY intake ORDER BY rejected DESC LIMIT 10
  `).all();

  // Monthly trend (last 6 months)
  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as total,
           SUM(CASE WHEN status IN ('SANCTIONED','CONDITIONAL_SANCTION','SANCTION_ACCEPTED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED') THEN 1 ELSE 0 END) as sanctioned
    FROM applications ${bankWhere} AND created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month ASC
  `).all();

  // SLA breach count
  const SLA_BREACH = `((status IN ('NOT_CONNECTED','CONTACTED','YET_TO_CONNECT') AND sla_days > 2) OR (status IN ('LOGIN_SUBMITTED','LOGIN_IN_PROGRESS') AND sla_days > 3) OR (status IN ('DOCS_PENDING','DOCS_SUBMITTED') AND sla_days > 4) OR (status IN ('UNDER_REVIEW','CREDIT_CHECK_IN_PROGRESS') AND sla_days > 7) OR (status = 'QUERY_RAISED' AND sla_days > 5)) AND awaiting_from NOT IN ('Closed')`;
  const slaBreach = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE ${SLA_BREACH} ${bankAnd}`).get().c;

  // Credit utilization by month (sanctioned volume)
  const creditUtilization = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(sanction_amount) as total_sanctioned, COUNT(*) as cases
    FROM applications WHERE sanction_amount IS NOT NULL ${bankAnd} AND created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month ASC
  `).all();

  res.json({
    country_exposure: countryExposure,
    rejection_by_country: rejectionByCountry,
    rejection_by_intake: rejectionByIntake,
    monthly_trend: monthlyTrend,
    credit_utilization: creditUtilization,
    sla_breaches: slaBreach,
  });
});

// ─── Audit Log ────────────────────────────────────────────────────────────────

router.get('/banks/:bankId/audit-log', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const { limit = 50, offset = 0 } = req.query;
  const events = db.prepare('SELECT * FROM bank_application_events WHERE bank_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(req.params.bankId, parseInt(limit), parseInt(offset));
  res.json(events);
});

// ─── Branch Dashboard ─────────────────────────────────────────────────────────

router.get('/banks/:bankId/branches/:branchId/dashboard', requireBankAuth, (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const users = db.prepare('SELECT id, name, role FROM bank_portal_users WHERE branch_id = ? AND is_active = 1').all(req.params.branchId);
  const branch = db.prepare('SELECT * FROM bank_branches WHERE id = ?').get(req.params.branchId);
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED') THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status IN ('DOCS_PENDING') THEN 1 ELSE 0 END) as pending_docs,
      SUM(CASE WHEN status = 'UNDER_REVIEW' THEN 1 ELSE 0 END) as under_review,
      SUM(CASE WHEN status IN ('SANCTIONED','DISBURSED') THEN 1 ELSE 0 END) as sanctioned,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
    FROM bank_applications WHERE bank_id = ? AND bank_branch_id = ?
  `).get(req.params.bankId, req.params.branchId) || {};
  res.json({ branch, users, ...stats });
});

// ─── Regions ──────────────────────────────────────────────────────────────────

router.get('/banks/:bankId/regions', requireBankAuth, (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  res.json(db.prepare('SELECT * FROM bank_regions WHERE bank_id = ? ORDER BY region_name').all(req.params.bankId));
});

router.post('/banks/:bankId/regions', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const { region_name } = req.body;
  if (!region_name) return res.status(400).json({ error: 'region_name required' });
  const id = uuidv4();
  db.prepare('INSERT INTO bank_regions (id, bank_id, region_name) VALUES (?, ?, ?)').run(id, req.params.bankId, region_name);
  res.json({ id, message: 'Region created' });
});

// ─── Bank Applications Queue ──────────────────────────────────────────────────

router.get('/banks/:bankId/bank-applications', requireBankAuth, (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const { status, awaiting_from, sla_risk, country, product_id, branch_id, officer_id, search, limit = 50, offset = 0 } = req.query;
  const { bank_role, id: userId, branch_id: userBranchId } = req.bankUser;

  let where = ['ba.bank_id = ?'];
  const params = [req.params.bankId];

  // Role-based scoping
  if (bank_role === 'OFFICER') {
    where.push('ba.assigned_to_bank_user_id = ?');
    params.push(userId);
  } else if (bank_role === 'BRANCH_MANAGER' && userBranchId) {
    where.push('ba.bank_branch_id = ?');
    params.push(userBranchId);
  }

  if (status) { where.push('ba.status = ?'); params.push(status); }
  if (awaiting_from) { where.push('ba.awaiting_from = ?'); params.push(awaiting_from); }
  if (country) { where.push('ba.country = ?'); params.push(country); }
  if (product_id) { where.push('ba.bank_product_id = ?'); params.push(product_id); }
  if (branch_id) { where.push('ba.bank_branch_id = ?'); params.push(branch_id); }
  if (officer_id) { where.push('ba.assigned_to_bank_user_id = ?'); params.push(officer_id); }
  if (search) { where.push('(ba.student_name LIKE ? OR ba.case_id LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  if (sla_risk === 'BREACH') {
    where.push('ba.sla_due_at IS NOT NULL AND ba.sla_due_at < datetime(\'now\') AND ba.status NOT IN (\'SANCTIONED\',\'REJECTED\',\'DISBURSED\',\'CLOSED\')');
  } else if (sla_risk === 'RISK') {
    where.push('ba.sla_due_at IS NOT NULL AND ba.sla_due_at >= datetime(\'now\') AND ba.sla_due_at <= datetime(\'now\',\'+2 days\') AND ba.status NOT IN (\'SANCTIONED\',\'REJECTED\',\'DISBURSED\',\'CLOSED\')');
  }

  const sql = `
    SELECT ba.*, bp.product_name, bb.branch_name, bpu.name as officer_name
    FROM bank_applications ba
    LEFT JOIN bank_products bp ON bp.id = ba.bank_product_id
    LEFT JOIN bank_branches bb ON bb.id = ba.bank_branch_id
    LEFT JOIN bank_portal_users bpu ON bpu.id = ba.assigned_to_bank_user_id
    WHERE ${where.join(' AND ')}
    ORDER BY
      CASE WHEN ba.sla_due_at < datetime('now') AND ba.status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED') THEN 0 ELSE 1 END,
      ba.sla_due_at ASC NULLS LAST, ba.updated_at DESC
    LIMIT ? OFFSET ?
  `;
  const apps = db.prepare(sql).all(...params, parseInt(limit), parseInt(offset));
  const total = db.prepare(`SELECT COUNT(*) as c FROM bank_applications ba WHERE ${where.join(' AND ')}`).get(...params).c;
  res.json({ applications: apps, total });
});

router.post('/banks/:bankId/bank-applications', requireBankAuth, requireRole('SUPER_ADMIN', 'REGION_HEAD', 'BRANCH_MANAGER'), (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const { case_id, bank_product_id, bank_branch_id, student_name, student_phone, student_email, country, university, course, intake, loan_amount_paise, assigned_to_bank_user_id, sla_days } = req.body;
  if (!student_name) return res.status(400).json({ error: 'student_name required' });
  const id = uuidv4();
  const bank = db.prepare('SELECT default_sla_days FROM banks WHERE id = ?').get(req.params.bankId);
  const slaDays = sla_days || bank?.default_sla_days || 7;
  const sla_due_at = new Date(Date.now() + slaDays * 86400000).toISOString();
  db.prepare(`
    INSERT INTO bank_applications (id, bank_id, case_id, bank_product_id, bank_branch_id, student_name, student_phone, student_email, country, university, course, intake, loan_amount_paise, assigned_to_bank_user_id, sla_due_at, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, req.params.bankId, case_id || null, bank_product_id || null, bank_branch_id || null, student_name, student_phone || null, student_email || null, country || null, university || null, course || null, intake || null, loan_amount_paise || null, assigned_to_bank_user_id || null, sla_due_at);
  // log event
  db.prepare('INSERT INTO bank_application_events (id, bank_id, user_id, event_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), req.params.bankId, req.bankUser.id, 'APPLICATION_CREATED', id, JSON.stringify({ by: req.bankUser.name }));
  res.json({ id, message: 'Application created' });
});

router.get('/bank-applications/:id', requireBankAuth, (req, res) => {
  const app = db.prepare(`
    SELECT ba.*, bp.product_name, bp.loan_type, bb.branch_name, bb.city, bb.state,
           bpu.name as officer_name, bpu.email as officer_email, bpu.phone as officer_phone
    FROM bank_applications ba
    LEFT JOIN bank_products bp ON bp.id = ba.bank_product_id
    LEFT JOIN bank_branches bb ON bb.id = ba.bank_branch_id
    LEFT JOIN bank_portal_users bpu ON bpu.id = ba.assigned_to_bank_user_id
    WHERE ba.id = ?
  `).get(req.params.id);
  if (!app || app.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  res.json(app);
});

router.patch('/bank-applications/:id/status', requireBankAuth, (req, res) => {
  const app = db.prepare('SELECT * FROM bank_applications WHERE id = ?').get(req.params.id);
  if (!app || app.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { status, awaiting_from, sanction_amount_paise, disbursed_amount_paise, roi_final, rejection_reason, notes } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  const validStatuses = ['INITIATED','DOCS_PENDING','LOGIN_DONE','UNDER_REVIEW','SANCTIONED','REJECTED','DISBURSED','CLOSED'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare(`
    UPDATE bank_applications SET status=?, awaiting_from=COALESCE(?,awaiting_from),
      sanction_amount_paise=COALESCE(?,sanction_amount_paise), disbursed_amount_paise=COALESCE(?,disbursed_amount_paise),
      roi_final=COALESCE(?,roi_final), rejection_reason=COALESCE(?,rejection_reason),
      last_bank_update_at=datetime('now'), updated_at=datetime('now')
    WHERE id=?
  `).run(status, awaiting_from ?? null, sanction_amount_paise ?? null, disbursed_amount_paise ?? null, roi_final ?? null, rejection_reason ?? null, req.params.id);
  db.prepare('INSERT INTO bank_application_events (id, bank_id, user_id, event_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuidv4(), app.bank_id, req.bankUser.id, 'STATUS_CHANGE', req.params.id,
    JSON.stringify({ from: app.status, to: status, by: req.bankUser.name, notes: notes || null })
  );

  // Sync bank status back to CRM application if this bank_application is linked to a CRM case
  if (app.case_id) {
    const BANK_TO_CRM = {
      INITIATED: 'NOT_CONNECTED', DOCS_PENDING: 'DOCS_PENDING', LOGIN_DONE: 'LOGIN_SUBMITTED',
      UNDER_REVIEW: 'UNDER_REVIEW', SANCTIONED: 'SANCTIONED', REJECTED: 'REJECTED',
      DISBURSED: 'DISBURSED', CLOSED: 'CLOSED',
    };
    const crmStatus = BANK_TO_CRM[status];
    if (crmStatus) {
      const colUpdates = [`status = ?`, `status_changed_at = datetime('now')`, `updated_at = datetime('now')`];
      const colVals = [crmStatus];
      if (sanction_amount_paise) { colUpdates.push('sanction_amount = ?'); colVals.push(Math.round(sanction_amount_paise / 100)); }
      if (roi_final)             { colUpdates.push('roi = ?');             colVals.push(roi_final); }
      colVals.push(app.case_id);
      db.prepare(`UPDATE applications SET ${colUpdates.join(', ')} WHERE id = ?`).run(...colVals);
      db.prepare(`
        INSERT INTO status_history (application_id, status, sub_status, awaiting_from, changed_by, entry_type, notes)
        SELECT ?, ?, '-', awaiting_from, 'Bank Portal', 'status', ?
        FROM applications WHERE id = ?
      `).run(app.case_id, crmStatus, `[BANK] ${req.bankUser.name} updated status to ${status}${notes ? ': ' + notes : ''}`, app.case_id);
    }
  }

  res.json({ message: 'Status updated' });
});

router.patch('/bank-applications/:id/assign', requireBankAuth, requireRole('SUPER_ADMIN', 'REGION_HEAD', 'BRANCH_MANAGER'), (req, res) => {
  const app = db.prepare('SELECT * FROM bank_applications WHERE id = ?').get(req.params.id);
  if (!app || app.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { assigned_to_bank_user_id, bank_branch_id } = req.body;
  db.prepare('UPDATE bank_applications SET assigned_to_bank_user_id=COALESCE(?,assigned_to_bank_user_id), bank_branch_id=COALESCE(?,bank_branch_id), updated_at=datetime(\'now\') WHERE id=?')
    .run(assigned_to_bank_user_id ?? null, bank_branch_id ?? null, req.params.id);
  db.prepare('INSERT INTO bank_application_events (id, bank_id, user_id, event_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuidv4(), app.bank_id, req.bankUser.id, 'ASSIGNED', req.params.id,
    JSON.stringify({ assigned_to: assigned_to_bank_user_id, by: req.bankUser.name })
  );
  res.json({ message: 'Assigned' });
});

// Application Events (per application)
router.get('/bank-applications/:id/events', requireBankAuth, (req, res) => {
  const app = db.prepare('SELECT bank_id FROM bank_applications WHERE id = ?').get(req.params.id);
  if (!app || app.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const events = db.prepare('SELECT * FROM bank_application_events WHERE entity_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(events);
});

// ─── Bank Queries ─────────────────────────────────────────────────────────────

router.get('/bank-applications/:id/queries', requireBankAuth, (req, res) => {
  const app = db.prepare('SELECT bank_id FROM bank_applications WHERE id = ?').get(req.params.id);
  if (!app || app.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const queries = db.prepare('SELECT * FROM bank_queries WHERE bank_application_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(queries);
});

router.post('/bank-applications/:id/queries', requireBankAuth, (req, res) => {
  const app = db.prepare('SELECT bank_id, case_id FROM bank_applications WHERE id = ?').get(req.params.id);
  if (!app || app.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'title and message required' });
  const id = uuidv4();
  db.prepare('INSERT INTO bank_queries (id, bank_application_id, bank_id, raised_by_actor_type, raised_by_id, raised_by_name, title, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, app.bank_id, 'BANK', req.bankUser.id, req.bankUser.name, title, message);
  db.prepare('INSERT INTO bank_application_events (id, bank_id, user_id, event_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuidv4(), app.bank_id, req.bankUser.id, 'QUERY_RAISED', req.params.id, JSON.stringify({ query_id: id, title, by: req.bankUser.name })
  );
  // Cross-log to CRM timeline so staff can see bank queries in the Timeline tab
  if (app.case_id) {
    db.prepare(`
      INSERT INTO status_history (application_id, status, sub_status, awaiting_from, changed_by, entry_type, notes)
      SELECT ?, status, sub_status, awaiting_from, 'Bank Portal', 'query', ?
      FROM applications WHERE id = ?
    `).run(app.case_id, `[QUERY] (Bank) ${title}: ${message}`, app.case_id);
  }
  res.json({ id, message: 'Query created' });
});

router.get('/queries/:id', requireBankAuth, (req, res) => {
  const query = db.prepare('SELECT * FROM bank_queries WHERE id = ?').get(req.params.id);
  if (!query || query.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const messages = db.prepare('SELECT * FROM bank_query_messages WHERE bank_query_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ ...query, messages });
});

router.post('/queries/:id/messages', requireBankAuth, (req, res) => {
  const query = db.prepare('SELECT * FROM bank_queries WHERE id = ?').get(req.params.id);
  if (!query || query.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  if (query.status === 'CLOSED') return res.status(400).json({ error: 'Query is closed' });
  const { message, attachment_url } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  const id = uuidv4();
  db.prepare('INSERT INTO bank_query_messages (id, bank_query_id, actor_type, actor_id, actor_name, message, attachment_url) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, 'BANK', req.bankUser.id, req.bankUser.name, message, attachment_url || null);
  db.prepare('UPDATE bank_queries SET status=\'ANSWERED\' WHERE id=?').run(req.params.id);
  res.json({ id, message: 'Message sent' });
});

router.patch('/queries/:id/close', requireBankAuth, (req, res) => {
  const query = db.prepare('SELECT * FROM bank_queries WHERE id = ?').get(req.params.id);
  if (!query || query.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE bank_queries SET status=\'CLOSED\', closed_at=datetime(\'now\') WHERE id=?').run(req.params.id);
  res.json({ message: 'Query closed' });
});

// ─── Proofs ───────────────────────────────────────────────────────────────────

router.get('/bank-applications/:id/proofs', requireBankAuth, (req, res) => {
  const app = db.prepare('SELECT bank_id FROM bank_applications WHERE id = ?').get(req.params.id);
  if (!app || app.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  res.json(db.prepare('SELECT * FROM bank_application_proofs WHERE bank_application_id = ? ORDER BY created_at DESC').all(req.params.id));
});

router.post('/bank-applications/:id/proofs', requireBankAuth, (req, res) => {
  const app = db.prepare('SELECT bank_id FROM bank_applications WHERE id = ?').get(req.params.id);
  if (!app || app.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { proof_type, file_url, notes } = req.body;
  if (!proof_type || !file_url) return res.status(400).json({ error: 'proof_type and file_url required' });
  const validTypes = ['SANCTION_LETTER', 'REJECTION_PROOF', 'DISBURSEMENT_PROOF'];
  if (!validTypes.includes(proof_type)) return res.status(400).json({ error: 'Invalid proof_type' });
  const id = uuidv4();
  db.prepare('INSERT INTO bank_application_proofs (id, bank_application_id, proof_type, file_url, uploaded_by_actor_type, uploaded_by_id, uploaded_by_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, proof_type, file_url, 'BANK', req.bankUser.id, req.bankUser.name, notes || null);
  db.prepare('INSERT INTO bank_application_events (id, bank_id, user_id, event_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuidv4(), app.bank_id, req.bankUser.id, 'PROOF_UPLOADED', req.params.id, JSON.stringify({ proof_type, by: req.bankUser.name })
  );
  res.json({ id, message: 'Proof uploaded' });
});

router.patch('/proofs/:id/verify', requireBankAuth, requireRole('SUPER_ADMIN', 'REGION_HEAD', 'BRANCH_MANAGER'), (req, res) => {
  const proof = db.prepare('SELECT bap.*, ba.bank_id FROM bank_application_proofs bap JOIN bank_applications ba ON ba.id = bap.bank_application_id WHERE bap.id = ?').get(req.params.id);
  if (!proof || proof.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { status } = req.body;
  if (!['VERIFIED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE bank_application_proofs SET status=?, verified_by_user_id=?, verified_at=datetime(\'now\') WHERE id=?').run(status, req.bankUser.id, req.params.id);
  res.json({ message: 'Proof status updated' });
});

// ─── Doc Reviews ──────────────────────────────────────────────────────────────

router.get('/doc-rejection-reasons', requireBankAuth, (req, res) => {
  let reasons = db.prepare('SELECT * FROM document_rejection_reasons_master ORDER BY code').all();
  if (!reasons.length) {
    const seeds = [
      { code: 'BLURRY', label: 'Document is blurry or unreadable' },
      { code: 'EXPIRED', label: 'Document has expired' },
      { code: 'MISMATCH', label: 'Name/details do not match application' },
      { code: 'INCOMPLETE', label: 'Document is incomplete or partial' },
      { code: 'WRONG_DOC', label: 'Wrong document type uploaded' },
      { code: 'LOW_QUALITY', label: 'Image quality too low' },
      { code: 'NOT_CERTIFIED', label: 'Document not certified/attested as required' },
      { code: 'OTHER', label: 'Other reason (see note)' },
    ];
    const insert = db.prepare('INSERT OR IGNORE INTO document_rejection_reasons_master (code, label) VALUES (?, ?)');
    seeds.forEach(s => insert.run(s.code, s.label));
    reasons = seeds;
  }
  res.json(reasons);
});

router.get('/bank-applications/:id/doc-reviews', requireBankAuth, (req, res) => {
  const app = db.prepare('SELECT bank_id FROM bank_applications WHERE id = ?').get(req.params.id);
  if (!app || app.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const reviews = db.prepare('SELECT * FROM bank_doc_reviews WHERE bank_application_id = ? ORDER BY reviewed_at DESC').all(req.params.id);
  res.json(reviews);
});

router.post('/bank-applications/:id/doc-reviews', requireBankAuth, (req, res) => {
  const app = db.prepare('SELECT bank_id FROM bank_applications WHERE id = ?').get(req.params.id);
  if (!app || app.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { doc_code, document_id, action, rejection_reason_code, rejection_note } = req.body;
  if (!doc_code || !action) return res.status(400).json({ error: 'doc_code and action required' });
  if (!['VERIFIED', 'REJECTED'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  if (action === 'REJECTED' && !rejection_reason_code) return res.status(400).json({ error: 'rejection_reason_code required for REJECTED' });
  const id = uuidv4();
  db.prepare('INSERT INTO bank_doc_reviews (id, bank_application_id, doc_code, document_id, action, rejection_reason_code, rejection_note, reviewed_by_bank_user_id, reviewed_by_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, doc_code, document_id || null, action, rejection_reason_code || null, rejection_note || null, req.bankUser.id, req.bankUser.name);
  const eventType = action === 'VERIFIED' ? 'DOC_VERIFIED' : 'DOC_REJECTED';
  db.prepare('INSERT INTO bank_application_events (id, bank_id, user_id, event_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuidv4(), app.bank_id, req.bankUser.id, eventType, req.params.id,
    JSON.stringify({ doc_code, action, reason: rejection_reason_code, by: req.bankUser.name })
  );
  res.json({ id, message: `Document ${action.toLowerCase()}` });
});

// ─── Policy Versions ──────────────────────────────────────────────────────────

router.get('/products/:productId/policy-versions', requireBankAuth, (req, res) => {
  const product = db.prepare('SELECT * FROM bank_products WHERE id = ?').get(req.params.productId);
  if (!product || product.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const versions = db.prepare('SELECT pv.*, bu.name as changed_by_name FROM bank_product_policy_versions pv LEFT JOIN bank_portal_users bu ON bu.id = pv.changed_by_bank_user_id WHERE pv.product_id = ? ORDER BY pv.version_no DESC').all(req.params.productId);
  res.json(versions);
});

router.post('/products/:productId/policy-versions', requireBankAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  const product = db.prepare('SELECT * FROM bank_products WHERE id = ?').get(req.params.productId);
  if (!product || product.bank_id !== req.bankUser.bank_id) return res.status(404).json({ error: 'Not found' });
  const { change_summary } = req.body;
  const lastVersion = db.prepare('SELECT MAX(version_no) as max FROM bank_product_policy_versions WHERE product_id = ?').get(req.params.productId);
  const version_no = (lastVersion?.max || 0) + 1;
  const id = uuidv4();
  db.prepare('INSERT INTO bank_product_policy_versions (id, product_id, version_no, change_summary, changed_by_bank_user_id, changed_by_name) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.productId, version_no, change_summary || null, req.bankUser.id, req.bankUser.name);
  res.json({ id, version_no, message: 'Policy version created' });
});

// ─── Enhanced Dashboard (using bank_applications) ─────────────────────────────

router.get('/banks/:bankId/enhanced-dashboard', requireBankAuth, (req, res) => {
  if (req.bankUser.bank_id !== req.params.bankId) return res.status(403).json({ error: 'Forbidden' });
  const { bank_role, branch_id: userBranchId } = req.bankUser;

  let scopeWhere = 'WHERE ba.bank_id = ?';
  const scopeParams = [req.params.bankId];
  if (bank_role === 'BRANCH_MANAGER' && userBranchId) {
    scopeWhere += ' AND ba.bank_branch_id = ?';
    scopeParams.push(userBranchId);
  }

  // KPI counts
  const kpis = db.prepare(`
    SELECT
      COUNT(*) as total_assigned,
      SUM(CASE WHEN status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED') THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status IN ('SANCTIONED','DISBURSED') THEN 1 ELSE 0 END) as sanctioned,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'DISBURSED' THEN 1 ELSE 0 END) as disbursed,
      SUM(CASE WHEN sla_due_at IS NOT NULL AND sla_due_at < datetime('now') AND status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED') THEN 1 ELSE 0 END) as sla_breaches,
      AVG(CASE WHEN status IN ('SANCTIONED','DISBURSED') AND sanction_amount_paise IS NOT NULL THEN sanction_amount_paise ELSE NULL END) as avg_sanction_paise,
      SUM(CASE WHEN status = 'DISBURSED' AND disbursed_amount_paise IS NOT NULL THEN disbursed_amount_paise ELSE 0 END) as total_disbursed_paise
    FROM bank_applications ba ${scopeWhere}
  `).get(...scopeParams);

  // Funnel
  const funnel = db.prepare(`
    SELECT status, COUNT(*) as count FROM bank_applications ba ${scopeWhere}
    GROUP BY status ORDER BY count DESC
  `).all(...scopeParams);

  // Country mix
  const countryMix = db.prepare(`
    SELECT country, COUNT(*) as count,
      SUM(CASE WHEN status IN ('SANCTIONED','DISBURSED') THEN 1 ELSE 0 END) as sanctioned
    FROM bank_applications ba ${scopeWhere} AND country IS NOT NULL
    GROUP BY country ORDER BY count DESC LIMIT 8
  `).all(...scopeParams);

  // Monthly credit utilization (last 6 months)
  const creditUtilization = db.prepare(`
    SELECT strftime('%Y-%m', submitted_at) as month,
      COUNT(*) as total, SUM(CASE WHEN status IN ('SANCTIONED','DISBURSED') THEN 1 ELSE 0 END) as sanctioned,
      SUM(CASE WHEN status IN ('SANCTIONED','DISBURSED') AND sanction_amount_paise IS NOT NULL THEN sanction_amount_paise ELSE 0 END) as sanctioned_paise
    FROM bank_applications ba ${scopeWhere} AND submitted_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month ASC
  `).all(...scopeParams);

  // Branch performance table (only for SUPER_ADMIN / REGION_HEAD)
  let branchPerformance = [];
  if (['SUPER_ADMIN', 'REGION_HEAD'].includes(bank_role)) {
    branchPerformance = db.prepare(`
      SELECT bb.id, bb.branch_name, bb.state, bb.region,
        COUNT(ba.id) as apps,
        SUM(CASE WHEN ba.status IN ('SANCTIONED','DISBURSED') THEN 1 ELSE 0 END) as sanctions,
        SUM(CASE WHEN ba.status = 'REJECTED' THEN 1 ELSE 0 END) as rejections,
        SUM(CASE WHEN ba.sla_due_at < datetime('now') AND ba.status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED') THEN 1 ELSE 0 END) as sla_breaches,
        ROUND(CAST(SUM(CASE WHEN ba.status IN ('SANCTIONED','DISBURSED') THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(ba.id), 0) * 100, 1) as sanction_rate
      FROM bank_branches bb
      LEFT JOIN bank_applications ba ON ba.bank_branch_id = bb.id AND ba.bank_id = ?
      WHERE bb.bank_id = ?
      GROUP BY bb.id ORDER BY apps DESC
    `).all(req.params.bankId, req.params.bankId);
  }

  // Officer leaderboard
  const officerLeaderboard = db.prepare(`
    SELECT bpu.id, bpu.name, bb.branch_name,
      COUNT(ba.id) as apps_handled,
      SUM(CASE WHEN ba.status IN ('SANCTIONED','DISBURSED') THEN 1 ELSE 0 END) as sanctions,
      ROUND(CAST(SUM(CASE WHEN ba.status IN ('SANCTIONED','DISBURSED') THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(ba.id), 0) * 100, 1) as sanction_rate,
      SUM(CASE WHEN ba.sla_due_at < datetime('now') AND ba.status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED') THEN 1 ELSE 0 END) as sla_breaches
    FROM bank_portal_users bpu
    LEFT JOIN bank_applications ba ON ba.assigned_to_bank_user_id = bpu.id AND ba.bank_id = ?
    LEFT JOIN bank_branches bb ON bb.id = bpu.branch_id
    WHERE bpu.bank_id = ? AND bpu.is_active = 1
    GROUP BY bpu.id ORDER BY apps_handled DESC LIMIT 10
  `).all(req.params.bankId, req.params.bankId);

  // SLA risk queue (top 10 at risk)
  const slaRiskQueue = db.prepare(`
    SELECT ba.id, ba.student_name, ba.country, ba.status, ba.sla_due_at,
      bp.product_name, bb.branch_name, bpu.name as officer_name
    FROM bank_applications ba
    LEFT JOIN bank_products bp ON bp.id = ba.bank_product_id
    LEFT JOIN bank_branches bb ON bb.id = ba.bank_branch_id
    LEFT JOIN bank_portal_users bpu ON bpu.id = ba.assigned_to_bank_user_id
    ${scopeWhere}
    AND ba.status NOT IN ('SANCTIONED','REJECTED','DISBURSED','CLOSED')
    AND ba.sla_due_at IS NOT NULL
    ORDER BY ba.sla_due_at ASC LIMIT 10
  `).all(...scopeParams);

  // TAT averages (from events) — JOINs must come before WHERE
  const tatScopeAnd = scopeWhere.replace(/^WHERE /, 'AND ');
  const tatMetrics = db.prepare(`
    SELECT
      AVG(CASE WHEN login_at IS NOT NULL THEN (julianday(login_at) - julianday(created_at)) * 24 ELSE NULL END) as avg_hours_assign_to_login,
      AVG(CASE WHEN sanctioned_at IS NOT NULL AND login_at IS NOT NULL THEN (julianday(sanctioned_at) - julianday(login_at)) * 24 ELSE NULL END) as avg_hours_login_to_sanction
    FROM (
      SELECT ba.id, ba.created_at,
        MIN(CASE WHEN e.event_type='STATUS_CHANGE' AND json_extract(e.details,'$.to')='LOGIN_DONE' THEN e.created_at END) as login_at,
        MIN(CASE WHEN e.event_type='STATUS_CHANGE' AND json_extract(e.details,'$.to')='SANCTIONED' THEN e.created_at END) as sanctioned_at
      FROM bank_applications ba
      LEFT JOIN bank_application_events e ON e.entity_id = ba.id
      WHERE 1=1 ${tatScopeAnd}
      GROUP BY ba.id
    )
  `).get(...scopeParams);

  res.json({
    kpis,
    funnel,
    country_mix: countryMix,
    credit_utilization: creditUtilization,
    branch_performance: branchPerformance,
    officer_leaderboard: officerLeaderboard,
    sla_risk_queue: slaRiskQueue,
    tat_metrics: tatMetrics,
  });
});

// ─── Bank External API (CBS/LOS integration) ─────────────────────────────────

function requireBankApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'API key required' });
  const record = db.prepare('SELECT * FROM bank_api_keys WHERE api_key = ? AND is_active = 1').get(key);
  if (!record) return res.status(401).json({ error: 'Invalid or inactive API key' });
  req.bankApiKey = record;
  next();
}

router.get('/external/applications', requireBankApiKey, (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  let where = 'WHERE bank_id = ?';
  const params = [req.bankApiKey.bank_id];
  if (status) { where += ' AND status = ?'; params.push(status); }
  const apps = db.prepare(`SELECT id, case_id, student_name, country, status, awaiting_from, sla_due_at, submitted_at, updated_at FROM bank_applications ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), parseInt(offset));
  res.json({ applications: apps });
});

router.post('/external/application/status', requireBankApiKey, (req, res) => {
  const { application_id, status, sanction_amount_paise, disbursed_amount_paise, roi_final, rejection_reason } = req.body;
  if (!application_id || !status) return res.status(400).json({ error: 'application_id and status required' });
  const app = db.prepare('SELECT * FROM bank_applications WHERE id = ? AND bank_id = ?').get(application_id, req.bankApiKey.bank_id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  db.prepare('UPDATE bank_applications SET status=?, sanction_amount_paise=COALESCE(?,sanction_amount_paise), disbursed_amount_paise=COALESCE(?,disbursed_amount_paise), roi_final=COALESCE(?,roi_final), rejection_reason=COALESCE(?,rejection_reason), last_bank_update_at=datetime(\'now\'), updated_at=datetime(\'now\') WHERE id=?')
    .run(status, sanction_amount_paise ?? null, disbursed_amount_paise ?? null, roi_final ?? null, rejection_reason ?? null, application_id);
  db.prepare('INSERT INTO bank_application_events (id, bank_id, user_id, event_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuidv4(), req.bankApiKey.bank_id, 'API', 'STATUS_CHANGE', application_id,
    JSON.stringify({ from: app.status, to: status, via: 'API' })
  );
  res.json({ message: 'Status updated via API' });
});

router.post('/external/application/query', requireBankApiKey, (req, res) => {
  const { application_id, title, message } = req.body;
  if (!application_id || !title || !message) return res.status(400).json({ error: 'application_id, title, message required' });
  const app = db.prepare('SELECT id, bank_id FROM bank_applications WHERE id = ? AND bank_id = ?').get(application_id, req.bankApiKey.bank_id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  const id = uuidv4();
  db.prepare('INSERT INTO bank_queries (id, bank_application_id, bank_id, raised_by_actor_type, raised_by_id, raised_by_name, title, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, application_id, app.bank_id, 'BANK', 'API', 'API Integration', title, message);
  res.json({ id, message: 'Query created via API' });
});

router.post('/external/application/sanction', requireBankApiKey, (req, res) => {
  const { application_id, sanction_amount_paise, roi_final, disbursed_amount_paise } = req.body;
  if (!application_id) return res.status(400).json({ error: 'application_id required' });
  const app = db.prepare('SELECT * FROM bank_applications WHERE id = ? AND bank_id = ?').get(application_id, req.bankApiKey.bank_id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  db.prepare('UPDATE bank_applications SET status=\'SANCTIONED\', sanction_amount_paise=COALESCE(?,sanction_amount_paise), roi_final=COALESCE(?,roi_final), disbursed_amount_paise=COALESCE(?,disbursed_amount_paise), last_bank_update_at=datetime(\'now\'), updated_at=datetime(\'now\') WHERE id=?')
    .run(sanction_amount_paise ?? null, roi_final ?? null, disbursed_amount_paise ?? null, application_id);
  db.prepare('INSERT INTO bank_application_events (id, bank_id, user_id, event_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuidv4(), req.bankApiKey.bank_id, 'API', 'STATUS_CHANGE', application_id,
    JSON.stringify({ from: app.status, to: 'SANCTIONED', sanction_amount_paise, via: 'API' })
  );
  res.json({ message: 'Application sanctioned via API' });
});

export default router;
