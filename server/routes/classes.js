const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all classes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM classes ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET class by id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM classes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create class
router.post('/', async (req, res) => {
  try {
    const { name, style, level, age_group, teacher_id, studio_id, schedule_day, schedule_time, max_students, description, monthly_fee } = req.body;
    const result = await pool.query(
      'INSERT INTO classes (name, style, level, age_group, teacher_id, studio_id, schedule_day, schedule_time, max_students, description, monthly_fee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [name, style, level, age_group, teacher_id, studio_id, schedule_day, schedule_time, max_students, description, monthly_fee]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update class
router.put('/:id', async (req, res) => {
  try {
    const { name, style, level, age_group, teacher_id, studio_id, schedule_day, schedule_time, max_students, description, monthly_fee } = req.body;
    const result = await pool.query(
      'UPDATE classes SET name = $1, style = $2, level = $3, age_group = $4, teacher_id = $5, studio_id = $6, schedule_day = $7, schedule_time = $8, max_students = $9, description = $10, monthly_fee = $11 WHERE id = $12 RETURNING *',
      [name, style, level, age_group, teacher_id, studio_id, schedule_day, schedule_time, max_students, description, monthly_fee, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE class
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM classes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json({ message: 'Class deleted', class: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
