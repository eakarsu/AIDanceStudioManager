const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/analytics/attendance
// Query params: class_id, student_id, start_date, end_date
router.get('/attendance', async (req, res) => {
  try {
    const { class_id, student_id, start_date, end_date } = req.query;
    const params = [];
    const conditions = [];

    if (start_date) { params.push(start_date); conditions.push(`a.date >= $${params.length}`); }
    if (end_date) { params.push(end_date); conditions.push(`a.date <= $${params.length}`); }
    if (class_id) { params.push(class_id); conditions.push(`a.class_id = $${params.length}`); }
    if (student_id) { params.push(student_id); conditions.push(`a.student_id = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Overall attendance rate
    const overallResult = await pool.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE status = 'present') as present_count,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
        COUNT(*) FILTER (WHERE status = 'late') as late_count,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status = 'present') / NULLIF(COUNT(*), 0), 2
        ) as attendance_rate
      FROM attendance a ${where}
    `, params);

    // By class
    const byClassResult = await pool.query(`
      SELECT
        a.class_id,
        c.name as class_name,
        c.style,
        c.level,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE a.status = 'present') as present_count,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE a.status = 'present') / NULLIF(COUNT(*), 0), 2
        ) as attendance_rate
      FROM attendance a
      LEFT JOIN classes c ON a.class_id = c.id
      ${where}
      GROUP BY a.class_id, c.name, c.style, c.level
      ORDER BY attendance_rate DESC
    `, params);

    // By student (top 20 with lowest attendance)
    const byStudentResult = await pool.query(`
      SELECT
        a.student_id,
        s.first_name || ' ' || s.last_name as student_name,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE a.status = 'present') as present_count,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE a.status = 'present') / NULLIF(COUNT(*), 0), 2
        ) as attendance_rate
      FROM attendance a
      LEFT JOIN students s ON a.student_id = s.id
      ${where}
      GROUP BY a.student_id, s.first_name, s.last_name
      ORDER BY attendance_rate ASC
      LIMIT 20
    `, params);

    res.json({
      success: true,
      filters: { class_id, student_id, start_date, end_date },
      overall: overallResult.rows[0],
      by_class: byClassResult.rows,
      lowest_attendance_students: byStudentResult.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/enrollment-trends
// Query params: months (default 12)
router.get('/enrollment-trends', async (req, res) => {
  try {
    const months = Math.min(36, parseInt(req.query.months) || 12);

    // Monthly enrollment counts
    const monthlyResult = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        COUNT(*) as new_enrollments
      FROM enrollment
      WHERE created_at >= NOW() - INTERVAL '${months} months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    // Active enrollments by class style
    const byStyleResult = await pool.query(`
      SELECT
        c.style,
        COUNT(e.id) as active_students,
        COUNT(DISTINCT c.id) as class_count
      FROM enrollment e
      JOIN classes c ON e.class_id = c.id
      WHERE e.status = 'active'
      GROUP BY c.style
      ORDER BY active_students DESC
    `);

    // Active enrollments by level
    const byLevelResult = await pool.query(`
      SELECT
        c.level,
        COUNT(e.id) as active_students
      FROM enrollment e
      JOIN classes c ON e.class_id = c.id
      WHERE e.status = 'active'
      GROUP BY c.level
      ORDER BY active_students DESC
    `);

    // Total active students
    const totalResult = await pool.query(`
      SELECT
        COUNT(DISTINCT e.student_id) as total_active_students,
        COUNT(e.id) as total_active_enrollments
      FROM enrollment e
      WHERE e.status = 'active'
    `);

    res.json({
      success: true,
      totals: totalResult.rows[0],
      monthly_enrollments: monthlyResult.rows,
      by_style: byStyleResult.rows,
      by_level: byLevelResult.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
