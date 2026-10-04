'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createGuardianFamilyRouter(pool) {
  const router = express.Router();
  router.use(authenticate);
  router.use(async (req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    try {
      if (!Number.isSafeInteger(req.user?.id)) return res.status(401).json({ error: 'Account unavailable' });
      // Read the current account state; a signed token may outlive a role change.
      const account = await pool.query(
        "SELECT id FROM users WHERE id=$1 AND role='parent' AND is_active IS TRUE",
        [req.user.id],
      );
      if (!account.rows.length) return res.status(403).json({ error: 'Guardian account required' });
      next();
    } catch (_) { res.status(500).json({ error: 'Guardian account check failed' }); }
  });

  router.get('/studios', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT t.id, t.name FROM dance_guardian_accounts ga
         JOIN dance_tenants t ON t.id=ga.tenant_id
         WHERE ga.user_id=$1 AND ga.revoked_at IS NULL
         ORDER BY t.name,t.id`,
        [req.user.id],
      );
      res.json({ studios: result.rows });
    } catch (_) { res.status(500).json({ error: 'Guardian studios unavailable' }); }
  });

  router.get('/studios/:tenantId/family', async (req, res) => {
    const tenantId = req.params.tenantId;
    if (!UUID.test(tenantId)) return res.status(404).json({ error: 'Studio family not found' });
    try {
      const account = await pool.query(
        `SELECT t.id,t.name,ga.guardian_id FROM dance_guardian_accounts ga
         JOIN dance_tenants t ON t.id=ga.tenant_id
         WHERE ga.tenant_id=$1 AND ga.user_id=$2 AND ga.revoked_at IS NULL`,
        [tenantId, req.user.id],
      );
      if (!account.rows.length) return res.status(404).json({ error: 'Studio family not found' });

      // Each data query repeats the active account and child links. Neither a
      // client-supplied child ID nor a consent row can enlarge this scope.
      const [childrenResult, enrollmentsResult, attendanceResult] = await Promise.all([
        pool.query(
          `SELECT s.id,s.external_ref,s.is_minor FROM dance_guardian_student_links gl
           JOIN dance_guardian_accounts ga ON ga.tenant_id=gl.tenant_id AND ga.guardian_id=gl.guardian_id
             AND ga.user_id=$2 AND ga.revoked_at IS NULL
           JOIN dance_students s ON s.id=gl.student_id AND s.tenant_id=gl.tenant_id
           WHERE gl.tenant_id=$1 AND gl.revoked_at IS NULL
           ORDER BY s.external_ref,s.id LIMIT 201`,
          [tenantId, req.user.id],
        ),
        pool.query(
          `SELECT e.id,e.student_id,e.status,e.status_reason,e.waitlist_position,
                  sec.program_name,sec.starts_at,sec.ends_at,sec.term_starts_at,sec.term_ends_at
           FROM dance_enrollments e
           JOIN dance_sections sec ON sec.id=e.section_id AND sec.tenant_id=e.tenant_id
           JOIN dance_students s ON s.id=e.student_id AND s.tenant_id=e.tenant_id
           JOIN dance_guardian_student_links gl ON gl.student_id=s.id AND gl.tenant_id=e.tenant_id
             AND gl.revoked_at IS NULL
           JOIN dance_guardian_accounts ga ON ga.tenant_id=gl.tenant_id AND ga.guardian_id=gl.guardian_id
             AND ga.user_id=$2 AND ga.revoked_at IS NULL
           WHERE e.tenant_id=$1
           ORDER BY e.created_at DESC,e.id DESC LIMIT 201`,
          [tenantId, req.user.id],
        ),
        pool.query(
          `SELECT a.id,e.student_id,a.session_at,a.status,sec.program_name
           FROM dance_attendance_events a
           JOIN dance_enrollments e ON e.id=a.enrollment_id AND e.tenant_id=a.tenant_id
           JOIN dance_sections sec ON sec.id=e.section_id AND sec.tenant_id=e.tenant_id
           JOIN dance_students s ON s.id=e.student_id AND s.tenant_id=e.tenant_id
           JOIN dance_guardian_student_links gl ON gl.student_id=s.id AND gl.tenant_id=a.tenant_id
             AND gl.revoked_at IS NULL
           JOIN dance_guardian_accounts ga ON ga.tenant_id=gl.tenant_id AND ga.guardian_id=gl.guardian_id
             AND ga.user_id=$2 AND ga.revoked_at IS NULL
           WHERE a.tenant_id=$1
           ORDER BY a.session_at DESC,a.id DESC LIMIT 201`,
          [tenantId, req.user.id],
        ),
      ]);
      const children = childrenResult.rows.slice(0, 200);
      const childIds = new Set(children.map(row => String(row.id)));
      res.json({
        studio: { id: account.rows[0].id, name: account.rows[0].name },
        children,
        enrollments: enrollmentsResult.rows.slice(0, 200).filter(row => childIds.has(String(row.student_id))),
        attendance: attendanceResult.rows.slice(0, 200).filter(row => childIds.has(String(row.student_id))),
        more: {
          children: childrenResult.rows.length > 200,
          enrollments: enrollmentsResult.rows.length > 200,
          attendance: attendanceResult.rows.length > 200,
        },
      });
    } catch (_) { res.status(500).json({ error: 'Guardian family unavailable' }); }
  });

  return router;
}

module.exports = createGuardianFamilyRouter;
