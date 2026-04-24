const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM volunteers ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM volunteers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { recital_id, name, email, phone, role, shift, confirmed } = req.body;
    const result = await pool.query(
      'INSERT INTO volunteers (recital_id, name, email, phone, role, shift, confirmed) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [recital_id, name, email, phone, role, shift, confirmed]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { recital_id, name, email, phone, role, shift, confirmed } = req.body;
    const result = await pool.query(
      'UPDATE volunteers SET recital_id = $1, name = $2, email = $3, phone = $4, role = $5, shift = $6, confirmed = $7 WHERE id = $8 RETURNING *',
      [recital_id, name, email, phone, role, shift, confirmed, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM volunteers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }
    res.json({ message: 'Volunteer deleted', volunteer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
