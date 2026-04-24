const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schedules ORDER BY day_of_week, start_time');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schedules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { class_id, teacher_id, studio_id, day_of_week, start_time, end_time, recurring } = req.body;
    const result = await pool.query(
      'INSERT INTO schedules (class_id, teacher_id, studio_id, day_of_week, start_time, end_time, recurring) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [class_id, teacher_id, studio_id, day_of_week, start_time, end_time, recurring]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { class_id, teacher_id, studio_id, day_of_week, start_time, end_time, recurring } = req.body;
    const result = await pool.query(
      'UPDATE schedules SET class_id = $1, teacher_id = $2, studio_id = $3, day_of_week = $4, start_time = $5, end_time = $6, recurring = $7 WHERE id = $8 RETURNING *',
      [class_id, teacher_id, studio_id, day_of_week, start_time, end_time, recurring, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM schedules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted', schedule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
