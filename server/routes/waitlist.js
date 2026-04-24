const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM waitlist ORDER BY position');
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
    const { student_id, class_id, position, added_date, status, notified } = req.body;
    const result = await pool.query(
      'INSERT INTO waitlist (student_id, class_id, position, added_date, status, notified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [student_id, class_id, position, added_date, status, notified]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { student_id, class_id, position, added_date, status, notified } = req.body;
    const result = await pool.query(
      'UPDATE waitlist SET student_id = $1, class_id = $2, position = $3, added_date = $4, status = $5, notified = $6 WHERE id = $7 RETURNING *',
      [student_id, class_id, position, added_date, status, notified, req.params.id]
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
