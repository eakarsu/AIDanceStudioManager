const express = require('express');
const router = express.Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');
const { parseAIJson } = require('../middleware/parseAIJson');

const SYSTEM_PROMPT = "You are an expert dance studio manager and dance educator with deep knowledge of dance pedagogy, student development, competition strategy, and studio operations.";
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

async function rawOpenRouterCall(prompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    const e = new Error('AI provider not configured (OPENROUTER_API_KEY missing)');
    e.statusCode = 503;
    throw e;
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:4000',
      'X-Title': 'AI Dance Studio Manager'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 3000
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  return { content: data.choices[0].message.content, model: data.model, usage: data.usage };
}

// 3-strategy parse: parseAIJson handles direct, fence-stripped, regex-extract.
// One stricter retry when first response is non-JSON.
async function callOpenRouter(prompt) {
  const first = await rawOpenRouterCall(prompt);
  let parsed = parseAIJson(first.content);
  if (parsed != null) return parsed;

  const second = await rawOpenRouterCall(prompt + '\n\nReturn ONLY valid JSON, no markdown, no explanation, no code fences.');
  parsed = parseAIJson(second.content);
  if (parsed != null) return parsed;

  return { raw_response: first.content, parse_error: 'AI returned non-JSON after retry' };
}

// Persist a feature invocation to the ai_results table (best-effort).
async function persistAIResult({ userId = null, feature, inputs, parsed, raw = null, model = null, tokens = 0 }) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, feature, inputs, ai_results, raw_response, model, tokens)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)`,
      [
        userId,
        feature,
        inputs ? JSON.stringify(inputs) : null,
        parsed ? JSON.stringify(parsed) : null,
        raw,
        model,
        tokens,
      ]
    );
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ai_results] persist skipped:', e.message);
    }
  }
}

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}

// POST /api/ai/student-placement-profile (legacy /student-placement alias retained)
router.post(['/student-placement', '/student-placement-profile'],
  body('student_id').notEmpty().withMessage('student_id is required'),
  validate,
  async (req, res) => {
    try {
      const { student_id } = req.body;
      const studentResult = await pool.query('SELECT * FROM students WHERE id = $1', [student_id]);
      if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
      const student = studentResult.rows[0];

      // Try to get enrollment history
      let enrollments = [];
      try {
        const enrollResult = await pool.query(
          'SELECT e.*, c.name as class_name, c.style, c.level FROM enrollment e JOIN classes c ON e.class_id = c.id WHERE e.student_id = $1',
          [student_id]
        );
        enrollments = enrollResult.rows;
      } catch (_) { /* enrollment table may not exist yet */ }

      const prompt = `Recommend optimal class placement for this dance student. Return JSON with fields:
- recommended_level: string
- recommended_styles: string[]
- weekly_schedule_suggestion: array of { style: string, level: string, days_per_week: number, notes: string }
- reasoning: string
- areas_of_focus: string[]
- next_milestone: string
- estimated_progression_timeline: string
- notes_for_teachers: string

Student Profile:
${JSON.stringify(student, null, 2)}

Current/Past Enrollments:
${JSON.stringify(enrollments, null, 2)}

Return ONLY valid JSON.`;

      const result = await callOpenRouter(prompt);
      res.json({ success: true, placement: result, student });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/ai/recital-program
router.post('/recital-program',
  body('recital_id').notEmpty().withMessage('recital_id is required'),
  body('participating_classes').isArray({ min: 1 }).withMessage('participating_classes must be a non-empty array'),
  validate,
  async (req, res) => {
    try {
      const { recital_id, participating_classes } = req.body;

      let recital = { id: recital_id };
      try {
        const recitalResult = await pool.query('SELECT * FROM recitals WHERE id = $1', [recital_id]);
        if (recitalResult.rows[0]) recital = recitalResult.rows[0];
      } catch (_) {}

      const prompt = `Generate a full recital program for this dance studio recital. Return JSON with fields:
- program_title: string
- intermission_placement: number (after which act number)
- estimated_total_runtime_minutes: number
- acts: array of {
    act_number: number,
    class_name: string,
    dance_style: string,
    level: string,
    age_group: string,
    song_title: string,
    estimated_duration_minutes: number,
    stage_notes: string,
    costume_change_needed: boolean,
    transition_time_minutes: number
  }
- opening_number: string
- closing_number: string
- intermission_activities: string[]
- production_notes: string[]
- emcee_script_notes: string

Recital Details: ${JSON.stringify(recital, null, 2)}
Participating Classes: ${JSON.stringify(participating_classes, null, 2)}

Return ONLY valid JSON.`;

      const result = await callOpenRouter(prompt);
      res.json({ success: true, program: result, recital });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/ai/parent-communication
router.post('/parent-communication',
  body('topic').notEmpty().withMessage('topic is required'),
  body('student_ids').isArray({ min: 1 }).withMessage('student_ids must be a non-empty array'),
  validate,
  async (req, res) => {
    try {
      const { topic, student_ids, context } = req.body;

      let students = [];
      try {
        const placeholders = student_ids.map((_, i) => `$${i + 1}`).join(',');
        const studentsResult = await pool.query(
          `SELECT * FROM students WHERE id IN (${placeholders})`,
          student_ids
        );
        students = studentsResult.rows;
      } catch (_) {}

      const prompt = `Generate personalized parent communications for the given topic and students. Return JSON with fields:
- subject_line: string
- communications: array of {
    student_name: string,
    parent_greeting: string,
    message_body: string,
    action_required: string|null,
    deadline: string|null,
    closing: string
  }
- general_notes: string[]
- recommended_send_method: string

Topic: ${topic}
Additional Context: ${context || 'None'}
Students: ${JSON.stringify(students, null, 2)}

Return ONLY valid JSON.`;

      const result = await callOpenRouter(prompt);
      res.json({ success: true, communications: result });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/ai/competition-strategy
router.post('/competition-strategy',
  body('competition_id').notEmpty().withMessage('competition_id is required'),
  body('entering_students').isArray({ min: 1 }).withMessage('entering_students must be a non-empty array'),
  validate,
  async (req, res) => {
    try {
      const { competition_id, entering_students } = req.body;

      let competition = { id: competition_id };
      try {
        const compResult = await pool.query('SELECT * FROM competitions WHERE id = $1', [competition_id]);
        if (compResult.rows[0]) competition = compResult.rows[0];
      } catch (_) {}

      const prompt = `Develop a competition strategy for this dance studio. Return JSON with fields:
- competition_overview: string
- overall_strategy: string
- student_entries: array of {
    student_id: string,
    student_name: string,
    recommended_categories: array of {
      category: string,
      style: string,
      level: string,
      entry_type: "solo"|"duet"|"group",
      confidence_score: number (0-100),
      reasoning: string,
      coaching_focus: string[]
    },
    estimated_placement_range: string,
    preparation_timeline: string
  }
- group_number_recommendations: array of {
    number_title: string,
    style: string,
    students: string[],
    category: string,
    reasoning: string
  }
- day_of_logistics: string[]
- overall_medal_potential: string

Competition: ${JSON.stringify(competition, null, 2)}
Entering Students: ${JSON.stringify(entering_students, null, 2)}

Return ONLY valid JSON.`;

      const result = await callOpenRouter(prompt);
      res.json({ success: true, strategy: result, competition });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/ai/recital-choreography
router.post('/recital-choreography',
  body('music_title').notEmpty().withMessage('music_title is required'),
  body('age_group').notEmpty().withMessage('age_group is required'),
  body('level').notEmpty().withMessage('level is required'),
  body('duration_minutes').isFloat({ gt: 0, lt: 30 }).withMessage('duration_minutes must be > 0 and < 30'),
  body('dancer_count').isInt({ min: 1, max: 200 }).withMessage('dancer_count must be 1-200'),
  validate,
  async (req, res) => {
    try {
      const { music_title, music_artist, dance_style, age_group, level, duration_minutes, dancer_count, performance_context, notes } = req.body;
      const inputs = { music_title, music_artist, dance_style, age_group, level, duration_minutes, dancer_count, performance_context, notes };
      const prompt = `Suggest a complete recital choreography structure for review. Return ONLY valid JSON with fields:
- piece_title: string
- recommended_style_if_undefined: string
- structure: array of {
    section_name: string,
    counts: number,
    seconds: number,
    description: string,
    formation: string,
    technique_focus: string[]
  }
- transitions: array of { from: string, to: string, transition_type: string, count_of_8s: number }
- formations_overview: string[]
- props_or_lighting_notes: string[]
- difficulty_assessment: string
- alternative_endings: string[]

Music Title: ${music_title}
Artist: ${music_artist || 'Unknown'}
Dance Style: ${dance_style || 'TBD'}
Age Group: ${age_group}
Level: ${level}
Duration (min): ${duration_minutes}
Dancer Count: ${dancer_count}
Performance Context: ${performance_context || 'recital'}
Notes: ${notes || 'None'}`;
      const result = await callOpenRouter(prompt);
      await persistAIResult({ userId: req.user?.id, feature: 'recital_choreography', inputs, parsed: result, model: MODEL });
      res.json({ success: true, choreography: result });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/ai/class-scheduling-optimizer
router.post('/class-scheduling-optimizer',
  body('teacher_availability').isArray({ min: 1 }).withMessage('teacher_availability is required (non-empty array)'),
  body('classes_to_schedule').isArray({ min: 1 }).withMessage('classes_to_schedule is required (non-empty array)'),
  validate,
  async (req, res) => {
    try {
      const { teacher_availability, classes_to_schedule, studios = [], constraints = {} } = req.body;
      const inputs = { teacher_availability, classes_to_schedule, studios, constraints };
      const prompt = `Build an optimized weekly class schedule. Return ONLY valid JSON with fields:
- weekly_schedule: array of {
    day: string,
    class_id: string|number,
    class_name: string,
    teacher: string,
    studio: string,
    start_time: string,
    end_time: string,
    students_expected: number,
    confidence_score: number
  }
- conflicts_resolved: array of { conflict: string, resolution: string }
- unscheduled_classes: array of { class_name: string, reason: string }
- enrollment_uplift_estimate_pct: number
- teacher_load_summary: array of { teacher: string, hours_per_week: number, classes: number }
- recommended_changes_to_capacity: string[]
- assumptions: string[]

Teacher Availability: ${JSON.stringify(teacher_availability, null, 2)}
Classes to Schedule: ${JSON.stringify(classes_to_schedule, null, 2)}
Studios/Rooms: ${JSON.stringify(studios, null, 2)}
Constraints: ${JSON.stringify(constraints, null, 2)}`;
      const result = await callOpenRouter(prompt);
      await persistAIResult({ userId: req.user?.id, feature: 'class_scheduling_optimizer', inputs, parsed: result, model: MODEL });
      res.json({ success: true, schedule: result });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/ai/student-progress-report
router.post('/student-progress-report',
  body('student_id').notEmpty().withMessage('student_id is required'),
  validate,
  async (req, res) => {
    try {
      const { student_id, term_start, term_end, additional_notes } = req.body;
      const studentResult = await pool.query('SELECT * FROM students WHERE id = $1', [student_id]);
      if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
      const student = studentResult.rows[0];

      let attendance = [];
      try {
        const params = [student_id];
        let q = 'SELECT * FROM attendance WHERE student_id = $1';
        if (term_start && term_end) { q += ' AND date BETWEEN $2 AND $3'; params.push(term_start, term_end); }
        q += ' ORDER BY date DESC LIMIT 100';
        attendance = (await pool.query(q, params)).rows;
      } catch (_) {}

      let achievements = [];
      try {
        achievements = (await pool.query('SELECT * FROM achievements WHERE student_id = $1 ORDER BY date DESC LIMIT 20', [student_id])).rows;
      } catch (_) {}

      let enrollments = [];
      try {
        enrollments = (await pool.query(
          'SELECT e.*, c.name AS class_name, c.style, c.level FROM enrollment e JOIN classes c ON e.class_id = c.id WHERE e.student_id = $1',
          [student_id]
        )).rows;
      } catch (_) {}

      const presentCount = attendance.filter(a => a.status === 'present').length;
      const totalAttendance = attendance.length;
      const attendanceRatePct = totalAttendance ? Math.round((presentCount / totalAttendance) * 100) : null;

      const inputs = { student_id, term_start, term_end, additional_notes };
      const prompt = `Generate a comprehensive dance student progress report. Return ONLY valid JSON with fields:
- student_summary: { name: string, age_group: string, level: string }
- term_window: { start: string|null, end: string|null }
- attendance_summary: { sessions_logged: number, present: number, absent: number, late: number, attendance_rate_pct: number|null }
- technique_evaluation: { rating_1_to_5: number, strengths: string[], improvement_areas: string[] }
- artistic_evaluation: { rating_1_to_5: number, notes: string }
- achievements_highlights: string[]
- recommended_next_level: string
- recommended_focus_for_next_term: string[]
- parent_friendly_narrative: string
- teacher_action_items: string[]
- risk_flags: string[]

Student: ${JSON.stringify(student, null, 2)}
Enrollments: ${JSON.stringify(enrollments, null, 2)}
Attendance (last 100): ${JSON.stringify(attendance, null, 2)}
Attendance rate: ${attendanceRatePct}%
Achievements: ${JSON.stringify(achievements, null, 2)}
Notes: ${additional_notes || 'None'}`;
      const result = await callOpenRouter(prompt);
      await persistAIResult({ userId: req.user?.id, feature: 'student_progress_report', inputs, parsed: result, model: MODEL });
      res.json({ success: true, report: result, metrics: { attendance_rate_pct: attendanceRatePct, attendance_count: totalAttendance, achievement_count: achievements.length } });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/ai/costume-budget-forecaster
router.post('/costume-budget-forecaster',
  body('recital_lineup').isArray({ min: 1 }).withMessage('recital_lineup is required (non-empty array)'),
  validate,
  async (req, res) => {
    try {
      const { recital_lineup, target_budget, vendor_preferences } = req.body;
      const inputs = { recital_lineup, target_budget, vendor_preferences };
      const prompt = `Forecast costume budget for a recital lineup. Return ONLY valid JSON with fields:
- per_class_breakdown: array of {
    class_name: string,
    dancers: number,
    style: string,
    complexity_tier: "low"|"medium"|"high",
    cost_per_costume_low: number,
    cost_per_costume_high: number,
    accessories_cost_estimate: number,
    line_total_low: number,
    line_total_high: number
  }
- subtotal_low: number
- subtotal_high: number
- shipping_and_tax_estimate: number
- grand_total_low: number
- grand_total_high: number
- variance_vs_target_pct: number|null
- cost_saving_alternatives: array of { suggestion: string, est_savings: number }
- vendor_recommendations: array of { vendor: string, why: string }
- timeline_recommendations: string[]

Recital Lineup: ${JSON.stringify(recital_lineup, null, 2)}
Target Budget: ${target_budget || 'unspecified'}
Vendor Preferences: ${JSON.stringify(vendor_preferences || [], null, 2)}`;
      const result = await callOpenRouter(prompt);
      await persistAIResult({ userId: req.user?.id, feature: 'costume_budget_forecaster', inputs, parsed: result, model: MODEL });
      res.json({ success: true, forecast: result });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/ai/talent-show-matcher
router.post('/talent-show-matcher',
  body('students').isArray({ min: 1 }).withMessage('students is required (non-empty array)'),
  validate,
  async (req, res) => {
    try {
      const { students, show_length_minutes = 90, theme = 'showcase', constraints = {} } = req.body;
      const inputs = { students, show_length_minutes, theme, constraints };
      const prompt = `Build a talent showcase order pairing students into engaging groupings. Return ONLY valid JSON with fields:
- show_title: string
- total_runtime_minutes: number
- show_order: array of {
    slot: number,
    title: string,
    style: string,
    student_ids: array,
    student_names: array,
    estimated_minutes: number,
    energy_level: "low"|"medium"|"high",
    transition_to_next: string
  }
- pairings_rationale: string
- intermissions: array of { after_slot: number, length_minutes: number }
- closing_finale_recommendation: string
- variety_notes: string[]
- inclusivity_notes: string[]

Students: ${JSON.stringify(students, null, 2)}
Show Length (min): ${show_length_minutes}
Theme: ${theme}
Constraints: ${JSON.stringify(constraints, null, 2)}`;
      const result = await callOpenRouter(prompt);
      await persistAIResult({ userId: req.user?.id, feature: 'talent_show_matcher', inputs, parsed: result, model: MODEL });
      res.json({ success: true, showcase: result });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/ai/multilingual-parent-portal
router.post('/multilingual-parent-portal',
  body('text').notEmpty().withMessage('text is required'),
  body('target_language').notEmpty().withMessage('target_language is required'),
  validate,
  async (req, res) => {
    try {
      const { text, target_language, source_language = 'auto', family_id, message_type = 'announcement' } = req.body;
      const inputs = { target_language, source_language, family_id, message_type, text_length: text.length };

      // Track family-language preference if family_id is given
      if (family_id) {
        try {
          await pool.query(
            "ALTER TABLE families ADD COLUMN IF NOT EXISTS language_preference VARCHAR(50)"
          );
          await pool.query(
            "UPDATE families SET language_preference = $1, updated_at = NOW() WHERE id = $2",
            [target_language, family_id]
          );
        } catch (_) {}
      }

      const prompt = `Translate a dance studio communication for parents while preserving studio terminology and tone.
Return ONLY valid JSON with fields:
- detected_source_language: string
- target_language: string
- translation: string
- preserved_terms: string[] (names, dates, recital titles, etc. kept verbatim)
- glossary_used: array of { english: string, translated: string, note: string }
- cultural_notes: string[] (any cultural adjustments made)
- send_method_recommendation: "email"|"sms"|"app_push"

Source Language: ${source_language}
Target Language: ${target_language}
Message Type: ${message_type}
Text:
"""
${text}
"""`;
      const result = await callOpenRouter(prompt);
      await persistAIResult({ userId: req.user?.id, feature: 'multilingual_parent_portal', inputs, parsed: result, model: MODEL });
      res.json({ success: true, translation: result, family_id: family_id || null });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/ai/photo-tagging
router.post('/photo-tagging',
  body('photos').isArray({ min: 1 }).withMessage('photos array is required'),
  validate,
  async (req, res) => {
    try {
      const { photos, event_context = '', dancer_roster = [] } = req.body;
      const inputs = { photo_count: photos.length, event_context, roster_count: dancer_roster.length };
      const prompt = `You are tagging dance studio photos. For each photo provide tags.
Return ONLY valid JSON with fields:
- tagged_photos: array of { photo_id, event_tags: string[], style_tags: string[], dancer_guesses: string[], quality_score: number, suggested_caption: string }
- batch_summary: { dominant_style: string, suggested_album_name: string }
Event Context: ${event_context}
Dancer Roster: ${JSON.stringify(dancer_roster).slice(0, 1500)}
Photos: ${JSON.stringify(photos).slice(0, 3000)}`;
      const result = await callOpenRouter(prompt);
      await persistAIResult({ userId: req.user?.id, feature: 'photo_tagging', inputs, parsed: result, model: MODEL });
      res.json({ success: true, tagging: result });
    } catch (err) {
      const code = err.statusCode || 500;
      res.status(code).json({ error: err.message });
    }
  });

// POST /api/ai/video-highlight-suggestions
router.post('/video-highlight-suggestions',
  body('video_metadata').notEmpty().withMessage('video_metadata is required'),
  validate,
  async (req, res) => {
    try {
      const { video_metadata, recital_program = [], target_clip_count = 6 } = req.body;
      const inputs = { target_clip_count, has_program: Array.isArray(recital_program) && recital_program.length > 0 };
      const prompt = `You are flagging highlight clips from a long recital recording.
Return ONLY valid JSON with fields:
- highlights: array of { start_time: string, end_time: string, label: string, reason: string, recommended_use: "social"|"parent_recap"|"promo"|"family_keepsake" }
- top_pick: { label: string, why: string }
- editing_notes: string[]
Target highlight count: ${target_clip_count}
Video Metadata:
${JSON.stringify(video_metadata).slice(0, 2000)}
Recital Program:
${JSON.stringify(recital_program).slice(0, 2000)}`;
      const result = await callOpenRouter(prompt);
      await persistAIResult({ userId: req.user?.id, feature: 'video_highlight_suggestions', inputs, parsed: result, model: MODEL });
      res.json({ success: true, highlights: result });
    } catch (err) {
      const code = err.statusCode || 500;
      res.status(code).json({ error: err.message });
    }
  });

// POST /api/ai/teacher-workload-balance
router.post('/teacher-workload-balance',
  body('teachers').isArray({ min: 1 }).withMessage('teachers array is required'),
  body('classes').isArray({ min: 1 }).withMessage('classes array is required'),
  validate,
  async (req, res) => {
    try {
      const { teachers, classes, constraints = {} } = req.body;
      const inputs = { teacher_count: teachers.length, class_count: classes.length };
      const prompt = `You are balancing teacher workload across classes for a dance studio.
Return ONLY valid JSON with fields:
- reassignments: array of { class_id, from_teacher, to_teacher, reason }
- workload_summary: array of { teacher_id, name, current_hours: number, target_hours: number, delta: number }
- risk_flags: string[]
- coaching_notes: string[]
Teachers: ${JSON.stringify(teachers).slice(0, 2500)}
Classes: ${JSON.stringify(classes).slice(0, 2500)}
Constraints: ${JSON.stringify(constraints)}`;
      const result = await callOpenRouter(prompt);
      await persistAIResult({ userId: req.user?.id, feature: 'teacher_workload_balance', inputs, parsed: result, model: MODEL });
      res.json({ success: true, plan: result });
    } catch (err) {
      const code = err.statusCode || 500;
      res.status(code).json({ error: err.message });
    }
  });

module.exports = router;
