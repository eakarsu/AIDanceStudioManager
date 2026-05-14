const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all billing records (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [result, countResult] = await Promise.all([
      pool.query('SELECT * FROM billing ORDER BY due_date DESC LIMIT $1 OFFSET $2', [limit, offset]),
      pool.query('SELECT COUNT(*) as total FROM billing')
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

// GET overdue invoices
router.get('/overdue', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.*,
        CURRENT_DATE - b.due_date AS days_past_due,
        f.parent_name, f.email AS family_email, f.phone AS family_phone
      FROM billing b
      LEFT JOIN families f ON b.family_id = f.id
      WHERE b.status = 'unpaid'
        AND b.due_date < CURRENT_DATE
      ORDER BY days_past_due DESC
    `);
    res.json({ success: true, overdue: result.rows, count: result.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST generate monthly invoices
router.post('/generate-monthly', async (req, res) => {
  try {
    const now = new Date();
    const year = req.body.year || now.getFullYear();
    const month = req.body.month || (now.getMonth() + 1);
    const dueDay = req.body.due_day || 1;
    const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

    // Get all active students with their class fees
    const studentsResult = await pool.query(`
      SELECT
        s.id AS student_id,
        s.first_name || ' ' || s.last_name AS student_name,
        s.family_id,
        COALESCE(SUM(c.monthly_fee), 0) AS total_monthly_fee
      FROM students s
      JOIN enrollment e ON e.student_id = s.id AND e.status = 'active'
      JOIN classes c ON c.id = e.class_id
      GROUP BY s.id, s.first_name, s.last_name, s.family_id
    `);

    const created = [];
    const skipped = [];

    for (const student of studentsResult.rows) {
      if (parseFloat(student.total_monthly_fee) <= 0) {
        skipped.push({ student_id: student.student_id, reason: 'No active classes' });
        continue;
      }

      // Check if invoice already exists for this month/student
      const existing = await pool.query(
        "SELECT id FROM billing WHERE student_id = $1 AND type = 'tuition' AND due_date = $2",
        [student.student_id, dueDate]
      );

      if (existing.rows.length > 0) {
        skipped.push({ student_id: student.student_id, reason: 'Invoice already exists' });
        continue;
      }

      const result = await pool.query(
        'INSERT INTO billing (family_id, student_id, amount, type, due_date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [student.family_id, student.student_id, student.total_monthly_fee, 'tuition', dueDate, 'unpaid']
      );
      created.push(result.rows[0]);
    }

    res.json({
      success: true,
      period: { year, month, due_date: dueDate },
      created_count: created.length,
      skipped_count: skipped.length,
      invoices: created
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST send payment reminders
router.post('/send-reminders', async (req, res) => {
  try {
    // Get overdue records
    const overdueResult = await pool.query(`
      SELECT b.*, f.email AS family_email, f.parent_name,
             s.first_name || ' ' || s.last_name AS student_name
      FROM billing b
      LEFT JOIN families f ON b.family_id = f.id
      LEFT JOIN students s ON b.student_id = s.id
      WHERE b.status = 'unpaid' AND b.due_date < CURRENT_DATE
    `);

    const overdue = overdueResult.rows;

    // Try nodemailer if configured
    let emailsSent = 0;
    let emailsSkipped = 0;
    const skippedReasons = [];

    const hasEmailConfig = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

    if (hasEmailConfig) {
      let nodemailer;
      try { nodemailer = require('nodemailer'); } catch (_) {
        skippedReasons.push('nodemailer not installed');
      }

      if (nodemailer) {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        for (const record of overdue) {
          if (!record.family_email) { emailsSkipped++; continue; }
          try {
            await transporter.sendMail({
              from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
              to: record.family_email,
              subject: `Payment Reminder: Tuition Due`,
              text: `Dear ${record.parent_name || 'Parent'},\n\nThis is a friendly reminder that your invoice of $${record.amount} for ${record.student_name} is past due (due date: ${record.due_date}).\n\nPlease contact us to arrange payment.\n\nThank you,\nDance Studio Team`
            });
            emailsSent++;
          } catch (emailErr) {
            emailsSkipped++;
            skippedReasons.push(`Failed for ${record.family_email}: ${emailErr.message}`);
          }
        }
      }
    } else {
      emailsSkipped = overdue.length;
      skippedReasons.push('Email not configured (EMAIL_HOST, EMAIL_USER, EMAIL_PASS env vars required)');
    }

    res.json({
      success: true,
      overdue_count: overdue.length,
      emails_sent: emailsSent,
      emails_skipped: emailsSkipped,
      skip_reasons: skippedReasons,
      overdue_records: overdue
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM billing WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { family_id, student_id, amount, type, due_date, paid_date, status, auto_pay } = req.body;
    const result = await pool.query(
      'INSERT INTO billing (family_id, student_id, amount, type, due_date, paid_date, status, auto_pay) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [family_id, student_id, amount, type, due_date, paid_date, status, auto_pay]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { family_id, student_id, amount, type, due_date, paid_date, status, auto_pay } = req.body;
    const result = await pool.query(
      'UPDATE billing SET family_id = $1, student_id = $2, amount = $3, type = $4, due_date = $5, paid_date = $6, status = $7, auto_pay = $8 WHERE id = $9 RETURNING *',
      [family_id, student_id, amount, type, due_date, paid_date, status, auto_pay, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM billing WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Billing record not found' });
    res.json({ message: 'Billing record deleted', billing: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
