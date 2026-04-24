const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM merchandise ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM merchandise WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Merchandise not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, category, price, stock_quantity, size, image_url } = req.body;
    const result = await pool.query(
      'INSERT INTO merchandise (name, description, category, price, stock_quantity, size, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description, category, price, stock_quantity, size, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, category, price, stock_quantity, size, image_url } = req.body;
    const result = await pool.query(
      'UPDATE merchandise SET name = $1, description = $2, category = $3, price = $4, stock_quantity = $5, size = $6, image_url = $7 WHERE id = $8 RETURNING *',
      [name, description, category, price, stock_quantity, size, image_url, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Merchandise not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM merchandise WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Merchandise not found' });
    }
    res.json({ message: 'Merchandise deleted', merchandise: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
