const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM competitions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM competitions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Competition not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, date, location, organization, registration_deadline, entry_fee, categories, results } = req.body;
    const result = await pool.query(
      'INSERT INTO competitions (name, date, location, organization, registration_deadline, entry_fee, categories, results) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, date, location, organization, registration_deadline, entry_fee, categories, results]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, date, location, organization, registration_deadline, entry_fee, categories, results } = req.body;
    const result = await pool.query(
      'UPDATE competitions SET name = $1, date = $2, location = $3, organization = $4, registration_deadline = $5, entry_fee = $6, categories = $7, results = $8 WHERE id = $9 RETURNING *',
      [name, date, location, organization, registration_deadline, entry_fee, categories, results, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Competition not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM competitions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Competition not found' });
    }
    res.json({ message: 'Competition deleted', competition: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
