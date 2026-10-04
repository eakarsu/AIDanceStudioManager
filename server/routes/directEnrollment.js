'use strict';

const { createHash } = require('node:crypto');
const pool = require('../db');
const { hasConflict, enrollmentDecision, prorateCents } = require('../domain/studioPolicy');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENROLLMENT_ROLES = new Set(['registrar', 'manager', 'admin']);

function fail(message, status = 422) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function recordId(value) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '')
    throw fail('A valid record ID is required');
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw fail('A valid record ID is required');
  return id;
}

module.exports = async function directEnrollment(req, res) {
  let client;
  try {
    const tenantId = String(req.body?.tenantId || '');
    if (!UUID.test(tenantId)) throw fail('Studio unavailable', 404);
    const studentId = recordId(req.body?.studentId);
    const sectionId = recordId(req.body?.sectionId);
    const guardianId = req.body?.guardianId == null || req.body.guardianId === ''
      ? null : recordId(req.body.guardianId);
    const joined = new Date(req.body?.enrollmentDate);
    if (Number.isNaN(joined.getTime())) throw fail('A valid enrollment date is required');
    const key = String(req.get('Idempotency-Key') || '');
    if (key.length < 8 || key.length > 128) throw fail('Idempotency-Key must contain 8 to 128 characters');
    const requestHash = createHash('sha256').update(JSON.stringify({
      actorId: req.user.id, tenantId, studentId, sectionId, guardianId, enrollmentDate: joined.toISOString(),
    })).digest('hex');

    client = await pool.connect();
    await client.query('BEGIN');
    const membership = await client.query(
      `SELECT m.role FROM dance_tenant_memberships m
       JOIN users u ON u.id=m.user_id AND u.is_active IS TRUE
         AND u.role IN ('admin','staff','teacher')
       WHERE m.tenant_id=$1 AND m.user_id=$2 AND m.active IS TRUE`,
      [tenantId, req.user.id],
    );
    if (!ENROLLMENT_ROLES.has(membership.rows[0]?.role))
      throw fail('Registrar or manager role required', 403);

    // One tenant/key at a time makes retries return the first committed record.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [tenantId, key]);
    const earlier = (await client.query(
      `SELECT * FROM dance_enrollments WHERE tenant_id=$1 AND idempotency_key=$2`,
      [tenantId, key],
    )).rows[0];
    if (earlier) {
      if (!earlier.request_hash || earlier.request_hash !== requestHash)
        throw fail('Idempotency payload conflict', 409);
      await client.query('COMMIT');
      return res.status(200).json({ ...earlier, replayed: true });
    }

    // Guardian request review takes the same child lock before its section lock.
    const student = (await client.query(
      `SELECT * FROM dance_students WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,
      [studentId, tenantId],
    )).rows[0];
    if (!student) throw fail('Student unavailable in this studio', 404);
    const section = (await client.query(
      `SELECT * FROM dance_sections WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,
      [sectionId, tenantId],
    )).rows[0];
    if (!section || new Date(section.term_ends_at) <= new Date())
      throw fail('Open section unavailable in this studio', 404);
    const existing = await client.query(
      `SELECT 1 FROM dance_enrollments WHERE tenant_id=$1 AND student_id=$2 AND section_id=$3`,
      [tenantId, studentId, sectionId],
    );
    if (existing.rows.length) throw fail('This student already has an enrollment record for this class', 409);
    const slots = await client.query(
      `SELECT s.starts_at AS "startsAt",s.ends_at AS "endsAt"
       FROM dance_enrollments e JOIN dance_sections s
         ON s.id=e.section_id AND s.tenant_id=e.tenant_id
       WHERE e.tenant_id=$1 AND e.student_id=$2 AND e.status='active'`,
      [tenantId, studentId],
    );
    const counts = (await client.query(
      `SELECT COUNT(*) FILTER(WHERE status='active')::int AS enrolled,
              COUNT(*) FILTER(WHERE status='waitlisted')::int AS waitlisted
       FROM dance_enrollments WHERE tenant_id=$1 AND section_id=$2`,
      [tenantId, sectionId],
    )).rows[0];
    const placement = enrollmentDecision({ studentId, sectionId,
      studentAge: student.is_minor ? 17 : 18, guardianId,
      guardianConsentActive: true,
      scheduleConflict: hasConflict(slots.rows, { startsAt: section.starts_at, endsAt: section.ends_at }),
      enrolled: counts.enrolled, capacity: section.capacity, waitlistCount: counts.waitlisted,
    });
    const waitlistPosition = placement.status === 'waitlisted' ? Number((await client.query(
      `SELECT COALESCE(MAX(waitlist_position),0)+1 AS position
       FROM dance_enrollments WHERE tenant_id=$1 AND section_id=$2 AND status='waitlisted'`,
      [tenantId, sectionId],
    )).rows[0].position) : null;
    const tuition = prorateCents(section.term_amount_cents,
      new Date(section.term_starts_at), new Date(section.term_ends_at), joined);
    if (student.is_minor) {
      if (!guardianId) throw fail('A guardian is required for a minor', 409);
      const consent = await client.query(
        `SELECT 1 FROM dance_consents
         WHERE student_id=$1 AND guardian_id=$2 AND purpose='program_participation'
           AND status='granted' AND revoked_at IS NULL
           AND granted_at<=clock_timestamp() AND expires_at>clock_timestamp()
         LIMIT 1 FOR SHARE`,
        [studentId, guardianId],
      );
      if (!consent.rows.length) throw fail('Current participation consent is required', 409);
    }
    const created = (await client.query(
      `INSERT INTO dance_enrollments
       (tenant_id,student_id,section_id,status,status_reason,waitlist_position,
        tuition_cents,idempotency_key,request_hash,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenantId, studentId, sectionId, placement.status, placement.reason,
        waitlistPosition, tuition, key, requestHash, req.user.id],
    )).rows[0];
    await client.query(
      `INSERT INTO dance_audit_events
       (tenant_id,aggregate_type,aggregate_id,actor_id,action,payload)
       VALUES($1,'enrollment',$2,$3,'enrollment.requested',$4)`,
      [tenantId, created.id, req.user.id,
        { placement, waitlistPosition, tuitionCents: tuition, requestHash }],
    );
    await client.query('COMMIT');
    res.status(201).json(created);
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    const status = error.status || (error.code === '23505' ? 409 : 422);
    res.status(status).json({ error: error.status ? error.message :
      error.code === '23505' ? 'Conflicting enrollment record' : 'Direct enrollment failed' });
  } finally { client?.release(); }
};
