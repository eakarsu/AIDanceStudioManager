const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./db');
const { aiRateLimiter, generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.SERVER_PORT || 4000;
if (!process.env.DATABASE_URL && !(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER)) throw new Error('Database configuration is required');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');

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
const createWebhooksRouter = require('./routes/webhooks');
const createParentPortalRouter = require('./routes/parentPortal');
const createMobileShellRouter = require('./routes/mobileShell');
app.use('/api/auth', authRoutes);

app.use('/api', createMobileShellRouter(require('./middleware/auth'), require('./db'), {"name":"Dance Studio","shortName":"Studio","themeColor":"#a21caf","queries":[{"kind":"todaysClasses","sql":"SELECT id, class_name, starts_at FROM classes WHERE teacher_email = $1 LIMIT 25"}]}));app.use('/api', createParentPortalRouter(require('./middleware/auth'), require('./db')));
app.use('/api', createWebhooksRouter(require('../middleware/auth'), require('../db')));
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
app.use('/api/governed-operations', require('./routes/governedOperations'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

// // === Batch 02 Gaps & Frontend Mounts ===

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
