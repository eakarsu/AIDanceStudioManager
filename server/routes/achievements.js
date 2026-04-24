const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM achievements ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM achievements WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Achievement not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { student_id, title, description, date, category, competition_name } = req.body;
    const result = await pool.query(
      'INSERT INTO achievements (student_id, title, description, date, category, competition_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [student_id, title, description, date, category, competition_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { student_id, title, description, date, category, competition_name } = req.body;
    const result = await pool.query(
      'UPDATE achievements SET student_id = $1, title = $2, description = $3, date = $4, category = $5, competition_name = $6 WHERE id = $7 RETURNING *',
      [student_id, title, description, date, category, competition_name, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Achievement not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM achievements WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Achievement not found' });
    }
    res.json({ message: 'Achievement deleted', achievement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
