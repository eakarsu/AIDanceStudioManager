'use strict';
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

async function membership(client, tenantId, userId) {
  const result = await client.query(
    'SELECT role FROM dance_tenant_memberships WHERE tenant_id=$1 AND user_id=$2 AND active=true',
    [tenantId, userId]);
  if (!result.rows[0]) {
    const error = new Error('studio membership required');
    error.status = 403;
    throw error;
  }
  return result.rows[0].role;
}

router.get('/tenants', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id,t.name,m.role FROM dance_tenants t JOIN dance_tenant_memberships m ON m.tenant_id=t.id
       WHERE m.user_id=$1 AND m.active=true ORDER BY t.name`, [req.user.id]);
    res.json(result.rows);
  } catch (_) { res.status(500).json({ error: 'studio tenant list failed' }); }
});

router.get('/tenants/:tenantId/overview', async (req, res) => {
  try {
    const tenantId = req.params.tenantId;
    const role = await membership(pool, tenantId, req.user.id);
    const [sections, students, guardians, consents, enrollments, attendance, ledger] = await Promise.all([
      pool.query(`SELECT s.id,s.program_name,s.teacher_ref,s.room_ref,s.starts_at,s.ends_at,s.term_starts_at,s.term_ends_at,s.capacity,s.term_amount_cents,
        COUNT(e.id) FILTER (WHERE e.status='active')::int AS active_count,
        COUNT(e.id) FILTER (WHERE e.status='waitlisted')::int AS waitlist_count
        FROM dance_sections s LEFT JOIN dance_enrollments e ON e.section_id=s.id AND e.tenant_id=s.tenant_id
        WHERE s.tenant_id=$1 GROUP BY s.id ORDER BY s.starts_at,s.id`, [tenantId]),
      pool.query('SELECT id,external_ref,is_minor FROM dance_students WHERE tenant_id=$1 ORDER BY id', [tenantId]),
      pool.query('SELECT id,external_ref FROM dance_guardians WHERE tenant_id=$1 ORDER BY id', [tenantId]),
      pool.query(`SELECT c.id,c.student_id,c.guardian_id,c.purpose,c.status,c.policy_version,c.granted_at,c.expires_at
        FROM dance_consents c JOIN dance_students s ON s.id=c.student_id WHERE s.tenant_id=$1 ORDER BY c.id DESC`, [tenantId]),
      pool.query('SELECT * FROM dance_enrollments WHERE tenant_id=$1 ORDER BY created_at DESC,id DESC LIMIT 200', [tenantId]),
      pool.query(`SELECT id,enrollment_id,session_at,status,source,created_at FROM dance_attendance_events
        WHERE tenant_id=$1 ORDER BY session_at DESC,id DESC LIMIT 200`, [tenantId]),
      pool.query(`SELECT id,enrollment_id,family_ref,entry_type,amount_cents,currency,policy_version,
        external_payment_ref,reconciled_at,created_at FROM dance_ledger_entries
        WHERE tenant_id=$1 ORDER BY created_at DESC,id DESC LIMIT 200`, [tenantId]),
    ]);
    res.json({ role, sections: sections.rows, students: students.rows, guardians: guardians.rows,
      consents: consents.rows, enrollments: enrollments.rows, attendance: attendance.rows, ledger: ledger.rows });
  } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'studio overview failed' }); }
});

router.post('/attendance', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { tenantId, enrollmentId, sessionAt, status, source } = req.body || {};
    const key = String(req.get('Idempotency-Key') || '');
    const role = await membership(client, tenantId, req.user.id);
    if (!['teacher', 'registrar', 'manager', 'admin'].includes(role)) {
      const error = new Error('attendance role required'); error.status = 403; throw error;
    }
    if (!key || !['present', 'absent', 'late', 'excused', 'makeup'].includes(status) ||
        !sessionAt || Number.isNaN(Date.parse(sessionAt)) || !String(source || '').trim()) {
      throw new Error('valid idempotency key, status, sessionAt and source are required');
    }
    const enrollment = (await client.query(
      'SELECT id,status FROM dance_enrollments WHERE id=$1 AND tenant_id=$2',
      [enrollmentId, tenantId])).rows[0];
    if (!enrollment || !['active', 'completed'].includes(enrollment.status)) throw new Error('active enrollment in this tenant is required');
    const inserted = await client.query(
      `INSERT INTO dance_attendance_events
       (tenant_id,enrollment_id,session_at,status,recorded_by,source,idempotency_key)
       VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (tenant_id,idempotency_key) DO NOTHING RETURNING *`,
      [tenantId, enrollmentId, sessionAt, status, req.user.id, String(source).trim(), key]);
    const item = inserted.rows[0] || (await client.query(
      'SELECT * FROM dance_attendance_events WHERE tenant_id=$1 AND idempotency_key=$2',
      [tenantId, key])).rows[0];
    if (!inserted.rows[0] && (Number(item.enrollment_id) !== Number(enrollmentId) ||
        item.status !== status || new Date(item.session_at).toISOString() !== new Date(sessionAt).toISOString())) {
      const error = new Error('idempotency payload conflict'); error.status = 409; throw error;
    }
    if (inserted.rows[0]) await client.query(
      `INSERT INTO dance_audit_events(tenant_id,aggregate_type,aggregate_id,actor_id,action,payload)
       VALUES($1,'attendance',$2,$3,'attendance.recorded',$4)`,
      [tenantId, item.id, req.user.id, { enrollmentId, status, sessionAt }]);
    await client.query('COMMIT');
    res.status(inserted.rows[0] ? 201 : 200).json(item);
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(error.status || 422).json({ error: error.message });
  } finally { client?.release(); }
});

module.exports = router;
