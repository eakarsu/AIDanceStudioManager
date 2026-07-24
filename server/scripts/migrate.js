'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const pool = require('../db');

async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'parent', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ai_analyses (
    id BIGSERIAL PRIMARY KEY, analysis_type TEXT NOT NULL, input_data_json JSONB,
    result_json JSONB, model_used TEXT, user_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  console.log('Runtime schema migrated');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
