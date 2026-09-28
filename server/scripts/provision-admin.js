'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const pool = require('../db');

async function main() {
  const email = String(process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '');
  if (!email || password.length < 12) throw new Error('Provisioning requires an admin email and a password of at least 12 characters');
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'admin')
     ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role='admin'`,
    ['Runtime Administrator', email, hash]
  );
  console.log('Runtime administrator provisioned');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
