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
    `INSERT INTO users(first_name,last_name,email,password,role) VALUES($1,$2,$3,$4,'admin')
     ON CONFLICT(email) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,password=EXCLUDED.password,role='admin'`,
    ['Runtime', 'Administrator', email, hash]
  );
  console.log('Runtime administrator provisioned');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
