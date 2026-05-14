-- AI Dance Studio Manager Database Schema

-- Users (staff, admin)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'staff', -- 'admin', 'staff', 'teacher'
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Studios (rooms/locations)
CREATE TABLE IF NOT EXISTS studios (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  phone VARCHAR(30),
  email VARCHAR(255),
  capacity INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(30),
  bio TEXT,
  specialties TEXT[], -- array of dance styles
  certifications TEXT[],
  hire_date DATE,
  hourly_rate NUMERIC(10, 2),
  is_active BOOLEAN DEFAULT true,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Families
CREATE TABLE IF NOT EXISTS families (
  id SERIAL PRIMARY KEY,
  family_name VARCHAR(255),
  parent_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(30),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  age_group VARCHAR(50), -- 'toddler', 'mini', 'junior', 'teen', 'adult'
  level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced', 'pre-professional'
  family_id INTEGER REFERENCES families(id) ON DELETE SET NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  emergency_contact JSONB,
  medical_notes TEXT,
  profile_photo TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  style VARCHAR(100), -- 'ballet', 'jazz', 'tap', 'hip-hop', 'contemporary', etc.
  level VARCHAR(50),
  age_group VARCHAR(50),
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  studio_id INTEGER REFERENCES studios(id) ON DELETE SET NULL,
  schedule_day VARCHAR(20),
  schedule_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  max_students INTEGER,
  current_enrollment INTEGER DEFAULT 0,
  description TEXT,
  monthly_fee NUMERIC(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  studio_id INTEGER REFERENCES studios(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  day_of_week VARCHAR(20),
  start_time TIME,
  end_time TIME,
  is_cancelled BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enrollment
CREATE TABLE IF NOT EXISTS enrollment (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'dropped', 'waitlist'
  enrolled_date DATE DEFAULT CURRENT_DATE,
  dropped_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, class_id)
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'present', -- 'present', 'absent', 'late', 'excused'
  notes TEXT,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recitals
CREATE TABLE IF NOT EXISTS recitals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  theme VARCHAR(255),
  date DATE,
  venue VARCHAR(255),
  address TEXT,
  time TIME,
  ticket_price NUMERIC(10, 2),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'confirmed', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Competitions
CREATE TABLE IF NOT EXISTS competitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organizer VARCHAR(255),
  location VARCHAR(255),
  date DATE,
  entry_deadline DATE,
  description TEXT,
  rules TEXT,
  registration_fee NUMERIC(10, 2),
  status VARCHAR(50) DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Costumes
CREATE TABLE IF NOT EXISTS costumes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  description TEXT,
  color VARCHAR(100),
  cost NUMERIC(10, 2),
  vendor VARCHAR(255),
  order_deadline DATE,
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Billing
CREATE TABLE IF NOT EXISTS billing (
  id SERIAL PRIMARY KEY,
  family_id INTEGER REFERENCES families(id) ON DELETE SET NULL,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  type VARCHAR(50), -- 'tuition', 'costume', 'competition', 'registration', 'other'
  due_date DATE,
  paid_date DATE,
  status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'overdue', 'partial', 'waived'
  auto_pay BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Volunteers
CREATE TABLE IF NOT EXISTS volunteers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(30),
  family_id INTEGER REFERENCES families(id) ON DELETE SET NULL,
  skills TEXT[],
  availability TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Props
CREATE TABLE IF NOT EXISTS props (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  condition VARCHAR(50),
  storage_location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Music Library
CREATE TABLE IF NOT EXISTS music_library (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  duration_seconds INTEGER,
  genre VARCHAR(100),
  style VARCHAR(100), -- dance style it suits
  file_path TEXT,
  license_type VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100), -- 'award', 'milestone', 'competition_placement', 'skill_mastery'
  date DATE,
  competition_id INTEGER REFERENCES competitions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Measurements
CREATE TABLE IF NOT EXISTS measurements (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  height_cm NUMERIC(5, 1),
  weight_kg NUMERIC(5, 1),
  chest_cm NUMERIC(5, 1),
  waist_cm NUMERIC(5, 1),
  hips_cm NUMERIC(5, 1),
  inseam_cm NUMERIC(5, 1),
  head_cm NUMERIC(5, 1),
  shoe_size VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Videos
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  recital_id INTEGER REFERENCES recitals(id) ON DELETE SET NULL,
  competition_id INTEGER REFERENCES competitions(id) ON DELETE SET NULL,
  url TEXT,
  file_path TEXT,
  duration_seconds INTEGER,
  recorded_date DATE,
  is_private BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  recital_id INTEGER REFERENCES recitals(id) ON DELETE SET NULL,
  url TEXT,
  file_path TEXT,
  taken_date DATE,
  is_private BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  family_id INTEGER REFERENCES families(id) ON DELETE SET NULL,
  requested_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'waiting', -- 'waiting', 'offered', 'enrolled', 'declined'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, class_id)
);

-- AI results store (one row per AI feature invocation; ai_results is the parsed JSON)
CREATE TABLE IF NOT EXISTS ai_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  feature VARCHAR(100) NOT NULL,
  inputs JSONB,
  ai_results JSONB,
  raw_response TEXT,
  model VARCHAR(100),
  tokens INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_results_feature ON ai_results(feature);
CREATE INDEX IF NOT EXISTS idx_ai_results_user ON ai_results(user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_family ON students(family_id);
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level);
CREATE INDEX IF NOT EXISTS idx_enrollment_student ON enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_class ON enrollment(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_status ON enrollment(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_billing_family ON billing(family_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(status);
CREATE INDEX IF NOT EXISTS idx_billing_due_date ON billing(due_date);
CREATE INDEX IF NOT EXISTS idx_classes_style ON classes(style);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
