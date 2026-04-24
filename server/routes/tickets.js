const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickets ORDER BY purchase_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { recital_id, buyer_name, buyer_email, quantity, seat_section, total_price, purchase_date, status } = req.body;
    const result = await pool.query(
      'INSERT INTO tickets (recital_id, buyer_name, buyer_email, quantity, seat_section, total_price, purchase_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [recital_id, buyer_name, buyer_email, quantity, seat_section, total_price, purchase_date, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { recital_id, buyer_name, buyer_email, quantity, seat_section, total_price, purchase_date, status } = req.body;
    const result = await pool.query(
      'UPDATE tickets SET recital_id = $1, buyer_name = $2, buyer_email = $3, quantity = $4, seat_section = $5, total_price = $6, purchase_date = $7, status = $8 WHERE id = $9 RETURNING *',
      [recital_id, buyer_name, buyer_email, quantity, seat_section, total_price, purchase_date, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tickets WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted', ticket: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
