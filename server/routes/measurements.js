const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM measurements ORDER BY measured_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM measurements WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Measurement not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { student_id, height, weight, shoe_size, chest, waist, hips, inseam, measured_date } = req.body;
    const result = await pool.query(
      'INSERT INTO measurements (student_id, height, weight, shoe_size, chest, waist, hips, inseam, measured_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [student_id, height, weight, shoe_size, chest, waist, hips, inseam, measured_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { student_id, height, weight, shoe_size, chest, waist, hips, inseam, measured_date } = req.body;
    const result = await pool.query(
      'UPDATE measurements SET student_id = $1, height = $2, weight = $3, shoe_size = $4, chest = $5, waist = $6, hips = $7, inseam = $8, measured_date = $9 WHERE id = $10 RETURNING *',
      [student_id, height, weight, shoe_size, chest, waist, hips, inseam, measured_date, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Measurement not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM measurements WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Measurement not found' });
    }
    res.json({ message: 'Measurement deleted', measurement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
