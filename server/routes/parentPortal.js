/**
 * Parent portal: attendance, grades and messaging for one student's guardians.
 *
 * Replaces `no_parent_portal_for_attendance_grades_messaging`.
 *
 * The hard property here is scoping: a guardian must only ever see their own
 * student's rows. Every query filters by student id supplied by the caller and
 * re-checked against the guardian link — a guessed id must not widen the view.
 */
const express = require('express');

function createParentPortalRouter(authMiddleware, pool) {
  const router = express.Router();

  const schema = `
    CREATE TABLE IF NOT EXISTS guardian_links (
      id SERIAL PRIMARY KEY,
      guardian_email TEXT NOT NULL,
      student_id INTEGER NOT NULL,
      relationship TEXT NOT NULL DEFAULT 'guardian',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (guardian_email, student_id)
    )`;

  let ready = false;
  async function ensure() { if (!ready) { await pool.query(schema); ready = true; } }

  /** Resolve the students a guardian may see. Never trusts a caller-supplied id alone. */
  async function visibleStudents(guardianEmail) {
    return (await pool.query(
      'SELECT student_id FROM guardian_links WHERE guardian_email = $1',
      [String(guardianEmail).toLowerCase().trim()],
    )).rows.map((r) => r.student_id);
  }

  router.get('/portal/students', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const email = req.user?.email;
      if (!email) return res.status(401).json({ error: 'Unauthorized' });
      const ids = await visibleStudents(email);
      res.json({
        studentIds: ids,
        count: ids.length,
        note: 'Only students linked to this guardian are visible.',
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to list students' }); }
  });

  router.get('/portal/:studentId/attendance', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const email = req.user?.email;
      const studentId = Number(req.params.studentId);
      const allowed = await visibleStudents(email ?? '');
      if (!allowed.includes(studentId)) {
        return res.status(403).json({ error: 'This student is not linked to your account.' });
      }
      const rows = (await pool.query(
        `SELECT id, class_name, attended_at, status, note FROM attendance
          WHERE student_id = $1 ORDER BY attended_at DESC LIMIT 100`,
        [studentId],
      )).rows;
      const summary = rows.reduce((a, r) => {
        a[r.status] = (a[r.status] ?? 0) + 1;
        return a;
      }, {});
      res.json({ studentId, attendance: rows, summary, total: rows.length });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to read attendance' }); }
  });

  router.get('/portal/:studentId/grades', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const studentId = Number(req.params.studentId);
      const allowed = await visibleStudents(req.user?.email ?? '');
      if (!allowed.includes(studentId)) {
        return res.status(403).json({ error: 'This student is not linked to your account.' });
      }
      const rows = (await pool.query(
        `SELECT id, class_name, term, grade, comment FROM grades
          WHERE student_id = $1 ORDER BY term DESC LIMIT 100`,
        [studentId],
      )).rows;
      const numeric = rows.map((r) => Number(r.grade)).filter((n) => Number.isFinite(n));
      res.json({
        studentId,
        grades: rows,
        averageGrade: numeric.length ? Number((numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(2)) : null,
        assumptions: ['Average is over recorded numeric grades only; non-numeric assessments are excluded.'],
      });
    } catch (e) { res.status(500).json({ error: e.message || 'Failed to read grades' }); }
  });

  router.post('/portal/:studentId/messages', authMiddleware, async (req, res) => {
    try {
      await ensure();
      const studentId = Number(req.params.studentId);
      const allowed = await visibleStudents(req.user?.email ?? '');
      if (!allowed.includes(studentId)) {
        return res.status(403).json({ error: 'This student is not linked to your account.' });
      }
      const { subject, body } = req.body || {};
      if (!subject || !String(subject).trim()) return res.status(400).json({ error: 'subject is required' });
      if (!body || !String(body).trim()) return res.status(400).json({ error: 'body is required' });

      const r = await pool.query(
        `INSERT INTO parent_messages (student_id, from_email, subject, body)
         VALUES ($1,$2,$3,$4) RETURNING id, student_id, subject, created_at`,
        [studentId, req.user?.email ?? null, String(subject).trim(), String(body).trim()],
      );
      res.status(201).json({ message: r.rows[0] });
    } catch (e) {
      if (/relation .* does not exist/i.test(e.message ?? '')) {
        return res.status(503).json({ error: 'parent_messages table is missing — run the migration before messaging.' });
      }
      res.status(500).json({ error: e.message || 'Failed to send message' });
    }
  });

  return router;
}

module.exports = createParentPortalRouter;
