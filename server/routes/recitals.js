const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recitals ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recitals WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recital not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, date, venue, theme, description, ticket_price, status, rehearsal_dates } = req.body;
    const result = await pool.query(
      'INSERT INTO recitals (name, date, venue, theme, description, ticket_price, status, rehearsal_dates) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, date, venue, theme, description, ticket_price, status, rehearsal_dates]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, date, venue, theme, description, ticket_price, status, rehearsal_dates } = req.body;
    const result = await pool.query(
      'UPDATE recitals SET name = $1, date = $2, venue = $3, theme = $4, description = $5, ticket_price = $6, status = $7, rehearsal_dates = $8 WHERE id = $9 RETURNING *',
      [name, date, venue, theme, description, ticket_price, status, rehearsal_dates, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recital not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM recitals WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recital not found' });
    }
    res.json({ message: 'Recital deleted', recital: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
