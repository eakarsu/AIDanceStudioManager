const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM photos ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM photos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { date, photographer, location, class_id, package_info, status } = req.body;
    const result = await pool.query(
      'INSERT INTO photos (date, photographer, location, class_id, package_info, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [date, photographer, location, class_id, package_info, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { date, photographer, location, class_id, package_info, status } = req.body;
    const result = await pool.query(
      'UPDATE photos SET date = $1, photographer = $2, location = $3, class_id = $4, package_info = $5, status = $6 WHERE id = $7 RETURNING *',
      [date, photographer, location, class_id, package_info, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM photos WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo record not found' });
    }
    res.json({ message: 'Photo record deleted', photo: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
