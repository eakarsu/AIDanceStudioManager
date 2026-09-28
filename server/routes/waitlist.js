const express = require('express');
const router = express.Router();
const pool = require('../db');

// Legacy waitlist CRUD. Columns match database/schema.sql: student_id, class_id,
// family_id, requested_date, status, notes (there is no position/notified column;
// ordering is by requested_date/created_at).

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM waitlist ORDER BY requested_date, created_at');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM waitlist WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { student_id, class_id, family_id, requested_date, status, notes } = req.body;
    if (!student_id || !class_id) {
      return res.status(400).json({ error: 'student_id and class_id are required' });
    }
    const result = await pool.query(
      `INSERT INTO waitlist (student_id, class_id, family_id, requested_date, status, notes)
       VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), COALESCE($5, 'waiting'), $6)
       RETURNING *`,
      [student_id, class_id, family_id || null, requested_date || null, status || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This student is already on the waitlist for that class' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { student_id, class_id, family_id, requested_date, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE waitlist SET student_id = $1, class_id = $2, family_id = $3,
         requested_date = COALESCE($4::date, requested_date), status = COALESCE($5, status), notes = $6
       WHERE id = $7 RETURNING *`,
      [student_id, class_id, family_id || null, requested_date || null, status || null, notes || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM waitlist WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }
    res.json({ message: 'Waitlist entry deleted', waitlist: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
