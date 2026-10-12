// Each scenario supplies every field in its feature form, including optional fields.
// Record references in advanced examples are resolved against loaded records before use.
export const basicAiExamples = {
  'class-description': [
    { label: 'Beginner ballet', values: { danceStyle: 'Ballet', level: 'Beginner', ageGroup: '6-8 years', additionalInfo: 'Focus on posture, musicality, and a welcoming first recital experience. One 45-minute class each week.' } },
    { label: 'Teen contemporary', values: { danceStyle: 'Contemporary', level: 'Intermediate', ageGroup: '13-17 years', additionalInfo: 'Include floor work, improvisation, and expressive storytelling. Students should have at least two years of dance training.' } },
  ],
  'costume-design': [
    { label: 'Garden ballet', values: { danceStyle: 'Ballet', theme: 'Enchanted Garden', ageGroup: '6-8 years', budget: '$65 per dancer', colorPreferences: 'Sage green, blush pink, and soft gold; avoid loose accessories.' } },
    { label: 'City jazz', values: { danceStyle: 'Jazz', theme: 'City Lights', ageGroup: 'Teen', budget: '$90 per dancer', colorPreferences: 'Navy and silver with reflective accents; use flexible, washable fabrics.' } },
  ],
  'routine-scoring': [
    { label: 'Lyrical solo', values: { danceStyle: 'Lyrical', level: 'Intermediate', routineDescription: 'A solo with controlled turns, sustained extensions, a floor transition, and a clear emotional arc. The final turn sequence needs cleaner timing.', duration: '2:30' } },
    { label: 'Tap group', values: { danceStyle: 'Tap', level: 'Advanced', routineDescription: 'Eight dancers perform synchronized rhythm breaks, call-and-response sections, and a traveling formation. Evaluate clarity, unison, and transitions.', duration: '3:00' } },
  ],
  'program-book': [
    { label: 'Spring recital', values: { recitalName: 'Spring Showcase 2026', theme: 'Enchanted Garden', studioName: 'Springfield Dance Studio', additionalInfo: 'Thank families, teachers, and volunteers. Include an intermission notice and a dedication to graduating seniors.' } },
    { label: 'New students', values: { recitalName: 'First Steps Showcase', theme: 'Little Stars', studioName: 'Springfield Dance Studio', additionalInfo: 'Celebrate first-time performers, remind guests to silence phones, and thank the backstage helpers.' } },
  ],
  'student-placement': [
    { label: 'New dancer', values: { studentAge: '7', experience: 'Six months of beginner ballet, one class per week.', goals: 'Build coordination and confidence; try jazz next term.', currentLevel: 'Beginner' } },
    { label: 'Experienced teen', values: { studentAge: '14', experience: 'Four years of ballet and two years of contemporary, three classes per week.', goals: 'Prepare for an intermediate competition team while maintaining safe technique.', currentLevel: 'Intermediate' } },
  ],
  'music-suggestions': [
    { label: 'Upbeat jazz', values: { danceStyle: 'Jazz', mood: 'Playful and energetic', ageGroup: '9-12 years', duration: '2:30', additionalPreferences: 'Clean lyrics only; clear eight-count phrases and a strong ending for a recital.' } },
    { label: 'Lyrical piece', values: { danceStyle: 'Lyrical', mood: 'Reflective and hopeful', ageGroup: 'Teen', duration: '3 minutes', additionalPreferences: 'Moderate tempo, no explicit lyrics, and room for a quiet opening and dynamic build.' } },
  ],
};

export const advancedAiExamples = {
  'student-placement': [
    { label: 'Emma (seed ID 1)', values: { student_id: 1 } },
    { label: 'Olivia (seed ID 2)', values: { student_id: 2 } },
  ],
  'recital-program': [
    { label: 'Spring showcase', values: { recital_id: 1, participating_classes: [{ id: 1, name: 'Beginner Ballet', style: 'ballet', level: 'beginner', age_group: '6-8', dancers: 12 }, { id: 2, name: 'Junior Jazz', style: 'jazz', level: 'intermediate', age_group: '9-12', dancers: 15 }] } },
    { label: 'Summer showcase', values: { recital_id: 3, participating_classes: [{ id: 3, name: 'Teen Contemporary', style: 'contemporary', level: 'intermediate', age_group: '13-17', dancers: 10 }, { id: 4, name: 'Mini Tap', style: 'tap', level: 'beginner', age_group: '6-8', dancers: 9 }] } },
  ],
  'parent-communication': [
    { label: 'Recital reminder', values: { topic: 'Spring recital rehearsal reminder', student_ids: [1, 2], context: 'Dress rehearsal is June 12 at 5:30 PM. Families should arrive 20 minutes early with labeled costumes and water.' } },
    { label: 'Schedule change', values: { topic: 'Class schedule change', student_ids: [3, 4], context: 'The Tuesday class moves to Thursday at 6 PM for two weeks. Ask parents to confirm attendance by Friday.' } },
  ],
  'competition-strategy': [
    { label: 'Starbound entries', values: { competition_id: 1, entering_students: [{ id: 1, name: 'Emma Anderson', age: 11, style: 'jazz', level: 'intermediate' }, { id: 3, name: 'Diego Martinez', age: 13, style: 'hip-hop', level: 'intermediate' }] } },
    { label: 'JUMP entries', values: { competition_id: 2, entering_students: [{ id: 4, name: 'Sophia Johnson', age: 10, style: 'ballet', level: 'advanced' }, { id: 9, name: 'Isabella Garcia', age: 13, style: 'contemporary', level: 'advanced' }] } },
  ],
  'recital-choreography': [
    { label: 'Garden ballet', values: { music_title: 'Morning Garden', music_artist: 'Studio instrumental edit', dance_style: 'Ballet', age_group: '6-8 years', level: 'Beginner', duration_minutes: 2.5, dancer_count: 12, performance_context: 'Spring recital on a proscenium stage', notes: 'Use simple formations, a clear opening pose, and no lifts.' } },
    { label: 'Teen jazz', values: { music_title: 'City Lights', music_artist: 'Licensed recital mix', dance_style: 'Jazz', age_group: '13-17 years', level: 'Intermediate', duration_minutes: 3, dancer_count: 10, performance_context: 'Competition showcase on a 40-foot stage', notes: 'Feature two small groups and allow 16 counts for costume-safe transitions.' } },
  ],
  'class-scheduling-optimizer': [
    { label: 'Weekday studios', values: { teacher_availability: [{ name: 'Maria', days: ['Mon', 'Wed'], hours: '3-8pm', styles: ['ballet'] }, { name: 'Anna', days: ['Tue', 'Thu'], hours: '3-8pm', styles: ['jazz', 'contemporary'] }], classes_to_schedule: [{ name: 'Beginner Ballet', style: 'ballet', level: 'beginner', duration_min: 45, size: 12 }, { name: 'Junior Jazz', style: 'jazz', level: 'intermediate', duration_min: 60, size: 15 }], studios: [{ name: 'Studio A', capacity: 20 }, { name: 'Studio B', capacity: 16 }], constraints: { no_back_to_back: true, earliest_start: '3:30pm', latest_end: '8:00pm' } } },
    { label: 'Weekend program', values: { teacher_availability: [{ name: 'Lina', days: ['Sat'], hours: '9am-3pm', styles: ['tap', 'jazz'] }, { name: 'Carlos', days: ['Sat', 'Sun'], hours: '10am-4pm', styles: ['hip-hop'] }], classes_to_schedule: [{ name: 'Mini Tap', style: 'tap', level: 'beginner', duration_min: 45, size: 9 }, { name: 'Teen Hip-Hop', style: 'hip-hop', level: 'intermediate', duration_min: 60, size: 14 }], studios: [{ name: 'Main Studio', capacity: 24 }, { name: 'Studio C', capacity: 12 }], constraints: { minimum_transition_minutes: 15, no_teacher_overlap: true, preferred_start: '10:00am' } } },
  ],
  'student-progress-report': [
    { label: 'Emma spring term', values: { student_id: 1, term_start: '2026-01-01', term_end: '2026-06-30', additional_notes: 'Highlight musicality, attendance, and confidence in turns; suggest one summer class.' } },
    { label: 'Olivia fall term', values: { student_id: 2, term_start: '2026-07-01', term_end: '2026-12-31', additional_notes: 'Focus on coordination, class participation, and an encouraging next step for a beginner.' } },
  ],
  'costume-budget-forecaster': [
    { label: 'Spring recital', values: { recital_lineup: [{ class_name: 'Beginner Ballet', dancers: 12, style: 'ballet', complexity: 'low' }, { class_name: 'Junior Jazz', dancers: 15, style: 'jazz', complexity: 'medium' }], target_budget: 1800, vendor_preferences: ['Local supplier', 'Reusable basics', 'Washable fabrics'] } },
    { label: 'Competition team', values: { recital_lineup: [{ class_name: 'Teen Contemporary', dancers: 10, style: 'contemporary', complexity: 'high' }, { class_name: 'Tap Ensemble', dancers: 8, style: 'tap', complexity: 'medium' }], target_budget: 2200, vendor_preferences: ['Bulk-order discount', 'Fast alterations', 'Durable accessories'] } },
  ],
  'talent-show-matcher': [
    { label: 'Family showcase', values: { students: [{ id: 1, name: 'Emma', style: 'jazz', level: 'intermediate', energy: 'high' }, { id: 2, name: 'Olivia', style: 'ballet', level: 'beginner', energy: 'gentle' }, { id: 3, name: 'Diego', style: 'hip-hop', level: 'intermediate', energy: 'high' }], show_length_minutes: 60, theme: 'First Steps and Big Moments', constraints: { opening_number: 'group', max_back_to_back_per_student: 1, intermission_minutes: 10 } } },
    { label: 'Competition preview', values: { students: [{ id: 4, name: 'Sophia', style: 'ballet', level: 'advanced', energy: 'medium' }, { id: 9, name: 'Isabella', style: 'contemporary', level: 'advanced', energy: 'high' }, { id: 10, name: 'Ethan', style: 'jazz', level: 'pre-professional', energy: 'high' }], show_length_minutes: 45, theme: 'Competition Preview', constraints: { costume_change_minutes: 5, close_with_high_energy: true, max_solos_in_a_row: 2 } } },
  ],
  'multilingual-parent-portal': [
    { label: 'Spanish recital note', values: { text: 'The spring recital dress rehearsal begins Friday at 5:30 PM. Please bring labeled costumes and arrive 20 minutes early.', target_language: 'Spanish', source_language: 'English', family_id: 1, message_type: 'recital reminder' } },
    { label: 'French schedule note', values: { text: 'The beginner ballet class will meet in Studio B on Thursday at 4:00 PM for the next two weeks.', target_language: 'French', source_language: 'English', family_id: 2, message_type: 'schedule update' } },
  ],
  'photo-tagging': [
    { label: 'Spring recital', values: { photos: [{ photo_id: 101, filename: 'spring_recital_001.jpg' }, { photo_id: 102, filename: 'spring_recital_002.jpg' }], event_context: 'Spring Showcase 2026, Enchanted Garden ballet number', dancer_roster: [{ id: 1, name: 'Emma Anderson' }, { id: 2, name: 'Olivia Anderson' }] } },
    { label: 'Competition', values: { photos: [{ photo_id: 201, filename: 'competition_jazz_001.jpg' }, { photo_id: 202, filename: 'competition_jazz_002.jpg' }], event_context: 'JUMP Dance Convention, teen jazz group', dancer_roster: [{ id: 3, name: 'Diego Martinez' }, { id: 4, name: 'Sophia Johnson' }] } },
  ],
  'video-highlight-suggestions': [
    { label: 'Spring recital', values: { video_metadata: { filename: 'spring_showcase.mp4', duration_min: 90, chapters: [{ title: 'Opening', start_min: 0 }, { title: 'Junior Jazz', start_min: 22 }, { title: 'Finale', start_min: 82 }] }, recital_program: [{ act_number: 1, title: 'Opening', start_min: 0 }, { act_number: 5, title: 'Junior Jazz', start_min: 22 }, { act_number: 18, title: 'Finale', start_min: 82 }], target_clip_count: 6 } },
    { label: 'Competition reel', values: { video_metadata: { filename: 'competition_preview.mp4', duration_min: 45, chapters: [{ title: 'Solo', start_min: 3 }, { title: 'Group', start_min: 18 }, { title: 'Awards', start_min: 40 }] }, recital_program: [{ act_number: 1, title: 'Contemporary Solo', start_min: 3 }, { act_number: 4, title: 'Jazz Group', start_min: 18 }, { act_number: 9, title: 'Awards', start_min: 40 }], target_clip_count: 4 } },
  ],
  'teacher-workload-balance': [
    { label: 'Weekday load', values: { teachers: [{ id: 1, name: 'Maria', weekly_hours: 18, specialties: ['ballet'] }, { id: 2, name: 'Anna', weekly_hours: 11, specialties: ['ballet', 'contemporary'] }], classes: [{ id: 10, name: 'Beginner Ballet', duration_min: 60, teacher_id: 1 }, { id: 11, name: 'Teen Contemporary', duration_min: 90, teacher_id: 1 }], constraints: { max_hours_per_teacher: 24, preserve_specialty_match: true, minimize_schedule_changes: true } } },
    { label: 'Weekend load', values: { teachers: [{ id: 3, name: 'Lina', weekly_hours: 22, specialties: ['jazz', 'tap'] }, { id: 4, name: 'Carlos', weekly_hours: 9, specialties: ['hip-hop', 'jazz'] }], classes: [{ id: 20, name: 'Junior Jazz', duration_min: 60, teacher_id: 3 }, { id: 21, name: 'Teen Jazz', duration_min: 90, teacher_id: 3 }], constraints: { max_hours_per_teacher: 24, avoid_back_to_back: true, preserve_student_time_slots: true } } },
  ],
};

export const costumeReadinessExamples = [
  { label: 'Low risk', values: { dancerCount: 64, missingCostumes: 1, alterationTickets: 2, recitalDays: 30, measurementAgeDays: 21, vendorDelayDays: 0 } },
  { label: 'High risk', values: { dancerCount: 64, missingCostumes: 12, alterationTickets: 18, recitalDays: 5, measurementAgeDays: 100, vendorDelayDays: 10 } },
];

const recordName = (row) => row.name || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.title || row.family_name || `Record ${row.id}`;

export function resolvedAdvancedExamples(featureId, examples, catalog, current = {}) {
  const needs = {
    'student-placement': ['students'], 'student-progress-report': ['students'],
    'recital-program': ['recitals', 'classes'], 'parent-communication': ['students'],
    'competition-strategy': ['competitions', 'students'], 'talent-show-matcher': ['students'],
    'multilingual-parent-portal': ['families'], 'photo-tagging': ['photos', 'students'],
    'teacher-workload-balance': ['teachers', 'classes'],
  };
  const required = needs[featureId] || [];
  if (!required.length) return examples;
  const missing = required.filter((name) => !catalog[name]?.length);
  if (missing.length) return examples.map((example) => ({ ...example, unavailable: `Load existing ${missing.join(' and ')} records to use these examples. No record IDs are assumed.` }));
  const pick = (name, index, selected) => catalog[name]?.find((row) => String(row.id) === String(selected)) || (catalog[name] || [])[index % (catalog[name]?.length || 1)];
  const rows = (name, key, index, count, idKey = 'id') => {
    try {
      const selected = JSON.parse(current[key] || '[]');
      if (Array.isArray(selected) && selected.length && selected.every((item) => catalog[name].some((row) => String(row.id) === String(item[idKey])))) {
        return selected.map((item) => catalog[name].find((row) => String(row.id) === String(item[idKey])));
      }
    } catch (_) { /* Keep genuine loaded records. */ }
    return catalog[name].slice(index, index + count).concat(catalog[name].slice(0, Math.max(0, index + count - catalog[name].length)));
  };
  return examples.map((example, index) => {
    const values = { ...example.values };
    const students = catalog.students || [];
    const classes = catalog.classes || [];
    const teachers = catalog.teachers || [];
    switch (featureId) {
      case 'student-placement': case 'student-progress-report': values.student_id = pick('students', index, current.student_id).id; break;
      case 'recital-program':
        values.recital_id = pick('recitals', index, current.recital_id).id;
        values.participating_classes = rows('classes', 'participating_classes', index, 2).map((row) => ({ id: row.id, name: row.name, style: row.dance_style || row.style, level: row.level, age_group: row.age_group }));
        break;
      case 'parent-communication': {
        let selected = [];
        try { selected = JSON.parse(current.student_ids || '[]'); } catch (_) { /* Use actual loaded students. */ }
        values.student_ids = selected.length && selected.every((id) => students.some((row) => String(row.id) === String(id))) ? selected : students.slice(index, index + 2).map((row) => row.id);
        break;
      }
      case 'competition-strategy':
        values.competition_id = pick('competitions', index, current.competition_id).id;
        values.entering_students = rows('students', 'entering_students', index, 2).map((row) => ({ id: row.id, name: recordName(row), age: row.age, style: row.dance_style || row.style, level: row.level }));
        break;
      case 'talent-show-matcher':
        values.students = rows('students', 'students', index, 3).map((row) => ({ id: row.id, name: recordName(row), style: row.dance_style || row.style, level: row.level }));
        break;
      case 'multilingual-parent-portal': values.family_id = pick('families', index, current.family_id).id; break;
      case 'photo-tagging':
        values.photos = rows('photos', 'photos', index, 2, 'photo_id').map((row) => ({ photo_id: row.id, ...(row.filename || row.file_name || row.url ? { filename: row.filename || row.file_name || row.url } : {}) }));
        values.event_context = catalog.photos[index % catalog.photos.length].event_name || catalog.photos[index % catalog.photos.length].description || 'Existing photo records; confirm the event context before generating.';
        values.dancer_roster = rows('students', 'dancer_roster', index, 2).map((row) => ({ id: row.id, name: recordName(row) }));
        break;
      case 'teacher-workload-balance':
        values.teachers = rows('teachers', 'teachers', index, 2).map((row) => ({ id: row.id, name: recordName(row), weekly_hours: row.weekly_hours ?? 0, specialties: row.specialties || [] }));
        values.classes = rows('classes', 'classes', index, 2).map((row) => ({ id: row.id, name: row.name, duration_min: row.duration_min || 60, teacher_id: teachers.find((teacher) => String(teacher.id) === String(row.teacher_id))?.id ?? null }));
        break;
      default: break;
    }
    return { ...example, label: `Existing records · example ${index + 1}`, values };
  });
}

export function exampleToFormValues(fields, values) {
  return Object.fromEntries(fields.map((field) => [
    field.key,
    field.type === 'json' ? JSON.stringify(values[field.key], null, 2) : String(values[field.key] ?? ''),
  ]));
}
