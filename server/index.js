const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./db');
const { aiRateLimiter, generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.SERVER_PORT || 4000;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS — origins from env (comma-separated). Permissive in dev.
const corsOriginsEnv = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '';
const corsOrigins = corsOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(generalLimiter);

// Route imports
const authRoutes = require('./routes/auth');
const classesRoutes = require('./routes/classes');
const studentsRoutes = require('./routes/students');
const teachersRoutes = require('./routes/teachers');
const studiosRoutes = require('./routes/studios');
const schedulesRoutes = require('./routes/schedules');
const enrollmentRoutes = require('./routes/enrollment');
const attendanceRoutes = require('./routes/attendance');
const recitalsRoutes = require('./routes/recitals');
const competitionsRoutes = require('./routes/competitions');
const costumesRoutes = require('./routes/costumes');
const billingRoutes = require('./routes/billing');
const familiesRoutes = require('./routes/families');
const aiRoutes = require('./routes/ai');
const ticketsRoutes = require('./routes/tickets');
const merchandiseRoutes = require('./routes/merchandise');
const volunteersRoutes = require('./routes/volunteers');
const propsRoutes = require('./routes/props');
const musicRoutes = require('./routes/music');
const achievementsRoutes = require('./routes/achievements');
const measurementsRoutes = require('./routes/measurements');
const videosRoutes = require('./routes/videos');
const photosRoutes = require('./routes/photos');
const waitlistRoutes = require('./routes/waitlist');
const trialClassesRoutes = require('./routes/trial-classes');
const summerIntensivesRoutes = require('./routes/summer-intensives');
const makeupClassesRoutes = require('./routes/makeup-classes');
const financialReportsRoutes = require('./routes/financial-reports');
const costumeReadinessRiskRoutes = require('./routes/costumeReadinessRisk');

// Route registration
app.use('/api/auth', authRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/studios', studiosRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/recitals', recitalsRoutes);
app.use('/api/competitions', competitionsRoutes);
app.use('/api/costumes', costumesRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/families', familiesRoutes);
app.use('/api/ai', aiRateLimiter, aiRoutes);
app.use('/api/ai', aiRateLimiter, require('./routes/aiNew'));





app.use('/api/ai', require('./routes/parentEngage'));
app.use('/api/ai', require('./routes/teacherBalance'));
app.use('/api/ai', require('./routes/progressionTrack'));
app.use('/api/ai', require('./routes/eventOptimize'));
app.use('/api/ai', require('./routes/talentId'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/tickets', ticketsRoutes);
app.use('/api/merchandise', merchandiseRoutes);
app.use('/api/volunteers', volunteersRoutes);
app.use('/api/props', propsRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/measurements', measurementsRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/trial-classes', trialClassesRoutes);
app.use('/api/summer-intensives', summerIntensivesRoutes);
app.use('/api/makeup-classes', makeupClassesRoutes);
app.use('/api/financial-reports', financialReportsRoutes);
app.use('/api/costume-readiness-risk', costumeReadinessRiskRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Best-effort: ensure ai_results table exists for AI feature persistence.
async function ensureAiResultsTable() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      feature VARCHAR(100) NOT NULL,
      inputs JSONB,
      ai_results JSONB,
      raw_response TEXT,
      model VARCHAR(100),
      tokens INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_results_feature ON ai_results(feature)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_results_user ON ai_results(user_id)`);
  } catch (e) {
    console.warn('[startup] ai_results ensure skipped:', e.message);
  }
}

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-schedules-competitions-recitals-lack-ai-endpoints-for-schedu', require('./routes/gap_schedules_competitions_recitals_lack_ai_endpoints_for_schedu'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-music-videos-photos-lack-ai-curation-suggestion-endpoints', require('./routes/gap_music_videos_photos_lack_ai_curation_suggestion_endpoints'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-attendance-lacks-ai-no-show-churn-prediction', require('./routes/gap_attendance_lacks_ai_no_show_churn_prediction'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-video-streaming-recording-platform-integration', require('./routes/gap_no_video_streaming_recording_platform_integration'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-parent-portal-for-attendance-grades-messaging', require('./routes/gap_no_parent_portal_for_attendance_grades_messaging'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-mobile-app-for-students-teachers', require('./routes/gap_limited_mobile_app_for_students_teachers'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-music-licensing-integration-for-public-performances', require('./routes/gap_no_music_licensing_integration_for_public_performances'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-webhooks', require('./routes/gap_no_webhooks'));

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await ensureAiResultsTable();
});
