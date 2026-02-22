import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

// All user routes require auth + super_admin
router.use(requireAuth, requireSuperAdmin);

// GET /api/users
router.get('/', (req, res) => {
  const users = db.prepare(
    'SELECT id, name, email, role, bank, is_active, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});

// POST /api/users
router.post('/', (req, res) => {
  const { name, email, password, role = 'bank_user', bank } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, bank) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, password_hash, role, bank || null);

  const user = db.prepare('SELECT id, name, email, role, bank, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, role, bank, is_active } = req.body;
  const updates = ["updated_at = datetime('now')"];
  const params = { id: req.params.id };

  if (name !== undefined) { updates.push('name = @name'); params.name = name; }
  if (role !== undefined) { updates.push('role = @role'); params.role = role; }
  if (bank !== undefined) { updates.push('bank = @bank'); params.bank = bank; }
  if (is_active !== undefined) { updates.push('is_active = @is_active'); params.is_active = is_active ? 1 : 0; }

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = @id`).run(params);
  const updated = db.prepare('SELECT id, name, email, role, bank, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'Deleted' });
});

export default router;
