const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trial_classes ORDER BY trial_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trial_classes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trial class not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { student_name, parent_name, email, phone, class_id, trial_date, status, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO trial_classes (student_name, parent_name, email, phone, class_id, trial_date, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [student_name, parent_name, email, phone, class_id, trial_date, status, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { student_name, parent_name, email, phone, class_id, trial_date, status, notes } = req.body;
    const result = await pool.query(
      'UPDATE trial_classes SET student_name = $1, parent_name = $2, email = $3, phone = $4, class_id = $5, trial_date = $6, status = $7, notes = $8 WHERE id = $9 RETURNING *',
      [student_name, parent_name, email, phone, class_id, trial_date, status, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trial class not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM trial_classes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trial class not found' });
    }
    res.json({ message: 'Trial class deleted', trial_class: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
