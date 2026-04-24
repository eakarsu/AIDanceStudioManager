const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM studios ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM studios WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Studio not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, capacity, floor_type, has_mirrors, has_barres, sound_system, size_sqft } = req.body;
    const result = await pool.query(
      'INSERT INTO studios (name, capacity, floor_type, has_mirrors, has_barres, sound_system, size_sqft) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, capacity, floor_type, has_mirrors, has_barres, sound_system, size_sqft]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, capacity, floor_type, has_mirrors, has_barres, sound_system, size_sqft } = req.body;
    const result = await pool.query(
      'UPDATE studios SET name = $1, capacity = $2, floor_type = $3, has_mirrors = $4, has_barres = $5, sound_system = $6, size_sqft = $7 WHERE id = $8 RETURNING *',
      [name, capacity, floor_type, has_mirrors, has_barres, sound_system, size_sqft, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Studio not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM studios WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Studio not found' });
    }
    res.json({ message: 'Studio deleted', studio: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
