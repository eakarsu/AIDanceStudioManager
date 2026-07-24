require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require('../db');
const bcrypt = require('bcryptjs');

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ─── DROP ALL TABLES ───
    await client.query(`
      DROP TABLE IF EXISTS
        makeup_classes, financial_reports, waitlist, trial_classes, summer_intensives,
        photos, videos, measurements, achievements, music_licenses, props, volunteers,
        merchandise, tickets, billing, costumes, attendance, enrollment, schedules,
        classes, studios, teachers, students, families, recitals, competitions, users
      CASCADE;
    `);
    console.log('Dropped all tables.');

    // ─── CREATE TABLES ───

    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE families (
        id SERIAL PRIMARY KEY,
        family_name VARCHAR(100),
        parent_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        payment_method VARCHAR(50),
        auto_pay_enabled BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE students (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        date_of_birth DATE,
        age_group VARCHAR(20),
        level VARCHAR(50),
        family_id INT REFERENCES families(id) ON DELETE SET NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        emergency_contact VARCHAR(255),
        medical_notes TEXT,
        profile_photo VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE teachers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        specialties TEXT,
        bio TEXT,
        hourly_rate DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE studios (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        capacity INT,
        floor_type VARCHAR(50),
        has_mirrors BOOLEAN,
        has_barres BOOLEAN,
        sound_system VARCHAR(100),
        size_sqft INT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150),
        style VARCHAR(50),
        level VARCHAR(50),
        age_group VARCHAR(20),
        teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
        studio_id INT REFERENCES studios(id) ON DELETE SET NULL,
        schedule_day VARCHAR(20),
        schedule_time TIME,
        max_students INT,
        description TEXT,
        monthly_fee DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE schedules (
        id SERIAL PRIMARY KEY,
        class_id INT REFERENCES classes(id) ON DELETE CASCADE,
        teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
        studio_id INT REFERENCES studios(id) ON DELETE SET NULL,
        day_of_week VARCHAR(20),
        start_time TIME,
        end_time TIME,
        recurring BOOLEAN DEFAULT true
      );
    `);

    await client.query(`
      CREATE TABLE enrollment (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        class_id INT REFERENCES classes(id) ON DELETE CASCADE,
        enrollment_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE attendance (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        class_id INT REFERENCES classes(id) ON DELETE CASCADE,
        date DATE,
        status VARCHAR(50),
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE recitals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200),
        date DATE,
        venue VARCHAR(200),
        theme VARCHAR(200),
        description TEXT,
        ticket_price DECIMAL(10,2),
        status VARCHAR(50),
        rehearsal_dates TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE competitions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200),
        date DATE,
        location VARCHAR(200),
        organization VARCHAR(200),
        registration_deadline DATE,
        entry_fee DECIMAL(10,2),
        categories TEXT,
        results TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE costumes (
        id SERIAL PRIMARY KEY,
        class_id INT REFERENCES classes(id) ON DELETE SET NULL,
        name VARCHAR(150),
        description TEXT,
        vendor VARCHAR(150),
        cost_per_unit DECIMAL(10,2),
        sizes_needed TEXT,
        order_status VARCHAR(50),
        order_date DATE,
        delivery_date DATE
      );
    `);

    await client.query(`
      CREATE TABLE billing (
        id SERIAL PRIMARY KEY,
        family_id INT REFERENCES families(id) ON DELETE CASCADE,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        amount DECIMAL(10,2),
        type VARCHAR(50),
        due_date DATE,
        paid_date DATE,
        status VARCHAR(50) DEFAULT 'pending',
        auto_pay BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE tickets (
        id SERIAL PRIMARY KEY,
        recital_id INT REFERENCES recitals(id) ON DELETE CASCADE,
        buyer_name VARCHAR(150),
        buyer_email VARCHAR(255),
        quantity INT,
        seat_section VARCHAR(50),
        total_price DECIMAL(10,2),
        purchase_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'confirmed'
      );
    `);

    await client.query(`
      CREATE TABLE merchandise (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150),
        description TEXT,
        category VARCHAR(50),
        price DECIMAL(10,2),
        stock_quantity INT,
        size VARCHAR(20),
        image_url VARCHAR(500)
      );
    `);

    await client.query(`
      CREATE TABLE volunteers (
        id SERIAL PRIMARY KEY,
        recital_id INT REFERENCES recitals(id) ON DELETE CASCADE,
        name VARCHAR(150),
        email VARCHAR(255),
        phone VARCHAR(20),
        role VARCHAR(100),
        shift VARCHAR(100),
        confirmed BOOLEAN DEFAULT false
      );
    `);

    await client.query(`
      CREATE TABLE props (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150),
        description TEXT,
        condition VARCHAR(50),
        storage_location VARCHAR(100),
        associated_class VARCHAR(150),
        quantity INT DEFAULT 1
      );
    `);

    await client.query(`
      CREATE TABLE music_licenses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200),
        artist VARCHAR(150),
        license_type VARCHAR(100),
        license_expiry DATE,
        usage_context VARCHAR(200),
        cost DECIMAL(10,2),
        file_url VARCHAR(500)
      );
    `);

    await client.query(`
      CREATE TABLE achievements (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        title VARCHAR(200),
        description TEXT,
        date DATE,
        category VARCHAR(100),
        competition_name VARCHAR(200)
      );
    `);

    await client.query(`
      CREATE TABLE measurements (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        height VARCHAR(20),
        weight VARCHAR(20),
        shoe_size VARCHAR(10),
        chest VARCHAR(20),
        waist VARCHAR(20),
        hips VARCHAR(20),
        inseam VARCHAR(20),
        measured_date DATE
      );
    `);

    await client.query(`
      CREATE TABLE videos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200),
        class_id INT REFERENCES classes(id) ON DELETE SET NULL,
        url VARCHAR(500),
        description TEXT,
        shared_date DATE DEFAULT CURRENT_DATE,
        visibility VARCHAR(50) DEFAULT 'enrolled'
      );
    `);

    await client.query(`
      CREATE TABLE photos (
        id SERIAL PRIMARY KEY,
        date DATE,
        photographer VARCHAR(150),
        location VARCHAR(200),
        class_id INT REFERENCES classes(id) ON DELETE SET NULL,
        package_info TEXT,
        status VARCHAR(50) DEFAULT 'scheduled'
      );
    `);

    await client.query(`
      CREATE TABLE waitlist (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        class_id INT REFERENCES classes(id) ON DELETE CASCADE,
        position INT,
        added_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'waiting',
        notified BOOLEAN DEFAULT false
      );
    `);

    await client.query(`
      CREATE TABLE trial_classes (
        id SERIAL PRIMARY KEY,
        student_name VARCHAR(150),
        parent_name VARCHAR(150),
        email VARCHAR(255),
        phone VARCHAR(20),
        class_id INT REFERENCES classes(id) ON DELETE SET NULL,
        trial_date DATE,
        status VARCHAR(50) DEFAULT 'scheduled',
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE summer_intensives (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200),
        description TEXT,
        start_date DATE,
        end_date DATE,
        instructor VARCHAR(150),
        level VARCHAR(50),
        max_students INT,
        fee DECIMAL(10,2),
        registered_count INT DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE makeup_classes (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        original_class_id INT REFERENCES classes(id) ON DELETE SET NULL,
        makeup_class_id INT REFERENCES classes(id) ON DELETE SET NULL,
        original_date DATE,
        makeup_date DATE,
        status VARCHAR(50) DEFAULT 'scheduled',
        reason TEXT
      );
    `);

    await client.query(`
      CREATE TABLE financial_reports (
        id SERIAL PRIMARY KEY,
        report_type VARCHAR(50),
        period VARCHAR(50),
        revenue DECIMAL(12,2),
        expenses DECIMAL(12,2),
        net_income DECIMAL(12,2),
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('All tables created.');

    // ─── SEED DATA ───

    // 1. USERS (15)
    const hashedPassword = await bcrypt.hash(requireDemoPassword(), 10);
    await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role) VALUES
        ('admin@dancestudio.com', $1, 'Sarah', 'Mitchell', 'admin'),
        ('manager@dancestudio.com', $1, 'David', 'Chen', 'admin'),
        ('frontdesk@dancestudio.com', $1, 'Emily', 'Roberts', 'staff'),
        ('billing@dancestudio.com', $1, 'Jessica', 'Taylor', 'staff'),
        ('teacher1@dancestudio.com', $1, 'Maria', 'Gonzalez', 'teacher'),
        ('teacher2@dancestudio.com', $1, 'Anna', 'Petrova', 'teacher'),
        ('teacher3@dancestudio.com', $1, 'James', 'Waller', 'teacher'),
        ('teacher4@dancestudio.com', $1, 'Keiko', 'Tanaka', 'teacher'),
        ('teacher5@dancestudio.com', $1, 'Leah', 'Washington', 'teacher'),
        ('coordinator@dancestudio.com', $1, 'Rachel', 'Kim', 'staff'),
        ('costume@dancestudio.com', $1, 'Nina', 'Patel', 'staff'),
        ('media@dancestudio.com', $1, 'Tyler', 'Brooks', 'staff'),
        ('assistant@dancestudio.com', $1, 'Megan', 'Foster', 'staff'),
        ('volunteer@dancestudio.com', $1, 'Karen', 'Sullivan', 'volunteer'),
        ('parent@dancestudio.com', $1, 'Lisa', 'Anderson', 'parent');
    `, [hashedPassword]);
    console.log('Seeded users.');

    // 2. FAMILIES (15)
    await client.query(`
      INSERT INTO families (family_name, parent_name, email, phone, address, payment_method, auto_pay_enabled, notes) VALUES
        ('Anderson', 'Lisa Anderson', 'lisa.anderson@email.com', '555-0101', '123 Oak Lane, Springfield', 'credit_card', true, 'Two daughters enrolled'),
        ('Martinez', 'Carlos Martinez', 'carlos.martinez@email.com', '555-0102', '456 Maple Ave, Springfield', 'credit_card', true, 'Son in hip-hop'),
        ('Johnson', 'Michelle Johnson', 'michelle.j@email.com', '555-0103', '789 Pine St, Springfield', 'bank_transfer', false, 'Daughter on scholarship'),
        ('Williams', 'Robert Williams', 'rwilliams@email.com', '555-0104', '321 Elm Blvd, Shelbyville', 'credit_card', true, ''),
        ('Brown', 'Patricia Brown', 'p.brown@email.com', '555-0105', '654 Cedar Dr, Springfield', 'check', false, 'Pays quarterly'),
        ('Davis', 'Sandra Davis', 'sandra.davis@email.com', '555-0106', '987 Birch Way, Springfield', 'credit_card', true, 'Three kids enrolled'),
        ('Garcia', 'Maria Garcia', 'mgarcia@email.com', '555-0107', '147 Walnut St, Shelbyville', 'credit_card', false, 'Daughter in competition team'),
        ('Miller', 'Thomas Miller', 'tmiller@email.com', '555-0108', '258 Ash Ct, Springfield', 'bank_transfer', true, ''),
        ('Wilson', 'Jennifer Wilson', 'jen.wilson@email.com', '555-0109', '369 Spruce Ln, Springfield', 'credit_card', true, 'Twin girls in ballet'),
        ('Moore', 'Angela Moore', 'amoore@email.com', '555-0110', '471 Poplar Ave, Springfield', 'check', false, 'Son in tap and jazz'),
        ('Taylor', 'Kevin Taylor', 'ktaylor@email.com', '555-0111', '582 Willow Dr, Shelbyville', 'credit_card', true, ''),
        ('Thomas', 'Barbara Thomas', 'bthomas@email.com', '555-0112', '693 Hickory Rd, Springfield', 'credit_card', false, 'Daughter preparing for recital'),
        ('Jackson', 'Deborah Jackson', 'djackson@email.com', '555-0113', '804 Sycamore Blvd, Springfield', 'bank_transfer', true, 'Two children enrolled'),
        ('White', 'Steven White', 'swhite@email.com', '555-0114', '915 Magnolia St, Springfield', 'credit_card', true, 'Daughter in lyrical'),
        ('Harris', 'Dorothy Harris', 'dharris@email.com', '555-0115', '126 Dogwood Ct, Shelbyville', 'check', false, 'Granddaughter enrolled');
    `);
    console.log('Seeded families.');

    // 3. STUDENTS (20)
    await client.query(`
      INSERT INTO students (first_name, last_name, date_of_birth, age_group, level, family_id, phone, email, emergency_contact, medical_notes, profile_photo) VALUES
        ('Emma', 'Anderson', '2015-03-14', '9-12', 'Intermediate', 1, '555-0101', 'lisa.anderson@email.com', 'Lisa Anderson 555-0101', '', NULL),
        ('Olivia', 'Anderson', '2018-07-22', '6-8', 'Beginner', 1, '555-0101', 'lisa.anderson@email.com', 'Lisa Anderson 555-0101', '', NULL),
        ('Diego', 'Martinez', '2012-11-05', '13-17', 'Intermediate', 2, '555-0102', 'carlos.martinez@email.com', 'Carlos Martinez 555-0102', '', NULL),
        ('Sophia', 'Johnson', '2016-01-30', '9-12', 'Advanced', 3, '555-0103', 'michelle.j@email.com', 'Michelle Johnson 555-0103', 'Mild asthma - has inhaler', NULL),
        ('Aiden', 'Williams', '2019-09-18', '6-8', 'Beginner', 4, '555-0104', 'rwilliams@email.com', 'Robert Williams 555-0104', '', NULL),
        ('Mia', 'Davis', '2014-05-12', '9-12', 'Intermediate', 6, '555-0106', 'sandra.davis@email.com', 'Sandra Davis 555-0106', '', NULL),
        ('Lucas', 'Davis', '2017-02-28', '6-8', 'Beginner', 6, '555-0106', 'sandra.davis@email.com', 'Sandra Davis 555-0106', '', NULL),
        ('Zoe', 'Davis', '2020-08-15', '3-5', 'Beginner', 6, '555-0106', 'sandra.davis@email.com', 'Sandra Davis 555-0106', '', NULL),
        ('Isabella', 'Garcia', '2013-04-09', '13-17', 'Advanced', 7, '555-0107', 'mgarcia@email.com', 'Maria Garcia 555-0107', '', NULL),
        ('Ethan', 'Miller', '2011-12-20', '13-17', 'Pre-Professional', 8, '555-0108', 'tmiller@email.com', 'Thomas Miller 555-0108', 'Knee brace - right knee', NULL),
        ('Ava', 'Wilson', '2016-06-06', '9-12', 'Intermediate', 9, '555-0109', 'jen.wilson@email.com', 'Jennifer Wilson 555-0109', '', NULL),
        ('Lily', 'Wilson', '2016-06-06', '9-12', 'Intermediate', 9, '555-0109', 'jen.wilson@email.com', 'Jennifer Wilson 555-0109', '', NULL),
        ('Noah', 'Moore', '2015-10-03', '9-12', 'Beginner', 10, '555-0110', 'amoore@email.com', 'Angela Moore 555-0110', '', NULL),
        ('Chloe', 'Taylor', '2017-08-25', '6-8', 'Beginner', 11, '555-0111', 'ktaylor@email.com', 'Kevin Taylor 555-0111', 'Allergic to latex', NULL),
        ('Grace', 'Thomas', '2014-02-14', '9-12', 'Intermediate', 12, '555-0112', 'bthomas@email.com', 'Barbara Thomas 555-0112', '', NULL),
        ('Liam', 'Jackson', '2013-07-19', '13-17', 'Intermediate', 13, '555-0113', 'djackson@email.com', 'Deborah Jackson 555-0113', '', NULL),
        ('Harper', 'Jackson', '2018-03-01', '6-8', 'Beginner', 13, '555-0113', 'djackson@email.com', 'Deborah Jackson 555-0113', '', NULL),
        ('Aria', 'White', '2012-09-11', '13-17', 'Advanced', 14, '555-0114', 'swhite@email.com', 'Steven White 555-0114', '', NULL),
        ('Ella', 'Harris', '2019-11-30', '6-8', 'Beginner', 15, '555-0115', 'dharris@email.com', 'Dorothy Harris 555-0115', '', NULL),
        ('Scarlett', 'Brown', '2010-04-22', '13-17', 'Pre-Professional', 5, '555-0105', 'p.brown@email.com', 'Patricia Brown 555-0105', '', NULL);
    `);
    console.log('Seeded students.');

    // 4. TEACHERS (15)
    await client.query(`
      INSERT INTO teachers (first_name, last_name, email, phone, specialties, bio, hourly_rate, status) VALUES
        ('Maria', 'Gonzalez', 'maria.g@dancestudio.com', '555-1001', 'Ballet, Pointe', '20 years of classical ballet training. Former principal dancer with City Ballet.', 75.00, 'active'),
        ('Anna', 'Petrova', 'anna.p@dancestudio.com', '555-1002', 'Ballet, Contemporary', 'Trained at the Bolshoi Academy. Specializes in classical and contemporary fusion.', 80.00, 'active'),
        ('James', 'Waller', 'james.w@dancestudio.com', '555-1003', 'Hip-Hop, Jazz', 'Professional hip-hop dancer and choreographer with 15 years of experience.', 65.00, 'active'),
        ('Keiko', 'Tanaka', 'keiko.t@dancestudio.com', '555-1004', 'Contemporary, Lyrical', 'MFA in Dance from NYU Tisch. Choreographed for multiple national tours.', 70.00, 'active'),
        ('Leah', 'Washington', 'leah.w@dancestudio.com', '555-1005', 'Tap, Jazz', 'Broadway veteran with credits in three Tony-nominated shows.', 70.00, 'active'),
        ('Michael', 'Rivera', 'michael.r@dancestudio.com', '555-1006', 'Acro, Jazz', 'Former Cirque du Soleil performer. Certified acrobatics instructor.', 65.00, 'active'),
        ('Sophie', 'Laurent', 'sophie.l@dancestudio.com', '555-1007', 'Ballet, Pointe', 'Trained at Paris Opera Ballet School. RAD certified examiner.', 85.00, 'active'),
        ('Derek', 'Thompson', 'derek.t@dancestudio.com', '555-1008', 'Hip-Hop, Contemporary', 'Toured with major pop artists. Known for innovative urban choreography.', 60.00, 'active'),
        ('Rachel', 'Kim', 'rachel.k@dancestudio.com', '555-1009', 'Contemporary, Lyrical, Jazz', 'Competition team coach. Multiple national championship-winning routines.', 70.00, 'active'),
        ('Elena', 'Rossi', 'elena.r@dancestudio.com', '555-1010', 'Ballet, Contemporary', '15 years teaching experience. Vaganova and Cecchetti methods.', 75.00, 'active'),
        ('Marcus', 'Hall', 'marcus.h@dancestudio.com', '555-1011', 'Tap, Musical Theatre', 'Tap virtuoso. Performed with Savion Glover''s company.', 65.00, 'active'),
        ('Natalie', 'Foster', 'natalie.f@dancestudio.com', '555-1012', 'Jazz, Lyrical', 'Commercial dance background. Choreographed music videos and commercials.', 60.00, 'active'),
        ('Victor', 'Santos', 'victor.s@dancestudio.com', '555-1013', 'Acro, Hip-Hop', 'Gymnastics background combined with street dance expertise.', 60.00, 'active'),
        ('Christine', 'Lee', 'christine.l@dancestudio.com', '555-1014', 'Ballet, Pointe, Contemporary', 'Former soloist with Pacific Northwest Ballet. 12 years teaching.', 80.00, 'active'),
        ('Brandon', 'Clarke', 'brandon.c@dancestudio.com', '555-1015', 'Jazz, Musical Theatre', 'Broadway performer turned educator. Engaging and dynamic teaching style.', 65.00, 'on_leave');
    `);
    console.log('Seeded teachers.');

    // 5. STUDIOS (15)
    await client.query(`
      INSERT INTO studios (name, capacity, floor_type, has_mirrors, has_barres, sound_system, size_sqft) VALUES
        ('Studio A', 30, 'sprung hardwood', true, true, 'Bose surround system', 1200),
        ('Studio B', 25, 'sprung hardwood', true, true, 'JBL speakers', 1000),
        ('Studio C', 20, 'marley over sprung', true, true, 'Yamaha sound bar', 800),
        ('Studio D', 15, 'marley over sprung', true, false, 'Bluetooth speaker', 600),
        ('Main Stage', 50, 'sprung hardwood', false, false, 'Full PA system with monitors', 2500),
        ('Studio E', 20, 'vinyl', true, true, 'JBL Bluetooth', 750),
        ('Rehearsal Hall', 40, 'sprung hardwood', true, true, 'Bose professional PA', 1800),
        ('Mini Studio', 10, 'marley', true, false, 'Portable speaker', 400),
        ('Studio F', 25, 'sprung hardwood', true, true, 'Sonos system', 950),
        ('Acro Room', 20, 'sprung with mats', true, false, 'Ceiling-mounted speakers', 900),
        ('Studio G', 18, 'marley over sprung', true, true, 'JBL PartyBox', 700),
        ('Private Lesson Room', 8, 'hardwood', true, true, 'Small Bluetooth speaker', 300),
        ('Stretch Studio', 15, 'cork with mats', true, false, 'Ambient speakers', 500),
        ('Studio H', 22, 'sprung hardwood', true, true, 'QSC speakers', 850),
        ('Outdoor Stage', 60, 'portable marley', false, false, 'Portable PA system', 3000);
    `);
    console.log('Seeded studios.');

    // 6. CLASSES (20)
    await client.query(`
      INSERT INTO classes (name, style, level, age_group, teacher_id, studio_id, schedule_day, schedule_time, max_students, description, monthly_fee) VALUES
        ('Tiny Tutus Ballet', 'Ballet', 'Beginner', '3-5', 1, 4, 'Saturday', '09:00', 12, 'Introduction to ballet for our youngest dancers. Focus on rhythm, coordination, and fun!', 85.00),
        ('Ballet Foundations', 'Ballet', 'Beginner', '6-8', 1, 1, 'Monday', '16:00', 20, 'Classical ballet fundamentals including positions, basic barre work, and simple combinations.', 95.00),
        ('Ballet Intermediate', 'Ballet', 'Intermediate', '9-12', 7, 1, 'Tuesday', '16:30', 18, 'Building on foundational skills with longer combinations, turns, and jumps.', 110.00),
        ('Ballet Advanced', 'Ballet', 'Advanced', '13-17', 2, 1, 'Wednesday', '17:00', 15, 'Advanced technique including complex allegro, adagio, and pre-pointe preparation.', 130.00),
        ('Pointe Class', 'Pointe', 'Advanced', '13-17', 7, 2, 'Thursday', '17:30', 12, 'For dancers cleared by instructor. Focus on strength, alignment, and pointe technique.', 135.00),
        ('Jazz Juniors', 'Jazz', 'Beginner', '6-8', 5, 3, 'Monday', '17:00', 18, 'High-energy jazz class introducing isolations, across-the-floor, and fun choreography.', 90.00),
        ('Jazz Intermediate', 'Jazz', 'Intermediate', '9-12', 12, 2, 'Wednesday', '16:00', 16, 'Jazz technique with more complex choreography, turns, and leaps.', 105.00),
        ('Hip-Hop Basics', 'Hip-Hop', 'Beginner', '9-12', 3, 3, 'Tuesday', '17:00', 20, 'Learn the foundations of hip-hop including popping, locking, and freestyle.', 90.00),
        ('Hip-Hop Advanced', 'Hip-Hop', 'Advanced', '13-17', 8, 6, 'Friday', '18:00', 18, 'Advanced hip-hop choreography and freestyle. Battles and performance prep.', 110.00),
        ('Contemporary Flow', 'Contemporary', 'Intermediate', '13-17', 4, 1, 'Thursday', '18:00', 16, 'Explore movement through contemporary technique, improvisation, and expression.', 115.00),
        ('Lyrical Dreams', 'Lyrical', 'Intermediate', '9-12', 4, 2, 'Monday', '18:00', 15, 'Combining ballet and jazz technique with emotional storytelling through movement.', 110.00),
        ('Tap Stars', 'Tap', 'Beginner', '6-8', 5, 5, 'Wednesday', '16:30', 16, 'Rhythm and coordination through basic tap steps, shuffles, and time steps.', 90.00),
        ('Tap Intermediate', 'Tap', 'Intermediate', '9-12', 11, 9, 'Tuesday', '16:00', 14, 'Building speed and complexity with wings, pullbacks, and choreography.', 105.00),
        ('Acro Dance', 'Acro', 'Beginner', '6-8', 6, 10, 'Saturday', '10:00', 15, 'Safely learn cartwheels, walkovers, and acrobatic elements combined with dance.', 100.00),
        ('Acro Intermediate', 'Acro', 'Intermediate', '9-12', 13, 10, 'Saturday', '11:00', 12, 'Advance acro skills including aerials, handsprings, and dance integration.', 115.00),
        ('Competition Team Jazz', 'Jazz', 'Advanced', '13-17', 9, 7, 'Tuesday', '18:30', 20, 'Competition-level jazz training with intense choreography and performance quality.', 150.00),
        ('Competition Team Contemporary', 'Contemporary', 'Advanced', '13-17', 9, 7, 'Thursday', '18:30', 20, 'Competition-level contemporary for serious dancers.', 150.00),
        ('Adult Ballet', 'Ballet', 'Beginner', '18+', 10, 9, 'Tuesday', '19:30', 20, 'Ballet for adults of all experience levels. A great workout in a supportive environment.', 80.00),
        ('Adult Hip-Hop', 'Hip-Hop', 'Beginner', '18+', 8, 3, 'Thursday', '20:00', 22, 'Fun, high-energy hip-hop class for adults. No experience necessary!', 80.00),
        ('Pre-Professional Ballet', 'Ballet', 'Pre-Professional', '13-17', 14, 1, 'Monday', '17:30', 10, 'Intensive training for dancers pursuing professional careers. By audition only.', 175.00);
    `);
    console.log('Seeded classes.');

    // 7. SCHEDULES (15)
    await client.query(`
      INSERT INTO schedules (class_id, teacher_id, studio_id, day_of_week, start_time, end_time, recurring) VALUES
        (1, 1, 4, 'Saturday', '09:00', '09:45', true),
        (2, 1, 1, 'Monday', '16:00', '17:00', true),
        (3, 7, 1, 'Tuesday', '16:30', '17:30', true),
        (4, 2, 1, 'Wednesday', '17:00', '18:30', true),
        (5, 7, 2, 'Thursday', '17:30', '18:30', true),
        (6, 5, 3, 'Monday', '17:00', '18:00', true),
        (7, 12, 2, 'Wednesday', '16:00', '17:00', true),
        (8, 3, 3, 'Tuesday', '17:00', '18:00', true),
        (9, 8, 6, 'Friday', '18:00', '19:15', true),
        (10, 4, 1, 'Thursday', '18:00', '19:15', true),
        (11, 4, 2, 'Monday', '18:00', '19:00', true),
        (12, 5, 5, 'Wednesday', '16:30', '17:15', true),
        (16, 9, 7, 'Tuesday', '18:30', '20:00', true),
        (17, 9, 7, 'Thursday', '18:30', '20:00', true),
        (20, 14, 1, 'Monday', '17:30', '19:30', true);
    `);
    console.log('Seeded schedules.');

    // 8. ENROLLMENT (20)
    await client.query(`
      INSERT INTO enrollment (student_id, class_id, enrollment_date, status, notes) VALUES
        (1, 3, '2025-09-01', 'active', ''),
        (1, 11, '2025-09-01', 'active', ''),
        (2, 2, '2025-09-01', 'active', ''),
        (3, 9, '2025-09-01', 'active', 'Loves hip-hop'),
        (4, 3, '2025-09-01', 'active', 'Scholarship student'),
        (5, 2, '2025-09-15', 'active', ''),
        (6, 7, '2025-09-01', 'active', ''),
        (7, 6, '2025-09-01', 'active', ''),
        (8, 1, '2025-09-01', 'active', 'First dance class ever'),
        (9, 4, '2025-09-01', 'active', 'Competition team member'),
        (9, 16, '2025-09-01', 'active', ''),
        (10, 20, '2025-09-01', 'active', 'Pre-professional track'),
        (11, 3, '2025-09-01', 'active', ''),
        (12, 3, '2025-09-01', 'active', ''),
        (13, 8, '2025-10-01', 'active', ''),
        (14, 2, '2025-09-15', 'active', ''),
        (15, 7, '2025-09-01', 'active', ''),
        (16, 10, '2025-09-01', 'active', ''),
        (18, 17, '2025-09-01', 'active', 'Competition team'),
        (20, 5, '2025-09-01', 'active', 'Cleared for pointe');
    `);
    console.log('Seeded enrollment.');

    // 9. ATTENDANCE (20)
    await client.query(`
      INSERT INTO attendance (student_id, class_id, date, status, notes) VALUES
        (1, 3, '2026-03-03', 'present', ''),
        (1, 3, '2026-03-10', 'present', ''),
        (1, 3, '2026-03-17', 'absent', 'Family vacation'),
        (2, 2, '2026-03-02', 'present', ''),
        (2, 2, '2026-03-09', 'present', ''),
        (3, 9, '2026-03-06', 'present', ''),
        (4, 3, '2026-03-03', 'present', 'Great improvement on turns'),
        (4, 3, '2026-03-10', 'late', 'Arrived 10 minutes late'),
        (5, 2, '2026-03-02', 'present', ''),
        (6, 7, '2026-03-04', 'present', ''),
        (7, 6, '2026-03-02', 'absent', 'Sick'),
        (9, 4, '2026-03-05', 'present', ''),
        (9, 16, '2026-03-04', 'present', ''),
        (10, 20, '2026-03-02', 'present', 'Excellent focus today'),
        (11, 3, '2026-03-03', 'present', ''),
        (12, 3, '2026-03-03', 'present', ''),
        (13, 8, '2026-03-04', 'present', ''),
        (15, 7, '2026-03-04', 'present', ''),
        (18, 17, '2026-03-06', 'present', ''),
        (20, 5, '2026-03-06', 'present', 'Strong on releve');
    `);
    console.log('Seeded attendance.');

    // 10. RECITALS (15)
    await client.query(`
      INSERT INTO recitals (name, date, venue, theme, description, ticket_price, status, rehearsal_dates) VALUES
        ('Spring Showcase 2026', '2026-06-14', 'Springfield Performing Arts Center', 'Enchanted Garden', 'Our annual spring recital featuring all classes and age groups.', 25.00, 'planning', '2026-06-07, 2026-06-12, 2026-06-13'),
        ('Winter Wonderland 2025', '2025-12-20', 'Springfield Performing Arts Center', 'Winter Magic', 'Holiday-themed recital celebrating the season.', 25.00, 'completed', '2025-12-13, 2025-12-18, 2025-12-19'),
        ('Summer Spectacular 2026', '2026-08-15', 'Outdoor Amphitheater', 'Around the World', 'End-of-summer showcase featuring dance styles from around the globe.', 20.00, 'upcoming', '2026-08-08, 2026-08-13, 2026-08-14'),
        ('Fall Festival 2026', '2026-10-31', 'Springfield Community Theater', 'Spooky Spectacular', 'A Halloween-themed performance night.', 22.00, 'upcoming', '2026-10-24, 2026-10-29, 2026-10-30'),
        ('Nutcracker 2026', '2026-12-18', 'Springfield Performing Arts Center', 'The Nutcracker', 'Full-length Nutcracker production featuring advanced and pre-professional students.', 35.00, 'upcoming', '2026-11-01 through 2026-12-17'),
        ('Competition Showcase 2026', '2026-04-25', 'Studio Main Stage', 'Best of Competition', 'Competition team performs their award-winning routines for families.', 15.00, 'planning', '2026-04-18, 2026-04-23'),
        ('Spring Showcase 2025', '2025-06-15', 'Springfield Performing Arts Center', 'Under the Sea', 'Ocean-themed recital from last spring.', 25.00, 'completed', ''),
        ('New Student Showcase', '2026-05-10', 'Studio Main Stage', 'First Steps', 'A low-key showcase for beginner students to gain performance experience.', 10.00, 'planning', '2026-05-03, 2026-05-08'),
        ('Charity Gala Performance', '2026-09-20', 'Grand Ballroom Hotel', 'Dance for a Cause', 'Benefit performance raising funds for arts education in schools.', 50.00, 'upcoming', '2026-09-13, 2026-09-18'),
        ('Holiday Extravaganza 2026', '2026-12-21', 'Springfield Performing Arts Center', 'Joyful Celebration', 'All-studio holiday recital for non-Nutcracker dancers.', 25.00, 'upcoming', '2026-12-14, 2026-12-19'),
        ('Hip-Hop Night', '2026-07-10', 'Studio Main Stage', 'Street to Stage', 'A night dedicated entirely to hip-hop and urban dance styles.', 15.00, 'upcoming', '2026-07-03, 2026-07-08'),
        ('Tap Spectacular', '2026-05-22', 'Springfield Community Theater', 'Rhythm Nation', 'Dedicated tap dance showcase.', 18.00, 'planning', '2026-05-15, 2026-05-20'),
        ('Year-End Awards Show', '2026-06-20', 'Studio Main Stage', 'Celebrating Our Dancers', 'Awards ceremony with special performances from each class.', 0.00, 'upcoming', '2026-06-15'),
        ('Alumni Reunion Performance', '2026-11-15', 'Springfield Performing Arts Center', 'Then and Now', 'Current students perform alongside studio alumni.', 20.00, 'upcoming', '2026-11-08, 2026-11-13'),
        ('Mini Recital - Tots', '2026-04-12', 'Studio Main Stage', 'Little Stars', 'Special short recital for our 3-5 age group.', 10.00, 'planning', '2026-04-05, 2026-04-10');
    `);
    console.log('Seeded recitals.');

    // 11. COMPETITIONS (15)
    await client.query(`
      INSERT INTO competitions (name, date, location, organization, registration_deadline, entry_fee, categories, results) VALUES
        ('Starbound National Talent Competition', '2026-03-28', 'Convention Center, Chicago', 'Starbound', '2026-02-15', 85.00, 'Solo, Duo/Trio, Small Group, Large Group, Line/Production', 'Pending'),
        ('JUMP Dance Convention', '2026-04-18', 'Hilton Downtown, NYC', 'JUMP', '2026-03-15', 95.00, 'Mini, Junior, Teen, Senior', 'Pending'),
        ('Showstopper Dance Competition', '2026-05-02', 'Marriott Conference Center, LA', 'Showstopper', '2026-04-01', 80.00, 'Solo, Duo/Trio, Group, Super Group', 'Pending'),
        ('Radix Dance Convention', '2026-05-16', 'Grand Hyatt, Atlanta', 'Radix', '2026-04-15', 90.00, 'Mini, Junior, Teen, Senior, Contemporary, Hip-Hop', 'Pending'),
        ('Nuvo Dance Convention', '2026-06-06', 'Sheraton Hotel, Dallas', 'NUVO', '2026-05-01', 88.00, 'Mini, Junior, Teen, Senior', 'Pending'),
        ('Tremaine Dance Convention', '2026-02-21', 'Convention Center, Orlando', 'Tremaine', '2026-01-20', 92.00, 'Petite, Junior, Teen, Senior', 'Gold - Small Group Jazz, High Gold - Solo Contemporary'),
        ('Hall of Fame Dance Challenge', '2026-03-14', 'Expo Center, Phoenix', 'Hall of Fame', '2026-02-14', 75.00, 'Solo, Duo/Trio, Small Group, Large Group', 'Platinum - Duo/Trio Lyrical'),
        ('New York Dance Alliance', '2026-07-12', 'Lincoln Center Area, NYC', 'NYDA', '2026-06-01', 100.00, 'Solo, Duo/Trio, Group, Line', 'Pending'),
        ('KAR Dance Competition', '2026-04-05', 'Civic Center, Denver', 'KAR', '2026-03-01', 78.00, 'Mini, Junior, Teen, Senior, All Styles', 'Pending'),
        ('Groove National Dance Competition', '2026-08-01', 'Convention Center, Nashville', 'Groove', '2026-07-01', 82.00, 'Solo, Duo/Trio, Small Group, Large Group', 'Pending'),
        ('Adrenaline Dance Convention', '2026-03-07', 'Grand Ballroom, San Francisco', 'Adrenaline', '2026-02-07', 88.00, 'Mini, Junior, Teen, Senior', 'High Gold - Group Hip-Hop'),
        ('The Dance Awards', '2026-07-25', 'Orleans Arena, Las Vegas', 'Break the Floor', '2026-05-15', 120.00, 'Mini Best Dancer, Junior Best Dancer, Teen Best Dancer, Senior Best Dancer', 'Pending'),
        ('Energizers Dance Competition', '2026-04-26', 'Hotel Ballroom, Boston', 'Energizers', '2026-03-26', 72.00, 'Solo, Duo/Trio, Group, Production', 'Pending'),
        ('24Seven Dance Convention', '2026-06-20', 'Marriott Marquis, San Diego', '24Seven', '2026-05-20', 95.00, 'Junior, Teen, Senior', 'Pending'),
        ('Regional Dance America', '2026-05-30', 'Performing Arts Center, Portland', 'RDA', '2026-04-30', 65.00, 'Ensemble, Solo, Pas de Deux, Choreography', 'Pending');
    `);
    console.log('Seeded competitions.');

    // 12. COSTUMES (15)
    await client.query(`
      INSERT INTO costumes (class_id, name, description, vendor, cost_per_unit, sizes_needed, order_status, order_date, delivery_date) VALUES
        (1, 'Tiny Tutu Pink', 'Pink tutu with sparkle bodice for Tiny Tutus Ballet', 'Weissman Designs', 45.00, 'XS(4), S(5), S(3)', 'delivered', '2026-01-15', '2026-02-20'),
        (2, 'Blue Belle Leotard', 'Powder blue leotard with attached skirt', 'Curtain Call Costumes', 52.00, 'Child S(6), Child M(8), Child L(6)', 'delivered', '2026-01-15', '2026-02-18'),
        (3, 'Lavender Elegance', 'Lavender lyrical dress with lace overlay', 'A Wish Come True', 65.00, 'Child M(5), Child L(7), Youth S(6)', 'delivered', '2026-01-20', '2026-02-25'),
        (4, 'Classical White Tutu', 'Professional-grade white classical tutu', 'Revolution Dancewear', 95.00, 'Youth S(4), Youth M(6), Youth L(5)', 'ordered', '2026-02-10', '2026-04-01'),
        (5, 'Pointe Performance', 'Champagne-colored pointe costume with crystals', 'Custom Design Studio', 120.00, 'Youth S(3), Youth M(5), Youth L(4)', 'ordered', '2026-02-10', '2026-04-15'),
        (6, 'Jazz Sparkle Red', 'Red sequin jazz costume with fringe', 'Weissman Designs', 48.00, 'Child S(5), Child M(8), Child L(5)', 'delivered', '2026-01-10', '2026-02-12'),
        (8, 'Hip-Hop Street', 'Black cargo pants and graffiti crop top set', 'Urban Dance Supply', 55.00, 'Youth S(6), Youth M(8), Youth L(6)', 'delivered', '2026-01-20', '2026-02-28'),
        (10, 'Contemporary Earth', 'Flowing earth-tone dress with asymmetric hem', 'Kellys Costumes', 72.00, 'Youth S(4), Youth M(7), Youth L(5)', 'ordered', '2026-02-15', '2026-04-05'),
        (11, 'Lyrical Sky Blue', 'Sky blue chiffon dress with beaded bodice', 'A Wish Come True', 68.00, 'Child L(4), Youth S(6), Youth M(5)', 'delivered', '2026-01-18', '2026-02-22'),
        (12, 'Tap Tuxedo', 'Black and white tuxedo-style tap outfit with top hat', 'Curtain Call Costumes', 58.00, 'Child S(4), Child M(7), Child L(5)', 'ordered', '2026-02-20', '2026-03-30'),
        (14, 'Acro Flame', 'Orange and red unitard with flame design', 'Revolution Dancewear', 50.00, 'Child S(4), Child M(6), Child L(5)', 'in_production', '2026-02-25', '2026-04-10'),
        (16, 'Competition Jazz Black', 'Black rhinestoned competition jazz costume', 'Custom Design Studio', 135.00, 'Youth S(5), Youth M(8), Youth L(7)', 'in_production', '2026-02-01', '2026-03-25'),
        (17, 'Competition Contemporary', 'Dusty rose contemporary competition dress', 'Custom Design Studio', 140.00, 'Youth S(5), Youth M(8), Youth L(7)', 'ordered', '2026-02-01', '2026-03-25'),
        (9, 'Hip-Hop Neon', 'Neon green and black hip-hop outfit', 'Urban Dance Supply', 60.00, 'Youth M(5), Youth L(7), Adult S(6)', 'delivered', '2026-01-05', '2026-02-05'),
        (20, 'Pre-Pro White Swan', 'Professional white swan lake tutu with headpiece', 'Custom Design Studio', 250.00, 'Youth M(3), Youth L(4), Adult S(3)', 'ordered', '2026-02-15', '2026-05-01');
    `);
    console.log('Seeded costumes.');

    // 13. BILLING (20)
    await client.query(`
      INSERT INTO billing (family_id, student_id, amount, type, due_date, paid_date, status, auto_pay) VALUES
        (1, 1, 110.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', true),
        (1, 1, 110.00, 'monthly_tuition', '2026-04-01', NULL, 'pending', true),
        (1, 2, 95.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', true),
        (2, 3, 110.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', true),
        (3, 4, 110.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', false),
        (4, 5, 95.00, 'monthly_tuition', '2026-03-01', NULL, 'overdue', false),
        (6, 6, 105.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', true),
        (6, 7, 90.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', true),
        (6, 8, 85.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', true),
        (7, 9, 280.00, 'monthly_tuition', '2026-03-01', '2026-03-02', 'paid', false),
        (8, 10, 175.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', true),
        (9, 11, 110.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', true),
        (9, 12, 110.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', true),
        (7, 9, 135.00, 'costume_fee', '2026-02-15', '2026-02-15', 'paid', false),
        (5, 20, 250.00, 'costume_fee', '2026-03-15', NULL, 'pending', false),
        (13, 16, 115.00, 'monthly_tuition', '2026-03-01', NULL, 'overdue', false),
        (14, 18, 150.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', true),
        (1, 1, 85.00, 'competition_fee', '2026-03-15', NULL, 'pending', false),
        (10, 13, 90.00, 'monthly_tuition', '2026-03-01', '2026-03-05', 'paid', false),
        (15, 19, 95.00, 'monthly_tuition', '2026-03-01', '2026-03-01', 'paid', false);
    `);
    console.log('Seeded billing.');

    // 14. TICKETS (15)
    await client.query(`
      INSERT INTO tickets (recital_id, buyer_name, buyer_email, quantity, seat_section, total_price, purchase_date, status) VALUES
        (1, 'Lisa Anderson', 'lisa.anderson@email.com', 4, 'Orchestra', 100.00, '2026-03-10', 'confirmed'),
        (1, 'Carlos Martinez', 'carlos.martinez@email.com', 2, 'Orchestra', 50.00, '2026-03-12', 'confirmed'),
        (1, 'Michelle Johnson', 'michelle.j@email.com', 3, 'Mezzanine', 75.00, '2026-03-11', 'confirmed'),
        (1, 'Robert Williams', 'rwilliams@email.com', 2, 'Orchestra', 50.00, '2026-03-15', 'confirmed'),
        (1, 'Sandra Davis', 'sandra.davis@email.com', 6, 'Orchestra', 150.00, '2026-03-08', 'confirmed'),
        (1, 'Maria Garcia', 'mgarcia@email.com', 4, 'Mezzanine', 100.00, '2026-03-14', 'confirmed'),
        (1, 'Jennifer Wilson', 'jen.wilson@email.com', 5, 'Orchestra', 125.00, '2026-03-09', 'confirmed'),
        (1, 'Angela Moore', 'amoore@email.com', 3, 'Balcony', 75.00, '2026-03-16', 'confirmed'),
        (1, 'Kevin Taylor', 'ktaylor@email.com', 2, 'Mezzanine', 50.00, '2026-03-18', 'pending'),
        (1, 'Barbara Thomas', 'bthomas@email.com', 4, 'Orchestra', 100.00, '2026-03-13', 'confirmed'),
        (1, 'Steven White', 'swhite@email.com', 3, 'Orchestra', 75.00, '2026-03-17', 'confirmed'),
        (1, 'Dorothy Harris', 'dharris@email.com', 2, 'Balcony', 50.00, '2026-03-19', 'pending'),
        (6, 'Lisa Anderson', 'lisa.anderson@email.com', 2, 'General', 30.00, '2026-04-01', 'confirmed'),
        (6, 'Thomas Miller', 'tmiller@email.com', 3, 'General', 45.00, '2026-04-02', 'confirmed'),
        (8, 'Sandra Davis', 'sandra.davis@email.com', 4, 'General', 40.00, '2026-04-15', 'confirmed');
    `);
    console.log('Seeded tickets.');

    // 15. MERCHANDISE (15)
    await client.query(`
      INSERT INTO merchandise (name, description, category, price, stock_quantity, size, image_url) VALUES
        ('Studio Logo T-Shirt', 'Cotton t-shirt with studio logo in rhinestones', 'apparel', 28.00, 50, 'S/M/L/XL', '/images/merch/logo-tshirt.jpg'),
        ('Studio Logo Tank Top', 'Flowy tank top with studio logo', 'apparel', 25.00, 40, 'S/M/L', '/images/merch/logo-tank.jpg'),
        ('Dance Bag', 'Large duffel bag with studio branding', 'accessories', 45.00, 25, 'One Size', '/images/merch/dance-bag.jpg'),
        ('Water Bottle', 'Stainless steel water bottle with logo', 'accessories', 18.00, 60, 'One Size', '/images/merch/water-bottle.jpg'),
        ('Ballet Sticker Pack', 'Set of 10 dance-themed vinyl stickers', 'accessories', 8.00, 100, 'One Size', '/images/merch/stickers.jpg'),
        ('Studio Hoodie', 'Cozy pullover hoodie with embroidered logo', 'apparel', 48.00, 30, 'S/M/L/XL', '/images/merch/hoodie.jpg'),
        ('Warm-Up Pants', 'Studio-branded knit warm-up pants', 'apparel', 35.00, 35, 'Child/Youth/Adult', '/images/merch/warmup-pants.jpg'),
        ('Hair Kit', 'Bun pins, hairnet, gel, and bobby pins set', 'dance_supplies', 12.00, 75, 'One Size', '/images/merch/hair-kit.jpg'),
        ('Leg Warmers', 'Knit leg warmers in studio colors', 'dance_supplies', 16.00, 45, 'Child/Adult', '/images/merch/legwarmers.jpg'),
        ('Studio Keychain', 'Metal keychain with dance shoe charm', 'accessories', 10.00, 80, 'One Size', '/images/merch/keychain.jpg'),
        ('Recital Program 2026', 'Printed program for Spring Showcase 2026', 'programs', 5.00, 200, 'One Size', '/images/merch/program-2026.jpg'),
        ('Recital DVD/Digital', 'Recording of Spring Showcase 2026', 'media', 30.00, 100, 'One Size', '/images/merch/recital-dvd.jpg'),
        ('Studio Crop Top', 'Cropped t-shirt with glitter logo', 'apparel', 26.00, 35, 'S/M/L', '/images/merch/crop-top.jpg'),
        ('Dance Mom T-Shirt', '"Proud Dance Mom" t-shirt', 'apparel', 24.00, 40, 'S/M/L/XL', '/images/merch/dance-mom.jpg'),
        ('Pointe Shoe Ornament', 'Miniature pointe shoe Christmas ornament', 'accessories', 14.00, 50, 'One Size', '/images/merch/ornament.jpg');
    `);
    console.log('Seeded merchandise.');

    // 16. VOLUNTEERS (15)
    await client.query(`
      INSERT INTO volunteers (recital_id, name, email, phone, role, shift, confirmed) VALUES
        (1, 'Lisa Anderson', 'lisa.anderson@email.com', '555-0101', 'Backstage Parent', 'Full Show', true),
        (1, 'Carlos Martinez', 'carlos.martinez@email.com', '555-0102', 'Usher', 'First Half', true),
        (1, 'Patricia Brown', 'p.brown@email.com', '555-0105', 'Concessions', 'Full Show', true),
        (1, 'Sandra Davis', 'sandra.davis@email.com', '555-0106', 'Backstage Parent', 'Full Show', true),
        (1, 'Jennifer Wilson', 'jen.wilson@email.com', '555-0109', 'Dressing Room Monitor', 'Full Show', true),
        (1, 'Angela Moore', 'amoore@email.com', '555-0110', 'Usher', 'Second Half', false),
        (1, 'Kevin Taylor', 'ktaylor@email.com', '555-0111', 'Parking Attendant', 'Pre-Show', true),
        (1, 'Barbara Thomas', 'bthomas@email.com', '555-0112', 'Hair/Makeup Helper', 'Pre-Show', true),
        (1, 'Deborah Jackson', 'djackson@email.com', '555-0113', 'Concessions', 'Full Show', false),
        (1, 'Steven White', 'swhite@email.com', '555-0114', 'Photography Assistant', 'Full Show', true),
        (1, 'Dorothy Harris', 'dharris@email.com', '555-0115', 'Greeter', 'Pre-Show and First Half', true),
        (1, 'Mark Peterson', 'mpeterson@email.com', '555-0201', 'Stage Crew', 'Full Show', true),
        (1, 'Nancy Cooper', 'ncooper@email.com', '555-0202', 'Ticket Booth', 'Pre-Show', false),
        (1, 'Frank Reynolds', 'freynolds@email.com', '555-0203', 'Sound/Lighting Assistant', 'Full Show', true),
        (1, 'Amy Chang', 'achang@email.com', '555-0204', 'Program Distributor', 'Pre-Show', true);
    `);
    console.log('Seeded volunteers.');

    // 17. PROPS (15)
    await client.query(`
      INSERT INTO props (name, description, condition, storage_location, associated_class, quantity) VALUES
        ('Large Flower Arch', 'Wire arch decorated with silk flowers for Enchanted Garden recital', 'good', 'Storage Room A', 'Spring Showcase', 1),
        ('Wooden Chairs (set)', 'Set of 6 painted wooden chairs for jazz routines', 'good', 'Storage Room A', 'Jazz Intermediate', 6),
        ('Umbrellas (clear)', 'Clear bubble umbrellas for Singin in the Rain tap number', 'new', 'Storage Room B', 'Tap Stars', 16),
        ('Silk Fans', 'Large silk fans for Chinese-inspired contemporary piece', 'good', 'Storage Room B', 'Contemporary Flow', 20),
        ('Top Hats', 'Black satin top hats for tap tuxedo number', 'good', 'Costume Closet', 'Tap Intermediate', 15),
        ('LED Hula Hoops', 'Color-changing LED hoops for acro routine', 'new', 'Storage Room A', 'Acro Dance', 12),
        ('Ribbon Wands', 'Satin ribbon wands for tiny tots ballet', 'fair', 'Mini Studio', 'Tiny Tutus Ballet', 15),
        ('Fog Machine', 'Professional fog machine for dramatic stage effects', 'good', 'Tech Booth', 'All Recitals', 1),
        ('Mirror Ball', 'Rotating mirror ball with motor', 'good', 'Tech Booth', 'All Recitals', 1),
        ('Fabric Backdrop - Forest', '20x12 ft painted forest backdrop', 'good', 'Storage Room A', 'Spring Showcase', 1),
        ('Fabric Backdrop - City', '20x12 ft urban cityscape backdrop for hip-hop', 'fair', 'Storage Room A', 'Hip-Hop Night', 1),
        ('Stepping Stools (set)', 'Set of 5 graduated platforms for group formations', 'good', 'Storage Room B', 'Competition Team Jazz', 5),
        ('Feather Boas', 'Assorted color feather boas for jazz number', 'good', 'Costume Closet', 'Jazz Juniors', 20),
        ('Canes', 'Gold-colored dance canes for musical theatre number', 'good', 'Storage Room B', 'Jazz Intermediate', 18),
        ('Giant Storybook', '4ft tall prop storybook that opens for Tiny Tutus entrance', 'good', 'Storage Room A', 'Tiny Tutus Ballet', 1);
    `);
    console.log('Seeded props.');

    // 18. MUSIC LICENSES (15)
    await client.query(`
      INSERT INTO music_licenses (title, artist, license_type, license_expiry, usage_context, cost, file_url) VALUES
        ('Swan Lake - Act II', 'Tchaikovsky', 'public_domain', '2099-12-31', 'Ballet Advanced and Pre-Professional recital piece', 0.00, '/music/swan-lake-act2.mp3'),
        ('Singin'' in the Rain', 'Gene Kelly / Arthur Freed', 'performance_license', '2026-12-31', 'Tap Stars recital number', 45.00, '/music/singin-in-the-rain.mp3'),
        ('Lovely', 'Billie Eilish & Khalid', 'sync_license', '2026-08-31', 'Contemporary Flow competition routine', 75.00, '/music/lovely.mp3'),
        ('Clair de Lune', 'Debussy', 'public_domain', '2099-12-31', 'Lyrical Dreams recital piece', 0.00, '/music/clair-de-lune.mp3'),
        ('Uptown Funk', 'Bruno Mars', 'performance_license', '2026-12-31', 'Jazz Intermediate recital number', 55.00, '/music/uptown-funk.mp3'),
        ('Nutcracker Suite', 'Tchaikovsky', 'public_domain', '2099-12-31', 'Nutcracker production', 0.00, '/music/nutcracker-suite.mp3'),
        ('Levitating', 'Dua Lipa', 'sync_license', '2026-06-30', 'Hip-Hop Basics recital piece', 65.00, '/music/levitating.mp3'),
        ('River', 'Bishop Briggs', 'sync_license', '2026-12-31', 'Competition Team Contemporary', 80.00, '/music/river.mp3'),
        ('Bohemian Rhapsody', 'Queen', 'performance_license', '2026-12-31', 'Jazz competition group number', 70.00, '/music/bohemian-rhapsody.mp3'),
        ('Flower Duet', 'Delibes', 'public_domain', '2099-12-31', 'Pointe Class duet', 0.00, '/music/flower-duet.mp3'),
        ('Bad Guy', 'Billie Eilish', 'sync_license', '2026-09-30', 'Hip-Hop Advanced competition solo', 60.00, '/music/bad-guy.mp3'),
        ('Hallelujah', 'Leonard Cohen', 'performance_license', '2026-12-31', 'Lyrical group recital piece', 50.00, '/music/hallelujah.mp3'),
        ('Mr. Sandman', 'The Chordettes', 'performance_license', '2026-12-31', 'Tap Intermediate number', 40.00, '/music/mr-sandman.mp3'),
        ('Gravity', 'Sara Bareilles', 'sync_license', '2026-12-31', 'Contemporary competition solo', 55.00, '/music/gravity.mp3'),
        ('Dance of the Sugar Plum Fairy', 'Tchaikovsky', 'public_domain', '2099-12-31', 'Nutcracker featured solo', 0.00, '/music/sugar-plum-fairy.mp3');
    `);
    console.log('Seeded music_licenses.');

    // 19. ACHIEVEMENTS (15)
    await client.query(`
      INSERT INTO achievements (student_id, title, description, date, category, competition_name) VALUES
        (9, 'Platinum Award - Solo Contemporary', 'Scored 290/300 for solo contemporary "Breathe"', '2026-02-21', 'competition', 'Tremaine Dance Convention'),
        (9, 'Top 10 Teen Solo', 'Placed in top 10 for teen solo division', '2026-02-21', 'competition', 'Tremaine Dance Convention'),
        (10, 'Gold Award - Solo Ballet', 'Exceptional technique and artistry in classical variation', '2026-02-21', 'competition', 'Tremaine Dance Convention'),
        (20, 'High Gold - Duo/Trio Lyrical', 'Performed "Unwritten" lyrical trio', '2026-03-14', 'competition', 'Hall of Fame Dance Challenge'),
        (18, 'Platinum Award - Group Contemporary', 'Part of competition team contemporary "Rising"', '2026-03-14', 'competition', 'Hall of Fame Dance Challenge'),
        (3, 'High Gold - Group Hip-Hop', 'Part of hip-hop group "Street Legends"', '2026-03-07', 'competition', 'Adrenaline Dance Convention'),
        (1, 'Most Improved Dancer', 'Recognized for exceptional improvement in ballet technique', '2026-01-15', 'studio_award', 'Studio Awards'),
        (4, 'Scholarship Recipient', 'Awarded merit-based scholarship for outstanding dedication', '2025-09-01', 'scholarship', 'Studio Scholarship Program'),
        (10, 'Accepted to Summer Intensive', 'Accepted to American Ballet Theatre summer program', '2026-02-01', 'acceptance', 'ABT Summer Intensive'),
        (6, 'Perfect Attendance', 'Attended every class for fall semester 2025', '2025-12-20', 'studio_award', 'Fall Semester Awards'),
        (11, 'Rising Star Award', 'Recognized for rapid skill development', '2025-12-20', 'studio_award', 'Winter Recital Awards'),
        (12, 'Rising Star Award', 'Recognized for rapid skill development', '2025-12-20', 'studio_award', 'Winter Recital Awards'),
        (16, 'Best Choreography', 'Created outstanding original choreography for student showcase', '2026-01-20', 'studio_award', 'Student Choreography Night'),
        (15, 'Community Service Award', 'Volunteered 20+ hours teaching dance at community center', '2026-02-15', 'community', 'Community Outreach Program'),
        (9, 'National Qualifier', 'Qualified for The Dance Awards in Teen Best Dancer category', '2026-03-14', 'competition', 'Hall of Fame Dance Challenge');
    `);
    console.log('Seeded achievements.');

    // 20. MEASUREMENTS (15)
    await client.query(`
      INSERT INTO measurements (student_id, height, weight, shoe_size, chest, waist, hips, inseam, measured_date) VALUES
        (1, '4''8"', '72 lbs', '3', '28"', '24"', '29"', '22"', '2026-01-10'),
        (2, '3''11"', '48 lbs', '13C', '24"', '21"', '24"', '17"', '2026-01-10'),
        (3, '5''6"', '120 lbs', '9', '33"', '27"', '34"', '28"', '2026-01-12'),
        (4, '4''10"', '78 lbs', '4', '29"', '24"', '30"', '24"', '2026-01-10'),
        (5, '3''8"', '42 lbs', '12C', '23"', '20"', '23"', '16"', '2026-01-15'),
        (6, '4''9"', '75 lbs', '3.5', '28"', '24"', '29"', '23"', '2026-01-12'),
        (7, '3''10"', '45 lbs', '13C', '24"', '21"', '24"', '17"', '2026-01-12'),
        (8, '3''2"', '32 lbs', '9C', '21"', '19"', '21"', '13"', '2026-01-12'),
        (9, '5''4"', '110 lbs', '7.5', '32"', '26"', '33"', '27"', '2026-01-11'),
        (10, '5''9"', '140 lbs', '10', '35"', '29"', '34"', '30"', '2026-01-11'),
        (11, '4''7"', '68 lbs', '2.5', '27"', '23"', '28"', '21"', '2026-01-14'),
        (12, '4''7"', '70 lbs', '2.5', '27"', '23"', '28"', '21"', '2026-01-14'),
        (13, '4''6"', '65 lbs', '2', '27"', '23"', '27"', '21"', '2026-01-15'),
        (18, '5''5"', '115 lbs', '8', '32"', '26"', '33"', '28"', '2026-01-11'),
        (20, '5''7"', '125 lbs', '8.5', '33"', '27"', '34"', '29"', '2026-01-11');
    `);
    console.log('Seeded measurements.');

    // 21. VIDEOS (15)
    await client.query(`
      INSERT INTO videos (title, class_id, url, description, shared_date, visibility) VALUES
        ('Ballet Intermediate - Recital Choreography Preview', 3, 'https://vimeo.com/studio/ballet-int-2026', 'Preview of the spring recital choreography for parent review.', '2026-03-15', 'enrolled'),
        ('Hip-Hop Basics - Week 10 Combo', 8, 'https://vimeo.com/studio/hiphop-w10', 'Practice video for this week''s hip-hop combination.', '2026-03-10', 'enrolled'),
        ('Tiny Tutus - Recital Dance Practice', 1, 'https://vimeo.com/studio/tinytutus-recital', 'Practice at home! Here''s our recital dance with counts.', '2026-03-12', 'enrolled'),
        ('Competition Team Jazz - Nationals Routine', 16, 'https://vimeo.com/studio/comp-jazz-nationals', 'Full run-through of nationals routine for team review only.', '2026-03-08', 'enrolled'),
        ('Contemporary Flow - Improvisation Exercise', 10, 'https://vimeo.com/studio/contemp-improv', 'Improvisation exercise from Thursday''s class.', '2026-03-06', 'enrolled'),
        ('Pointe Class - Barre Exercises', 5, 'https://vimeo.com/studio/pointe-barre', 'Barre warm-up exercises for home practice.', '2026-03-01', 'enrolled'),
        ('Winter Recital 2025 - Full Show', NULL, 'https://vimeo.com/studio/winter-2025-full', 'Complete recording of Winter Wonderland recital.', '2025-12-28', 'all_families'),
        ('Tap Stars - Singin in the Rain Choreography', 12, 'https://vimeo.com/studio/tap-singin', 'Learn the choreography at home with this practice video.', '2026-03-05', 'enrolled'),
        ('Jazz Juniors - Across the Floor Combos', 6, 'https://vimeo.com/studio/jazz-jr-combos', 'This week''s across the floor combinations for practice.', '2026-03-09', 'enrolled'),
        ('Pre-Professional Ballet - Variation Tutorial', 20, 'https://vimeo.com/studio/prepro-variation', 'Breakdown of the classical variation for spring showcase.', '2026-03-14', 'enrolled'),
        ('Lyrical Dreams - Recital Formation Notes', 11, 'https://vimeo.com/studio/lyrical-formations', 'Overhead view of recital formations and spacing.', '2026-03-11', 'enrolled'),
        ('Acro Dance - Flexibility Routine', 14, 'https://vimeo.com/studio/acro-flex', 'Follow-along flexibility and conditioning routine.', '2026-02-28', 'public'),
        ('Adult Ballet - Beginner Barre', 18, 'https://vimeo.com/studio/adult-barre', 'Full barre sequence for home practice.', '2026-03-03', 'enrolled'),
        ('Studio Open House Highlights', NULL, 'https://vimeo.com/studio/openhouse-2026', 'Highlights from our January open house event.', '2026-01-20', 'public'),
        ('Competition Team Contemporary - Rehearsal', 17, 'https://vimeo.com/studio/comp-contemp-rehearsal', 'Full rehearsal video with notes from Rachel.', '2026-03-13', 'enrolled');
    `);
    console.log('Seeded videos.');

    // 22. PHOTOS (15)
    await client.query(`
      INSERT INTO photos (date, photographer, location, class_id, package_info, status) VALUES
        ('2026-06-14', 'Sarah Mitchell Photography', 'Springfield Performing Arts Center', NULL, 'Individual: $35, Group: $25, Bundle: $50', 'scheduled'),
        ('2026-06-13', 'Sarah Mitchell Photography', 'Springfield Performing Arts Center', NULL, 'Dress rehearsal candids - included in bundle package', 'scheduled'),
        ('2025-12-20', 'Sarah Mitchell Photography', 'Springfield Performing Arts Center', NULL, 'Individual: $35, Group: $25, Bundle: $50', 'completed'),
        ('2026-03-15', 'Jake Romano Photography', 'Studio A', 3, 'Class photos: $20 each', 'completed'),
        ('2026-03-16', 'Jake Romano Photography', 'Studio A', 4, 'Class photos: $20 each', 'completed'),
        ('2026-03-17', 'Jake Romano Photography', 'Studio C', 8, 'Class photos: $20 each', 'scheduled'),
        ('2026-04-01', 'Creative Lens Studios', 'Studio Main Stage', 16, 'Competition team headshots: $40 each', 'scheduled'),
        ('2026-04-01', 'Creative Lens Studios', 'Studio Main Stage', 17, 'Competition team headshots: $40 each', 'scheduled'),
        ('2026-04-05', 'Jake Romano Photography', 'All Studios', NULL, 'Spring class photos - all classes: $20 individual, $15 group', 'scheduled'),
        ('2026-01-15', 'Studio Staff', 'Studio A', 20, 'Pre-professional headshots for applications', 'completed'),
        ('2026-02-20', 'Creative Lens Studios', 'Rehearsal Hall', NULL, 'Competition team action shots: $30 package', 'completed'),
        ('2026-05-10', 'Sarah Mitchell Photography', 'Studio Main Stage', NULL, 'New Student Showcase photos', 'scheduled'),
        ('2026-08-15', 'Sarah Mitchell Photography', 'Outdoor Amphitheater', NULL, 'Summer Spectacular photos: $35 individual, $25 group', 'scheduled'),
        ('2026-03-20', 'Jake Romano Photography', 'Studio B', 5, 'Pointe class artistic photos: $45 each', 'scheduled'),
        ('2025-06-15', 'Sarah Mitchell Photography', 'Springfield Performing Arts Center', NULL, 'Spring Showcase 2025 - completed and delivered', 'completed');
    `);
    console.log('Seeded photos.');

    // 23. WAITLIST (15)
    await client.query(`
      INSERT INTO waitlist (student_id, class_id, position, added_date, status, notified) VALUES
        (13, 3, 1, '2026-02-15', 'waiting', false),
        (14, 8, 1, '2026-02-20', 'waiting', false),
        (7, 8, 2, '2026-03-01', 'waiting', false),
        (5, 14, 1, '2026-03-05', 'waiting', false),
        (17, 2, 1, '2026-03-10', 'waiting', false),
        (19, 1, 1, '2026-03-08', 'waiting', false),
        (6, 10, 1, '2026-01-20', 'enrolled', true),
        (15, 16, 1, '2026-01-15', 'enrolled', true),
        (16, 17, 1, '2026-02-01', 'waiting', false),
        (3, 16, 2, '2026-02-10', 'waiting', false),
        (1, 5, 1, '2026-03-01', 'waiting', false),
        (18, 20, 1, '2026-02-15', 'waiting', false),
        (4, 11, 1, '2026-03-12', 'waiting', false),
        (11, 7, 1, '2026-03-15', 'waiting', false),
        (12, 7, 2, '2026-03-15', 'waiting', false);
    `);
    console.log('Seeded waitlist.');

    // 24. TRIAL CLASSES (15)
    await client.query(`
      INSERT INTO trial_classes (student_name, parent_name, email, phone, class_id, trial_date, status, notes) VALUES
        ('Sophia Chen', 'Wei Chen', 'wei.chen@email.com', '555-0301', 2, '2026-03-24', 'scheduled', 'Interested in ballet, no prior experience'),
        ('Jayden Brooks', 'Tamara Brooks', 'tbrooks@email.com', '555-0302', 8, '2026-03-25', 'scheduled', 'Has some hip-hop experience from school'),
        ('Ava Patel', 'Priya Patel', 'ppatel@email.com', '555-0303', 1, '2026-03-28', 'scheduled', 'Age 4, very excited to start dancing'),
        ('Mason Rodriguez', 'Elena Rodriguez', 'erodriguez@email.com', '555-0304', 14, '2026-03-28', 'scheduled', 'Does gymnastics, wants to try acro dance'),
        ('Lily Thompson', 'Mark Thompson', 'mthompson@email.com', '555-0305', 6, '2026-03-23', 'scheduled', 'Age 7, tried ballet before'),
        ('Zara Ahmed', 'Fatima Ahmed', 'fahmed@email.com', '555-0306', 10, '2026-03-27', 'scheduled', 'Has contemporary experience, recently moved'),
        ('Oliver Grant', 'Susan Grant', 'sgrant@email.com', '555-0307', 12, '2026-03-26', 'scheduled', 'Very interested in tap'),
        ('Isabella Nguyen', 'Tran Nguyen', 'tnguyen@email.com', '555-0308', 3, '2026-03-17', 'completed', 'Loved the class, parents enrolling'),
        ('Emma Sullivan', 'Patrick Sullivan', 'psullivan@email.com', '555-0309', 11, '2026-03-10', 'completed', 'Enrolled after trial'),
        ('Lucas Kim', 'Hana Kim', 'hkim@email.com', '555-0310', 8, '2026-03-11', 'completed', 'Decided to wait until fall'),
        ('Mila Ivanova', 'Dmitri Ivanov', 'divanov@email.com', '555-0311', 18, '2026-03-18', 'completed', 'Adult beginner, signed up for full semester'),
        ('Charlotte Reed', 'Anne Reed', 'areed@email.com', '555-0312', 2, '2026-04-07', 'scheduled', 'Transferring from another studio'),
        ('Henry Cooper', 'Laura Cooper', 'lcooper@email.com', '555-0313', 19, '2026-03-27', 'scheduled', 'Adult, no dance experience'),
        ('Nora Blake', 'Catherine Blake', 'cblake@email.com', '555-0314', 1, '2026-03-15', 'no_show', 'Did not show up, follow up needed'),
        ('Aiden Park', 'James Park', 'jpark@email.com', '555-0315', 15, '2026-04-05', 'scheduled', 'Age 10, interested in acrobatics');
    `);
    console.log('Seeded trial_classes.');

    // 25. SUMMER INTENSIVES (15)
    await client.query(`
      INSERT INTO summer_intensives (name, description, start_date, end_date, instructor, level, max_students, fee, registered_count) VALUES
        ('Ballet Intensive Week', 'Five-day intensive focusing on classical ballet technique, variations, and performance', '2026-07-06', '2026-07-10', 'Anna Petrova', 'Intermediate', 25, 350.00, 18),
        ('Pre-Professional Ballet Camp', 'Two-week intensive for dancers pursuing professional ballet careers', '2026-07-13', '2026-07-24', 'Sophie Laurent & Christine Lee', 'Pre-Professional', 15, 750.00, 12),
        ('Hip-Hop Dance Camp', 'One-week camp covering popping, locking, breaking, and choreography', '2026-06-22', '2026-06-26', 'James Waller & Derek Thompson', 'All Levels', 30, 275.00, 22),
        ('Contemporary Exploration', 'Four-day workshop exploring contemporary technique and improvisation', '2026-07-06', '2026-07-09', 'Keiko Tanaka', 'Intermediate', 20, 280.00, 15),
        ('Jazz & Musical Theatre Week', 'Five-day intensive combining jazz technique with musical theatre performance', '2026-06-29', '2026-07-03', 'Leah Washington & Brandon Clarke', 'Intermediate', 25, 325.00, 20),
        ('Tiny Dancers Camp (Ages 3-5)', 'Half-day camp introducing little ones to ballet, creative movement, and fun', '2026-06-15', '2026-06-19', 'Maria Gonzalez', 'Beginner', 15, 175.00, 14),
        ('Young Dancers Camp (Ages 6-8)', 'Full-day camp with ballet, jazz, tap, and crafts', '2026-06-15', '2026-06-19', 'Elena Rossi & Natalie Foster', 'Beginner', 20, 250.00, 17),
        ('Competition Prep Intensive', 'Three-day intensive preparing competition routines and building performance quality', '2026-08-03', '2026-08-05', 'Rachel Kim', 'Advanced', 20, 225.00, 16),
        ('Acro & Flexibility Workshop', 'Three-day workshop focused on acrobatic skills and flexibility training', '2026-07-27', '2026-07-29', 'Michael Rivera & Victor Santos', 'All Levels', 18, 195.00, 10),
        ('Pointe Intensive', 'Four-day intensive for dancers advancing their pointe work', '2026-07-20', '2026-07-23', 'Sophie Laurent', 'Advanced', 12, 300.00, 9),
        ('Lyrical Workshop', 'Two-day workshop on lyrical technique, emotion, and storytelling through movement', '2026-08-06', '2026-08-07', 'Keiko Tanaka', 'Intermediate', 22, 150.00, 8),
        ('Tap Masterclass Series', 'Three-day advanced tap series with guest instructor', '2026-07-14', '2026-07-16', 'Marcus Hall', 'Advanced', 16, 210.00, 7),
        ('Dance Choreography Lab', 'Five-day program where students learn to create their own choreography', '2026-08-10', '2026-08-14', 'Rachel Kim & Natalie Foster', 'Intermediate', 18, 300.00, 5),
        ('Adult Dance Retreat', 'Weekend intensive for adult dancers of all levels', '2026-07-18', '2026-07-19', 'Elena Rossi & Derek Thompson', 'All Levels', 25, 175.00, 11),
        ('Full Summer Program', 'Six-week comprehensive training program across all dance styles', '2026-06-15', '2026-07-24', 'Multiple Instructors', 'Advanced', 20, 1500.00, 13);
    `);
    console.log('Seeded summer_intensives.');

    // 26. MAKEUP CLASSES (15)
    await client.query(`
      INSERT INTO makeup_classes (student_id, original_class_id, makeup_class_id, original_date, makeup_date, status, reason) VALUES
        (1, 3, 3, '2026-03-17', '2026-03-24', 'scheduled', 'Family vacation'),
        (7, 6, 6, '2026-03-02', '2026-03-09', 'completed', 'Sick with cold'),
        (4, 3, 3, '2026-02-24', '2026-03-03', 'completed', 'Doctor appointment'),
        (2, 2, 2, '2026-03-09', '2026-03-16', 'scheduled', 'School event conflict'),
        (14, 2, 2, '2026-03-02', '2026-03-16', 'scheduled', 'Sick'),
        (6, 7, 7, '2026-03-04', '2026-03-11', 'completed', 'Car trouble'),
        (9, 4, 4, '2026-02-19', '2026-02-26', 'completed', 'Competition travel'),
        (13, 8, 8, '2026-03-11', '2026-03-18', 'scheduled', 'Dentist appointment'),
        (11, 3, 3, '2026-03-10', '2026-03-17', 'completed', 'Flu'),
        (15, 7, 7, '2026-03-11', '2026-03-18', 'scheduled', 'Family emergency'),
        (3, 9, 9, '2026-03-06', '2026-03-13', 'completed', 'School field trip'),
        (18, 17, 17, '2026-03-06', '2026-03-13', 'completed', 'Injury recovery'),
        (5, 2, 2, '2026-03-16', '2026-03-23', 'scheduled', 'Weather - studio closed'),
        (16, 10, 10, '2026-03-05', '2026-03-12', 'completed', 'Sick'),
        (10, 20, 20, '2026-03-09', '2026-03-16', 'scheduled', 'Audition out of town');
    `);
    console.log('Seeded makeup_classes.');

    // 27. FINANCIAL REPORTS (15)
    await client.query(`
      INSERT INTO financial_reports (report_type, period, revenue, expenses, net_income, details) VALUES
        ('monthly', '2026-01', 42500.00, 28750.00, 13750.00, '{"tuition": 38000, "registration_fees": 2500, "merchandise": 1200, "costume_fees": 800, "payroll": 22000, "rent": 4500, "utilities": 1250, "supplies": 1000}'),
        ('monthly', '2026-02', 41800.00, 29100.00, 12700.00, '{"tuition": 37500, "registration_fees": 1000, "merchandise": 1800, "costume_fees": 1500, "payroll": 22000, "rent": 4500, "utilities": 1300, "supplies": 1300}'),
        ('monthly', '2026-03', 43200.00, 30500.00, 12700.00, '{"tuition": 38500, "competition_fees": 2200, "merchandise": 900, "costume_fees": 1600, "payroll": 23000, "rent": 4500, "utilities": 1200, "competition_travel": 1800}'),
        ('monthly', '2025-12', 48000.00, 35000.00, 13000.00, '{"tuition": 38000, "recital_tickets": 6500, "merchandise": 2500, "costume_fees": 1000, "payroll": 24000, "rent": 4500, "utilities": 1500, "recital_venue": 5000}'),
        ('monthly', '2025-11', 40500.00, 27800.00, 12700.00, '{"tuition": 37000, "registration_fees": 1500, "merchandise": 1200, "costume_fees": 800, "payroll": 21500, "rent": 4500, "utilities": 1100, "supplies": 700}'),
        ('monthly', '2025-10', 41000.00, 28200.00, 12800.00, '{"tuition": 37500, "registration_fees": 1000, "merchandise": 1500, "costume_fees": 1000, "payroll": 21500, "rent": 4500, "utilities": 1200, "supplies": 1000}'),
        ('quarterly', '2026-Q1', 127500.00, 88350.00, 39150.00, '{"total_students": 85, "new_enrollments": 12, "avg_monthly_revenue": 42500, "top_revenue_class": "Pre-Professional Ballet"}'),
        ('quarterly', '2025-Q4', 129500.00, 91000.00, 38500.00, '{"total_students": 82, "new_enrollments": 8, "avg_monthly_revenue": 43167, "top_revenue_class": "Competition Team Jazz"}'),
        ('annual', '2025', 502000.00, 348000.00, 154000.00, '{"total_students_served": 120, "retention_rate": "87%", "new_families": 22, "scholarships_awarded": 4, "competitions_attended": 8}'),
        ('monthly', '2025-09', 45000.00, 30000.00, 15000.00, '{"tuition": 36000, "registration_fees": 6000, "merchandise": 2000, "costume_fees": 1000, "payroll": 22000, "rent": 4500, "utilities": 1000, "supplies": 2500}'),
        ('monthly', '2025-08', 28000.00, 22000.00, 6000.00, '{"summer_programs": 22000, "merchandise": 3000, "registration_fees": 3000, "payroll": 15000, "rent": 4500, "utilities": 1200, "supplies": 1300}'),
        ('monthly', '2025-07', 32000.00, 24000.00, 8000.00, '{"summer_programs": 26000, "merchandise": 3500, "registration_fees": 2500, "payroll": 16000, "rent": 4500, "utilities": 1500, "supplies": 2000}'),
        ('monthly', '2025-06', 52000.00, 38000.00, 14000.00, '{"tuition": 37000, "recital_tickets": 8000, "merchandise": 4000, "recital_dvd": 3000, "payroll": 24000, "rent": 4500, "utilities": 1200, "recital_expenses": 8300}'),
        ('expense_report', '2026-03-competitions', 0.00, 4500.00, -4500.00, '{"hotel": 1800, "transportation": 900, "entry_fees": 1200, "meals": 400, "misc": 200}'),
        ('forecast', '2026-Q2', 135000.00, 95000.00, 40000.00, '{"projected_new_students": 15, "recital_revenue_expected": 12000, "summer_registration_expected": 8000, "notes": "Strong enrollment trends continuing"}');
    `);
    console.log('Seeded financial_reports.');

    await client.query('COMMIT');
    console.log('\n✅ Database seeded successfully! All 27 tables created and populated.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
    console.log('Database connection closed.');
  }
}

seed();
