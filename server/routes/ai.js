const express = require('express');
const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(prompt) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:4000',
      'X-Title': 'AI Dance Studio Manager',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// POST /generate - General AI generation
router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const result = await callOpenRouter(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /class-description - Generate class marketing descriptions
router.post('/class-description', async (req, res) => {
  try {
    const { class_name, style, level, age_group, description, danceStyle, ageGroup, additionalInfo } = req.body;
    const prompt = `Generate an engaging marketing description for a dance class with the following details:
Class Name: ${class_name || 'Not specified'}
Dance Style: ${style || danceStyle || 'Not specified'}
Level: ${level || 'Not specified'}
Age Group: ${age_group || ageGroup || 'Not specified'}
Additional Info: ${description || additionalInfo || 'None'}

Write a compelling 2-3 paragraph description that would appeal to parents and students looking to enroll. Highlight the benefits, what students will learn, and the joy of dance.`;

    const result = await callOpenRouter(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /costume-brief and /costume-design - Generate costume design briefs
router.post('/costume-brief', async (req, res) => {
  try {
    const { class_name, style, theme, music_title, age_group, performance_type } = req.body;
    const prompt = `Create a detailed costume design brief for a dance performance:
Class: ${class_name}
Dance Style: ${style}
Theme: ${theme}
Music: ${music_title || 'Not specified'}
Age Group: ${age_group}
Performance Type: ${performance_type || 'Recital'}

Provide a costume design brief including: color palette suggestions, fabric recommendations, design elements, accessories, hair/makeup suggestions, and any practical considerations for dancers.`;

    const result = await callOpenRouter(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /routine-scoring - Analyze competition routine scoring
router.post('/routine-scoring', async (req, res) => {
  try {
    const { style, level, age_group, routine_description, scoring_criteria, previous_scores, danceStyle, routineDescription, duration } = req.body;
    const prompt = `Analyze a competition dance routine and provide scoring feedback:
Dance Style: ${style || danceStyle || 'Not specified'}
Level: ${level || 'Not specified'}
Age Group: ${age_group || 'Not specified'}
Routine Description: ${routine_description || routineDescription || 'Not specified'}
Duration: ${duration || 'Not specified'}
Scoring Criteria: ${scoring_criteria || 'Standard competition criteria'}
Previous Scores: ${previous_scores || 'Not available'}

Provide an analysis of potential strengths and areas for improvement. Include suggestions for maximizing competition scores based on typical judging criteria for this style and level.`;

    const result = await callOpenRouter(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /program-content - Generate recital program book content
router.post('/program-content', async (req, res) => {
  try {
    const { recital_name, theme, classes, teacher_names, special_notes } = req.body;
    const prompt = `Generate content for a dance recital program book:
Recital Name: ${recital_name}
Theme: ${theme}
Performing Classes: ${JSON.stringify(classes)}
Teachers: ${Array.isArray(teacher_names) ? teacher_names.join(', ') : teacher_names}
Special Notes: ${special_notes || 'None'}

Create program book content including: a welcome letter from the studio director, individual class/performance descriptions, teacher bios placeholders, and a closing thank you message. Make it warm, celebratory, and professional.`;

    const result = await callOpenRouter(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /placement - Student placement recommendations
router.post('/placement', async (req, res) => {
  try {
    const { student_name, age, experience_years, current_level, styles_studied, teacher_notes, goals } = req.body;
    const prompt = `Provide dance class placement recommendations for a student:
Student: ${student_name}
Age: ${age}
Years of Experience: ${experience_years}
Current Level: ${current_level}
Styles Studied: ${Array.isArray(styles_studied) ? styles_studied.join(', ') : styles_studied}
Teacher Notes: ${teacher_notes || 'None'}
Goals: ${goals || 'General progression'}

Recommend appropriate class placements considering the student's experience, age, and goals. Suggest a weekly schedule and any additional training that might benefit the student.`;

    const result = await callOpenRouter(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /music-suggestions - Choreography music suggestions
router.post('/music-suggestions', async (req, res) => {
  try {
    const { style, theme, mood, tempo, age_group, performance_type, duration, danceStyle, ageGroup, additionalPreferences } = req.body;
    const prompt = `Suggest music for a dance choreography:
Dance Style: ${style || danceStyle || 'Not specified'}
Theme: ${theme || mood || 'Open'}
Mood: ${mood || 'Not specified'}
Tempo: ${tempo || 'Moderate'}
Age Group: ${age_group || ageGroup || 'Not specified'}
Performance Type: ${performance_type || 'Recital'}
Desired Duration: ${duration || '2-3 minutes'}
Additional Preferences: ${additionalPreferences || 'None'}

Suggest 5-8 specific songs with artist names that would work well for this choreography. Include notes about why each song fits, suggested tempo/BPM if relevant, and any editing suggestions for performance length.`;

    const result = await callOpenRouter(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alias routes for frontend compatibility
router.post('/costume-design', async (req, res) => {
  try {
    const { danceStyle, theme, ageGroup, budget, colorPreferences } = req.body;
    const prompt = `Create a detailed costume design brief for a dance performance:
Dance Style: ${danceStyle || 'Not specified'}
Theme/Song: ${theme || 'Not specified'}
Age Group: ${ageGroup || 'Not specified'}
Budget per Costume: ${budget || 'Not specified'}
Color Preferences: ${colorPreferences || 'Not specified'}

Provide a costume design brief including: color palette suggestions, fabric recommendations, design elements, accessories, hair/makeup suggestions, and practical considerations for dancers.`;
    const result = await callOpenRouter(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/program-book', async (req, res) => {
  try {
    const { recitalName, theme, studioName, additionalInfo } = req.body;
    const prompt = `Generate content for a dance recital program book:
Recital Name: ${recitalName || 'Not specified'}
Theme: ${theme || 'Not specified'}
Studio Name: ${studioName || 'Not specified'}
Additional Details: ${additionalInfo || 'None'}

Create program book content including: a welcome letter from the studio director, individual class/performance descriptions, teacher bios placeholders, and a closing thank you message. Make it warm, celebratory, and professional.`;
    const result = await callOpenRouter(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/student-placement', async (req, res) => {
  try {
    const { studentAge, experience, goals, currentLevel } = req.body;
    const prompt = `Provide dance class placement recommendations for a student:
Age: ${studentAge || 'Not specified'}
Dance Experience: ${experience || 'Not specified'}
Goals: ${goals || 'General progression'}
Current Level: ${currentLevel || 'Not specified'}

Recommend appropriate class placements considering the student's experience, age, and goals. Suggest a weekly schedule and any additional training that might benefit the student.`;
    const result = await callOpenRouter(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
