const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM summer_intensives ORDER BY start_date');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM summer_intensives WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Summer intensive not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, start_date, end_date, instructor, level, max_students, fee, registered_count } = req.body;
    const result = await pool.query(
      'INSERT INTO summer_intensives (name, description, start_date, end_date, instructor, level, max_students, fee, registered_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, description, start_date, end_date, instructor, level, max_students, fee, registered_count]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, start_date, end_date, instructor, level, max_students, fee, registered_count } = req.body;
    const result = await pool.query(
      'UPDATE summer_intensives SET name = $1, description = $2, start_date = $3, end_date = $4, instructor = $5, level = $6, max_students = $7, fee = $8, registered_count = $9 WHERE id = $10 RETURNING *',
      [name, description, start_date, end_date, instructor, level, max_students, fee, registered_count, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Summer intensive not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM summer_intensives WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Summer intensive not found' });
    }
    res.json({ message: 'Summer intensive deleted', summer_intensive: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
