import db from './db.js';
import bcrypt from 'bcryptjs';

const hash = bcrypt.hashSync('admin123', 10);
db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role, bank) VALUES (?,?,?,?,?)')
  .run('Admin', 'admin2@nexthara.com', hash, 'admin', null);

console.log('Seeded: admin2@nexthara.com / admin123 (role: admin)');
