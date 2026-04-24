const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM makeup_classes ORDER BY makeup_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM makeup_classes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Makeup class not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { student_id, original_class_id, makeup_class_id, original_date, makeup_date, status, reason } = req.body;
    const result = await pool.query(
      'INSERT INTO makeup_classes (student_id, original_class_id, makeup_class_id, original_date, makeup_date, status, reason) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [student_id, original_class_id, makeup_class_id, original_date, makeup_date, status, reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { student_id, original_class_id, makeup_class_id, original_date, makeup_date, status, reason } = req.body;
    const result = await pool.query(
      'UPDATE makeup_classes SET student_id = $1, original_class_id = $2, makeup_class_id = $3, original_date = $4, makeup_date = $5, status = $6, reason = $7 WHERE id = $8 RETURNING *',
      [student_id, original_class_id, makeup_class_id, original_date, makeup_date, status, reason, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Makeup class not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM makeup_classes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Makeup class not found' });
    }
    res.json({ message: 'Makeup class deleted', makeup_class: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
