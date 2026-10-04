'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, name VARCHAR(255),
      email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'parent', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await client.query(fs.readFileSync(
      path.join(__dirname, '..', '..', 'database', 'migrations', '000_legacy_users_compat.sql'),
      'utf8'
    ));
    await client.query(`CREATE TABLE IF NOT EXISTS ai_analyses (
      id BIGSERIAL PRIMARY KEY, analysis_type TEXT NOT NULL, input_data_json JSONB,
      result_json JSONB, model_used TEXT, user_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  console.log('Runtime schema migrated');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
