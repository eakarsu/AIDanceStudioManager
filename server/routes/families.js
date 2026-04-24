const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM families ORDER BY family_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM families WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { family_name, parent_name, email, phone, address, payment_method, auto_pay_enabled, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO families (family_name, parent_name, email, phone, address, payment_method, auto_pay_enabled, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [family_name, parent_name, email, phone, address, payment_method, auto_pay_enabled, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { family_name, parent_name, email, phone, address, payment_method, auto_pay_enabled, notes } = req.body;
    const result = await pool.query(
      'UPDATE families SET family_name = $1, parent_name = $2, email = $3, phone = $4, address = $5, payment_method = $6, auto_pay_enabled = $7, notes = $8 WHERE id = $9 RETURNING *',
      [family_name, parent_name, email, phone, address, payment_method, auto_pay_enabled, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM families WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found' });
    }
    res.json({ message: 'Family deleted', family: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
