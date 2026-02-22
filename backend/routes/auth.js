import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { requireAuth, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, bank: user.bank };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

  res.json({ token, user: payload });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;
