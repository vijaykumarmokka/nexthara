import bcrypt from 'bcryptjs';
import db from './db.js';

const users = [
  { name: 'Super Admin',  email: 'admin@nexthara.com',  password: 'admin123', role: 'super_admin', bank: null },
  { name: 'SBI Manager',  email: 'sbi@nexthara.com',    password: 'bank123',  role: 'bank_user',   bank: 'SBI' },
  { name: 'HDFC Manager', email: 'hdfc@nexthara.com',   password: 'bank123',  role: 'bank_user',   bank: 'HDFC' },
  { name: 'ICICI Manager',email: 'icici@nexthara.com',  password: 'bank123',  role: 'bank_user',   bank: 'ICICI' },
  { name: 'Axis Manager', email: 'axis@nexthara.com',   password: 'bank123',  role: 'bank_user',   bank: 'Axis Bank' },
  { name: 'PNB Manager',  email: 'pnb@nexthara.com',    password: 'bank123',  role: 'bank_user',   bank: 'PNB' },
];

const insert = db.prepare(
  'INSERT OR IGNORE INTO users (name, email, password_hash, role, bank) VALUES (?, ?, ?, ?, ?)'
);

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  insert.run(u.name, u.email, hash, u.role, u.bank);
  console.log(`Seeded: ${u.email}`);
}

console.log('Done seeding users.');
