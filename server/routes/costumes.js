const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM costumes ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM costumes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Costume not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { class_id, name, description, vendor, cost_per_unit, sizes_needed, order_status, order_date, delivery_date } = req.body;
    const result = await pool.query(
      'INSERT INTO costumes (class_id, name, description, vendor, cost_per_unit, sizes_needed, order_status, order_date, delivery_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [class_id, name, description, vendor, cost_per_unit, sizes_needed, order_status, order_date, delivery_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { class_id, name, description, vendor, cost_per_unit, sizes_needed, order_status, order_date, delivery_date } = req.body;
    const result = await pool.query(
      'UPDATE costumes SET class_id = $1, name = $2, description = $3, vendor = $4, cost_per_unit = $5, sizes_needed = $6, order_status = $7, order_date = $8, delivery_date = $9 WHERE id = $10 RETURNING *',
      [class_id, name, description, vendor, cost_per_unit, sizes_needed, order_status, order_date, delivery_date, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Costume not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM costumes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Costume not found' });
    }
    res.json({ message: 'Costume deleted', costume: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
