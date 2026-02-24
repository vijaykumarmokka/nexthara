import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

// Frozen internal role enum
const INTERNAL_ROLES = ['SUPER_ADMIN', 'LOAN_HEAD', 'LOAN_EXECUTIVE'];

// All user routes require auth + SUPER_ADMIN
router.use(requireAuth, requireSuperAdmin);

// GET /api/users
router.get('/', (req, res) => {
  const users = db.prepare(
    `SELECT id, name, full_name, email, role, bank, phone_e164,
            organization_id, branch_id, is_active, last_login_at, created_at
     FROM users ORDER BY created_at DESC`
  ).all();
  res.json(users);
});

// POST /api/users
router.post('/', (req, res) => {
  const { name, email, password, role = 'LOAN_EXECUTIVE', bank, phone_e164, branch_id } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (!INTERNAL_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${INTERNAL_ROLES.join(', ')}` });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    `INSERT INTO users (name, full_name, email, password_hash, role, bank, phone_e164, organization_id, branch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ORG-NEXTHARA', ?)`
  ).run(name, name, email, password_hash, role, bank || null, phone_e164 || null, branch_id || null);

  const user = db.prepare(
    `SELECT id, name, full_name, email, role, bank, phone_e164, organization_id, branch_id, is_active, created_at
     FROM users WHERE id = ?`
  ).get(result.lastInsertRowid);
  res.status(201).json(user);
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, role, bank, is_active, phone_e164, branch_id, full_name } = req.body;

  if (role !== undefined && !INTERNAL_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role must be one of: ${INTERNAL_ROLES.join(', ')}` });
  }

  const updates = ["updated_at = datetime('now')"];
  const params = { id: req.params.id };

  if (name !== undefined)      { updates.push('name = @name');           params.name = name; }
  if (full_name !== undefined) { updates.push('full_name = @full_name'); params.full_name = full_name; }
  if (role !== undefined)      { updates.push('role = @role');           params.role = role; }
  if (bank !== undefined)      { updates.push('bank = @bank');           params.bank = bank; }
  if (is_active !== undefined) { updates.push('is_active = @is_active'); params.is_active = is_active ? 1 : 0; }
  if (phone_e164 !== undefined){ updates.push('phone_e164 = @phone_e164'); params.phone_e164 = phone_e164; }
  if (branch_id !== undefined) { updates.push('branch_id = @branch_id'); params.branch_id = branch_id; }

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = @id`).run(params);
  const updated = db.prepare(
    `SELECT id, name, full_name, email, role, bank, phone_e164, organization_id, branch_id, is_active, last_login_at, created_at
     FROM users WHERE id = ?`
  ).get(req.params.id);
  res.json(updated);
});

// PATCH /api/users/:id/reset-password
router.patch('/:id/reset-password', (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const password_hash = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(password_hash, req.params.id);
  res.json({ message: 'Password reset successfully' });
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'Deleted' });
});

export default router;
