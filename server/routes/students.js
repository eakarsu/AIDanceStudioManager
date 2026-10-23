const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all students (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const _w=[]; const _p=[];
    if (req.query.q) { _p.push(`%${req.query.q}%`); _w.push(`(first_name ILIKE $${_p.length} OR last_name ILIKE $${_p.length} OR email ILIKE $${_p.length})`); }
    if (req.query.status) { _p.push(req.query.status); _w.push(`level=$${_p.length}`); }
    if (req.query.level) { _p.push(req.query.level); _w.push(`level=$${_p.length}`); }
    const _where=_w.length?` WHERE ${_w.join(' AND ')}`:'';
    const [result, countResult] = await Promise.all([
      pool.query(`SELECT * FROM students${_where} ORDER BY last_name, first_name LIMIT $${_p.length+1} OFFSET $${_p.length+2}`, [..._p, limit, offset]),
      pool.query(`SELECT COUNT(*) as total FROM students${_where}`, _p)
    ]);

    res.json({
      data: result.rows,
      pagination: {
        page, limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET student by id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create student
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, age_group, level, family_id, phone, email, emergency_contact, medical_notes, profile_photo } = req.body;
    const result = await pool.query(
      'INSERT INTO students (first_name, last_name, date_of_birth, age_group, level, family_id, phone, email, emergency_contact, medical_notes, profile_photo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [first_name, last_name, date_of_birth, age_group, level, family_id, phone, email, emergency_contact, medical_notes, profile_photo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update student
router.put('/:id', async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, age_group, level, family_id, phone, email, emergency_contact, medical_notes, profile_photo } = req.body;
    const result = await pool.query(
      'UPDATE students SET first_name = $1, last_name = $2, date_of_birth = $3, age_group = $4, level = $5, family_id = $6, phone = $7, email = $8, emergency_contact = $9, medical_notes = $10, profile_photo = $11 WHERE id = $12 RETURNING *',
      [first_name, last_name, date_of_birth, age_group, level, family_id, phone, email, emergency_contact, medical_notes, profile_photo, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE student
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student deleted', student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
