const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all financial reports
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM financial_reports ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM financial_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM financial_reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET revenue by month
router.get('/revenue-by-month', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        DATE_TRUNC('month', paid_date) AS month,
        SUM(amount) AS total_revenue,
        COUNT(*) AS transaction_count
      FROM billing
      WHERE paid_date IS NOT NULL AND status = 'paid'
      GROUP BY DATE_TRUNC('month', paid_date)
      ORDER BY month DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET expenses by category
router.get('/expenses-by-category', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        type AS category,
        SUM(amount) AS total_amount,
        COUNT(*) AS transaction_count
      FROM billing
      GROUP BY type
      ORDER BY total_amount DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET outstanding balances
router.get('/outstanding-balances', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        b.id,
        b.family_id,
        f.family_name,
        b.student_id,
        b.amount,
        b.type,
        b.due_date,
        b.status
      FROM billing b
      LEFT JOIN families f ON b.family_id = f.id
      WHERE b.status IN ('pending', 'overdue')
      ORDER BY b.due_date ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET costume fee collection status
router.get('/costume-fees', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        b.id,
        b.family_id,
        f.family_name,
        b.student_id,
        b.amount,
        b.due_date,
        b.paid_date,
        b.status
      FROM billing b
      LEFT JOIN families f ON b.family_id = f.id
      WHERE b.type = 'costume_fee'
      ORDER BY b.status, b.due_date`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET summary overview
router.get('/summary', async (req, res) => {
  try {
    const totalRevenue = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM billing WHERE status = 'paid'"
    );
    const totalOutstanding = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM billing WHERE status IN ('pending', 'overdue')"
    );
    const totalStudents = await pool.query(
      'SELECT COUNT(*) AS total FROM students'
    );
    const totalEnrollments = await pool.query(
      "SELECT COUNT(*) AS total FROM enrollment WHERE status = 'active'"
    );

    res.json({
      total_revenue: totalRevenue.rows[0].total,
      total_outstanding: totalOutstanding.rows[0].total,
      total_students: totalStudents.rows[0].total,
      active_enrollments: totalEnrollments.rows[0].total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
