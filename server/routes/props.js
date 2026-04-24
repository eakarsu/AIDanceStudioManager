const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM props ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM props WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prop not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, condition, storage_location, associated_class, quantity } = req.body;
    const result = await pool.query(
      'INSERT INTO props (name, description, condition, storage_location, associated_class, quantity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, condition, storage_location, associated_class, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, condition, storage_location, associated_class, quantity } = req.body;
    const result = await pool.query(
      'UPDATE props SET name = $1, description = $2, condition = $3, storage_location = $4, associated_class = $5, quantity = $6 WHERE id = $7 RETURNING *',
      [name, description, condition, storage_location, associated_class, quantity, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prop not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM props WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prop not found' });
    }
    res.json({ message: 'Prop deleted', prop: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
