const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.SERVER_PORT || 4000;

app.use(cors());
app.use(express.json());

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
app.use('/api/ai', aiRoutes);
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

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
