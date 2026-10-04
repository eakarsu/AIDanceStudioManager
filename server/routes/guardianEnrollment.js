'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const { hasConflict, enrollmentDecision, prorateCents } = require('../domain/studioPolicy');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REVIEW_ROLES = new Set(['registrar', 'manager', 'admin']);

function fail(message, status = 422) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function positiveId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw fail('A valid record ID is required');
  return id;
}

async function guardianAccount(client, tenantId, userId, lock = false) {
  const account = await client.query(
    `SELECT ga.guardian_id FROM dance_guardian_accounts ga
     JOIN users u ON u.id=ga.user_id AND u.role='parent' AND u.is_active IS TRUE
     WHERE ga.tenant_id=$1 AND ga.user_id=$2 AND ga.revoked_at IS NULL
     ${lock ? 'FOR SHARE OF ga' : ''}`,
    [tenantId, userId],
  );
  if (!account.rows[0]) throw fail('Studio guardian access unavailable', 404);
  return account.rows[0];
}

async function activeChild(client, tenantId, guardianId, studentId, lock = false) {
  const linked = await client.query(
    `SELECT s.id,s.is_minor FROM dance_guardian_student_links gl
     JOIN dance_students s ON s.id=gl.student_id AND s.tenant_id=gl.tenant_id
     WHERE gl.tenant_id=$1 AND gl.guardian_id=$2 AND gl.student_id=$3 AND gl.revoked_at IS NULL
     ${lock ? 'FOR SHARE OF gl' : ''}`,
    [tenantId, guardianId, studentId],
  );
  if (!linked.rows[0]) throw fail('Linked child unavailable', 404);
  return linked.rows[0];
}

async function participationConsent(client, studentId, guardianId) {
  const consent = await client.query(
    `SELECT 1 FROM dance_consents
     WHERE student_id=$1 AND guardian_id=$2 AND purpose='program_participation'
       AND status='granted' AND revoked_at IS NULL
       AND granted_at<=clock_timestamp() AND expires_at>clock_timestamp() LIMIT 1 FOR SHARE`,
    [studentId, guardianId],
  );
  return consent.rows.length > 0;
}

async function staffRole(client, tenantId, userId) {
  const membership = await client.query(
    `SELECT m.role FROM dance_tenant_memberships m
     JOIN users u ON u.id=m.user_id AND u.is_active IS TRUE
     WHERE m.tenant_id=$1 AND m.user_id=$2 AND m.active IS TRUE`,
    [tenantId, userId],
  );
  if (!REVIEW_ROLES.has(membership.rows[0]?.role)) throw fail('Registrar or manager role required', 403);
}

function guardianEnrollmentRouter(pool) {
  const router = express.Router();
  router.use(authenticate);
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

  router.get('/studios/:tenantId/sections', async (req, res) => {
    try {
      if (!UUID.test(req.params.tenantId)) throw fail('Studio unavailable', 404);
      await guardianAccount(pool, req.params.tenantId, req.user.id);
      const sections = await pool.query(
        `SELECT s.id,s.program_name,s.starts_at,s.ends_at,s.term_starts_at,s.term_ends_at,
                s.term_amount_cents,s.capacity,
                COUNT(e.id) FILTER (WHERE e.status='active')::int AS active_count,
                COUNT(e.id) FILTER (WHERE e.status='waitlisted')::int AS waitlist_count
         FROM dance_sections s LEFT JOIN dance_enrollments e
           ON e.section_id=s.id AND e.tenant_id=s.tenant_id
         WHERE s.tenant_id=$1 AND s.term_ends_at>NOW()
         GROUP BY s.id ORDER BY s.starts_at,s.id LIMIT 200`,
        [req.params.tenantId],
      );
      res.json({ sections: sections.rows });
    } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Sections unavailable' }); }
  });

  router.get('/studios/:tenantId/enrollment-requests', async (req, res) => {
    try {
      if (!UUID.test(req.params.tenantId)) throw fail('Studio unavailable', 404);
      const account = await guardianAccount(pool, req.params.tenantId, req.user.id);
      const result = await pool.query(
        `SELECT r.id,r.student_id,r.section_id,r.status,r.enrollment_id,r.review_reason,
                r.requested_at,r.reviewed_at,s.program_name
         FROM dance_guardian_enrollment_requests r
         JOIN dance_guardian_student_links gl ON gl.tenant_id=r.tenant_id
           AND gl.guardian_id=r.guardian_id AND gl.student_id=r.student_id AND gl.revoked_at IS NULL
         JOIN dance_sections s ON s.tenant_id=r.tenant_id AND s.id=r.section_id
         WHERE r.tenant_id=$1 AND r.guardian_id=$2 AND r.guardian_user_id=$3
         ORDER BY r.requested_at DESC,r.id DESC LIMIT 200`,
        [req.params.tenantId, account.guardian_id, req.user.id],
      );
      res.json({ requests: result.rows });
    } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Requests unavailable' }); }
  });

  router.post('/studios/:tenantId/enrollment-requests', async (req, res) => {
    let client;
    try {
      const tenantId = req.params.tenantId;
      if (!UUID.test(tenantId)) throw fail('Studio unavailable', 404);
      const studentId = positiveId(req.body?.studentId);
      const sectionId = positiveId(req.body?.sectionId);
      const key = String(req.get('Idempotency-Key') || '');
      if (key.length < 8 || key.length > 128) throw fail('Idempotency-Key must contain 8 to 128 characters');
      client = await pool.connect();
      await client.query('BEGIN');
      const account = await guardianAccount(client, tenantId, req.user.id, true);
      const child = await activeChild(client, tenantId, account.guardian_id, studentId, true);
      // Serialize retries for this account/key before the read-then-insert receipt check.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [tenantId, `${req.user.id}:${key}`]);
      const earlier = await client.query(
        `SELECT * FROM dance_guardian_enrollment_requests
         WHERE tenant_id=$1 AND guardian_user_id=$2 AND idempotency_key=$3`,
        [tenantId, req.user.id, key],
      );
      if (earlier.rows[0]) {
        const old = earlier.rows[0];
        if (Number(old.student_id) !== studentId || Number(old.section_id) !== sectionId)
          throw fail('Idempotency payload conflict', 409);
        await client.query('COMMIT');
        return res.status(200).json({ request: old, replayed: true });
      }
      const section = await client.query(
        `SELECT id FROM dance_sections WHERE tenant_id=$1 AND id=$2 AND term_ends_at>clock_timestamp()`,
        [tenantId, sectionId],
      );
      if (!section.rows[0]) throw fail('Open section unavailable', 404);
      if (child.is_minor && !(await participationConsent(client, studentId, account.guardian_id)))
        throw fail('Current participation consent is required', 409);
      const enrolled = await client.query(
        `SELECT 1 FROM dance_enrollments WHERE tenant_id=$1 AND student_id=$2 AND section_id=$3 LIMIT 1`,
        [tenantId, studentId, sectionId],
      );
      if (enrolled.rows.length) throw fail('This child already has an enrollment record for this class', 409);
      const inserted = await client.query(
        `INSERT INTO dance_guardian_enrollment_requests
         (tenant_id,guardian_id,student_id,section_id,guardian_user_id,idempotency_key)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [tenantId, account.guardian_id, studentId, sectionId, req.user.id, key],
      );
      const request = inserted.rows[0];
      await client.query(
        `INSERT INTO dance_audit_events(tenant_id,aggregate_type,aggregate_id,actor_id,action,payload)
         VALUES($1,'guardian_enrollment_request',$2,$3,'guardian_enrollment.requested',$4)`,
        [tenantId, request.id, req.user.id, { studentId, sectionId }],
      );
      await client.query('COMMIT');
      res.status(201).json({ request, replayed: false });
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      const status = error.code === '23505' ? 409 : (error.status || 500);
      res.status(status).json({ error: status === 409 && error.code === '23505'
        ? 'An enrollment request for this child and class is already pending' :
        (error.status ? error.message : 'Enrollment request failed') });
    } finally { client?.release(); }
  });

  router.post('/studios/:tenantId/enrollment-requests/:requestId/cancel', async (req, res) => {
    let client;
    try {
      const tenantId = req.params.tenantId;
      if (!UUID.test(tenantId)) throw fail('Studio unavailable', 404);
      const requestId = positiveId(req.params.requestId);
      client = await pool.connect();
      await client.query('BEGIN');
      const account = await guardianAccount(client, tenantId, req.user.id, true);
      const result = await client.query(
        `SELECT * FROM dance_guardian_enrollment_requests
         WHERE id=$1 AND tenant_id=$2 AND guardian_id=$3 AND guardian_user_id=$4 FOR UPDATE`,
        [requestId, tenantId, account.guardian_id, req.user.id],
      );
      const item = result.rows[0];
      if (!item) throw fail('Enrollment request unavailable', 404);
      await activeChild(client, tenantId, account.guardian_id, Number(item.student_id), true);
      if (item.status === 'cancelled') {
        await client.query('COMMIT');
        return res.json({ request: item, replayed: true });
      }
      if (item.status !== 'pending') throw fail('Only a pending request can be cancelled', 409);
      const updated = await client.query(
        `UPDATE dance_guardian_enrollment_requests
         SET status='cancelled',reviewed_by=$2,reviewed_at=NOW() WHERE id=$1 RETURNING *`,
        [requestId, req.user.id],
      );
      await client.query(
        `INSERT INTO dance_audit_events(tenant_id,aggregate_type,aggregate_id,actor_id,action,payload)
         VALUES($1,'guardian_enrollment_request',$2,$3,'guardian_enrollment.cancelled','{}'::jsonb)`,
        [tenantId, requestId, req.user.id],
      );
      await client.query('COMMIT');
      res.json({ request: updated.rows[0] });
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      res.status(error.status || 500).json({ error: error.status ? error.message : 'Request cancellation failed' });
    } finally { client?.release(); }
  });
  return router;
}

function staffEnrollmentReviewRouter(pool) {
  const router = express.Router();
  router.use(authenticate);
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

  router.get('/tenants/:tenantId/enrollment-requests', async (req, res) => {
    try {
      if (!UUID.test(req.params.tenantId)) throw fail('Studio unavailable', 404);
      await staffRole(pool, req.params.tenantId, req.user.id);
      const result = await pool.query(
        `SELECT r.id,r.student_id,r.section_id,r.status,r.requested_at,r.reviewed_at,
                r.review_reason,r.enrollment_id,s.external_ref AS student_ref,
                g.external_ref AS guardian_ref,sec.program_name
         FROM dance_guardian_enrollment_requests r
         JOIN dance_students s ON s.id=r.student_id AND s.tenant_id=r.tenant_id
         JOIN dance_guardians g ON g.id=r.guardian_id AND g.tenant_id=r.tenant_id
         JOIN dance_sections sec ON sec.id=r.section_id AND sec.tenant_id=r.tenant_id
         WHERE r.tenant_id=$1 ORDER BY (r.status='pending') DESC,r.requested_at DESC,r.id DESC LIMIT 200`,
        [req.params.tenantId],
      );
      res.json({ requests: result.rows });
    } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Requests unavailable' }); }
  });

  router.post('/tenants/:tenantId/enrollment-requests/:requestId/decision', async (req, res) => {
    let client;
    try {
      const tenantId = req.params.tenantId;
      if (!UUID.test(tenantId)) throw fail('Studio unavailable', 404);
      const requestId = positiveId(req.params.requestId);
      const decision = req.body?.decision;
      const reason = String(req.body?.reason || '').trim();
      if (!['accept', 'decline'].includes(decision)) throw fail('Accept or decline is required');
      if (reason.length > 500 || (decision === 'decline' && !reason))
        throw fail('A short reason is required for a decline');
      if (decision === 'accept' && req.body?.ageSkillVerified !== true)
        throw fail('Staff must attest age and skill suitability before placement', 409);
      client = await pool.connect();
      await client.query('BEGIN');
      await staffRole(client, tenantId, req.user.id);
      if (decision === 'accept') {
        const reference = await client.query(
          `SELECT guardian_user_id FROM dance_guardian_enrollment_requests WHERE id=$1 AND tenant_id=$2`,
          [requestId, tenantId],
        );
        if (!reference.rows[0]) throw fail('Enrollment request unavailable', 404);
        await guardianAccount(client, tenantId, reference.rows[0].guardian_user_id, true);
      }
      const found = await client.query(
        `SELECT * FROM dance_guardian_enrollment_requests
         WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,
        [requestId, tenantId],
      );
      const item = found.rows[0];
      if (!item) throw fail('Enrollment request unavailable', 404);
      if (item.status !== 'pending') throw fail('Request has already been resolved', 409);
      let enrollment = null;
      let status = 'declined';
      if (decision === 'accept') {
        const child = await activeChild(client, tenantId, item.guardian_id, Number(item.student_id), true);
        // Different request/section rows can target the same child. This row lock
        // makes the subsequent active-enrollment schedule check serial for them.
        await client.query('SELECT id FROM dance_students WHERE tenant_id=$1 AND id=$2 FOR UPDATE',
          [tenantId, item.student_id]);
        const section = (await client.query(
          `SELECT * FROM dance_sections WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,
          [tenantId, item.section_id],
        )).rows[0];
        if (!section || new Date(section.term_ends_at) <= new Date())
          throw fail('The class term is no longer open', 409);
        const already = await client.query(
          `SELECT 1 FROM dance_enrollments WHERE tenant_id=$1 AND student_id=$2 AND section_id=$3`,
          [tenantId, item.student_id, item.section_id],
        );
        if (already.rows.length) throw fail('Child already has an enrollment record for this class', 409);
        const slots = await client.query(
          `SELECT sec.starts_at AS "startsAt",sec.ends_at AS "endsAt"
           FROM dance_enrollments e JOIN dance_sections sec ON sec.id=e.section_id AND sec.tenant_id=e.tenant_id
           WHERE e.tenant_id=$1 AND e.student_id=$2 AND e.status='active'`,
          [tenantId, item.student_id],
        );
        const counts = (await client.query(
          `SELECT COUNT(*) FILTER (WHERE status='active')::int AS enrolled,
                  COUNT(*) FILTER (WHERE status='waitlisted')::int AS waitlisted
           FROM dance_enrollments WHERE tenant_id=$1 AND section_id=$2`,
          [tenantId, section.id],
        )).rows[0];
        const placement = enrollmentDecision({
          studentId: item.student_id, sectionId: section.id,
          studentAge: child.is_minor ? 17 : 18, guardianId: item.guardian_id,
          guardianConsentActive: true,
          scheduleConflict: hasConflict(slots.rows, { startsAt: section.starts_at, endsAt: section.ends_at }),
          enrolled: counts.enrolled, capacity: section.capacity, waitlistCount: counts.waitlisted,
        });
        const waitlistPosition = placement.status === 'waitlisted' ? Number((await client.query(
          `SELECT COALESCE(MAX(waitlist_position),0)+1 AS position
           FROM dance_enrollments WHERE tenant_id=$1 AND section_id=$2 AND status='waitlisted'`,
          [tenantId, section.id],
        )).rows[0].position) : null;
        const now = new Date();
        const joined = new Date(section.term_starts_at) > now ? new Date(section.term_starts_at) : now;
        const tuition = prorateCents(section.term_amount_cents,
          new Date(section.term_starts_at), new Date(section.term_ends_at), joined);
        // Recheck immediately before enrollment: NOW() is fixed at BEGIN, while
        // a consent may expire as this review waits on row locks.
        if (child.is_minor && !(await participationConsent(client, item.student_id, item.guardian_id)))
          throw fail('Participation consent expired or was revoked', 409);
        enrollment = (await client.query(
          `INSERT INTO dance_enrollments
           (tenant_id,student_id,section_id,status,status_reason,waitlist_position,tuition_cents,idempotency_key,created_by)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [tenantId, item.student_id, section.id, placement.status, placement.reason,
            waitlistPosition, tuition, `guardian-request-${requestId}`, req.user.id],
        )).rows[0];
        status = placement.status === 'active' ? 'enrolled' : placement.status;
        await client.query(
          `INSERT INTO dance_audit_events(tenant_id,aggregate_type,aggregate_id,actor_id,action,payload)
           VALUES($1,'enrollment',$2,$3,'enrollment.guardian_request_reviewed',$4)`,
          [tenantId, enrollment.id, req.user.id,
            { requestId, placement, ageSkillVerified: true, tuitionCents: tuition, paymentStatus: 'unverified' }],
        );
      }
      const updated = (await client.query(
        `UPDATE dance_guardian_enrollment_requests
         SET status=$2,enrollment_id=$3,review_reason=$4,reviewed_by=$5,reviewed_at=NOW()
         WHERE id=$1 RETURNING *`,
        [requestId, status, enrollment?.id || null, reason || null, req.user.id],
      )).rows[0];
      await client.query(
        `INSERT INTO dance_audit_events(tenant_id,aggregate_type,aggregate_id,actor_id,action,payload)
         VALUES($1,'guardian_enrollment_request',$2,$3,$4,$5)`,
        [tenantId, requestId, req.user.id, `guardian_enrollment.${status}`,
          { enrollmentId: enrollment?.id || null, reason: reason || null, paymentStatus: 'unverified' }],
      );
      await client.query('COMMIT');
      res.json({ request: updated, enrollment, paymentStatus: 'unverified' });
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      res.status(error.status || (error.code === '23505' ? 409 : 500)).json({ error:
        error.status ? error.message : error.code === '23505' ? 'Conflicting enrollment record' : 'Review failed' });
    } finally { client?.release(); }
  });
  return router;
}

module.exports = { guardianEnrollmentRouter, staffEnrollmentReviewRouter };
