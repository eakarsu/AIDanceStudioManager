const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM music_licenses ORDER BY title');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM music_licenses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Music record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, artist, license_type, license_expiry, usage_context, cost, file_url } = req.body;
    const result = await pool.query(
      'INSERT INTO music_licenses (title, artist, license_type, license_expiry, usage_context, cost, file_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, artist, license_type, license_expiry, usage_context, cost, file_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, artist, license_type, license_expiry, usage_context, cost, file_url } = req.body;
    const result = await pool.query(
      'UPDATE music_licenses SET title = $1, artist = $2, license_type = $3, license_expiry = $4, usage_context = $5, cost = $6, file_url = $7 WHERE id = $8 RETURNING *',
      [title, artist, license_type, license_expiry, usage_context, cost, file_url, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Music record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM music_licenses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Music record not found' });
    }
    res.json({ message: 'Music record deleted', music: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
