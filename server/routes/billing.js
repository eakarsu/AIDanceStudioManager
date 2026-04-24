const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing ORDER BY due_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { family_id, student_id, amount, type, due_date, paid_date, status, auto_pay } = req.body;
    const result = await pool.query(
      'INSERT INTO billing (family_id, student_id, amount, type, due_date, paid_date, status, auto_pay) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [family_id, student_id, amount, type, due_date, paid_date, status, auto_pay]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { family_id, student_id, amount, type, due_date, paid_date, status, auto_pay } = req.body;
    const result = await pool.query(
      'UPDATE billing SET family_id = $1, student_id = $2, amount = $3, type = $4, due_date = $5, paid_date = $6, status = $7, auto_pay = $8 WHERE id = $9 RETURNING *',
      [family_id, student_id, amount, type, due_date, paid_date, status, auto_pay, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM billing WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }
    res.json({ message: 'Billing record deleted', billing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
