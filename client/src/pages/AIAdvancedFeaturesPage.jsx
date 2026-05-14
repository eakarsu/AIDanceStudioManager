import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { apiPost } from '../utils/api';

const FEATURES = [
  {
    id: 'student-placement',
    title: 'AI Student Placement',
    desc: 'Recommend optimal class placement using profile + enrollment history.',
    endpoint: '/ai/student-placement',
    fields: [{ key: 'student_id', label: 'Student ID', type: 'number' }],
  },
  {
    id: 'recital-program',
    title: 'AI Recital Program',
    desc: 'Generate full recital program book with acts and timing.',
    endpoint: '/ai/recital-program',
    fields: [
      { key: 'recital_id', label: 'Recital ID', type: 'number' },
      { key: 'participating_classes', label: 'Participating Classes (JSON array)', type: 'json', placeholder: '[{"id":1,"name":"Junior Jazz"}]' },
    ],
  },
  {
    id: 'parent-communication',
    title: 'AI Parent Communication',
    desc: 'Generate personalized parent notes for events, payments, etc.',
    endpoint: '/ai/parent-communication',
    fields: [
      { key: 'topic', label: 'Topic', type: 'text', placeholder: 'Recital reminder' },
      { key: 'student_ids', label: 'Student IDs (JSON array)', type: 'json', placeholder: '[1,2,3]' },
      { key: 'context', label: 'Context (optional)', type: 'textarea' },
    ],
  },
  {
    id: 'competition-strategy',
    title: 'AI Competition Strategy',
    desc: 'Build entries + day-of strategy across competing students.',
    endpoint: '/ai/competition-strategy',
    fields: [
      { key: 'competition_id', label: 'Competition ID', type: 'number' },
      { key: 'entering_students', label: 'Entering Students (JSON array)', type: 'json', placeholder: '[{"id":1,"name":"Ava"}]' },
    ],
  },
  {
    id: 'recital-choreography',
    title: 'Recital Choreography Copilot',
    desc: 'Suggest piece structure, counts, formations, and transitions.',
    endpoint: '/ai/recital-choreography',
    fields: [
      { key: 'music_title', label: 'Music Title', type: 'text' },
      { key: 'music_artist', label: 'Artist', type: 'text' },
      { key: 'dance_style', label: 'Dance Style', type: 'text' },
      { key: 'age_group', label: 'Age Group', type: 'text' },
      { key: 'level', label: 'Level', type: 'text' },
      { key: 'duration_minutes', label: 'Duration (minutes)', type: 'number' },
      { key: 'dancer_count', label: 'Dancer Count', type: 'number' },
      { key: 'performance_context', label: 'Performance Context', type: 'text' },
      { key: 'notes', label: 'Notes (optional)', type: 'textarea' },
    ],
  },
  {
    id: 'class-scheduling-optimizer',
    title: 'Smart Class Scheduling Optimizer',
    desc: 'Build a weekly schedule maximizing enrollment and minimizing conflicts.',
    endpoint: '/ai/class-scheduling-optimizer',
    fields: [
      { key: 'teacher_availability', label: 'Teacher Availability (JSON array)', type: 'json', placeholder: '[{"name":"Lina","days":["Mon","Tue"],"hours":"3-9pm"}]' },
      { key: 'classes_to_schedule', label: 'Classes to Schedule (JSON array)', type: 'json', placeholder: '[{"name":"Jazz Junior","style":"jazz","level":"intermediate","duration_min":60,"size":15}]' },
      { key: 'studios', label: 'Studios (JSON array, optional)', type: 'json', placeholder: '[{"name":"Studio A","capacity":20}]' },
      { key: 'constraints', label: 'Constraints (JSON object)', type: 'json', placeholder: '{"no_back_to_back":true}' },
    ],
  },
  {
    id: 'student-progress-report',
    title: 'Student Progress Report Card',
    desc: 'Build narrative report combining attendance, achievements, evaluations.',
    endpoint: '/ai/student-progress-report',
    fields: [
      { key: 'student_id', label: 'Student ID', type: 'number' },
      { key: 'term_start', label: 'Term Start (YYYY-MM-DD)', type: 'text' },
      { key: 'term_end', label: 'Term End (YYYY-MM-DD)', type: 'text' },
      { key: 'additional_notes', label: 'Additional Notes', type: 'textarea' },
    ],
  },
  {
    id: 'costume-budget-forecaster',
    title: 'Costume Budget Forecaster',
    desc: 'Estimate budget per class and surface cost-saving alternatives.',
    endpoint: '/ai/costume-budget-forecaster',
    fields: [
      { key: 'recital_lineup', label: 'Recital Lineup (JSON array)', type: 'json', placeholder: '[{"class_name":"Tap Mini","dancers":12,"style":"tap","complexity":"medium"}]' },
      { key: 'target_budget', label: 'Target Budget ($)', type: 'number' },
      { key: 'vendor_preferences', label: 'Vendor Preferences (JSON array)', type: 'json' },
    ],
  },
  {
    id: 'talent-show-matcher',
    title: 'Talent Show / Showcase Matcher',
    desc: 'Build engaging show order grouping students by style/level/energy.',
    endpoint: '/ai/talent-show-matcher',
    fields: [
      { key: 'students', label: 'Students (JSON array)', type: 'json', placeholder: '[{"id":1,"name":"Ava","style":"jazz","level":"intermediate"}]' },
      { key: 'show_length_minutes', label: 'Show Length (min)', type: 'number' },
      { key: 'theme', label: 'Theme', type: 'text' },
      { key: 'constraints', label: 'Constraints (JSON object)', type: 'json' },
    ],
  },
  {
    id: 'multilingual-parent-portal',
    title: 'Multilingual Parent Portal',
    desc: 'Translate studio communications per family language preference.',
    endpoint: '/ai/multilingual-parent-portal',
    fields: [
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'target_language', label: 'Target Language', type: 'text' },
      { key: 'source_language', label: 'Source Language (or auto)', type: 'text' },
      { key: 'family_id', label: 'Family ID (optional)', type: 'number' },
      { key: 'message_type', label: 'Message Type', type: 'text' },
    ],
  },
  {
    id: 'photo-tagging',
    title: 'AI Photo Tagging',
    desc: 'Auto-tag photos with event, dancer, and style annotations.',
    endpoint: '/ai/photo-tagging',
    fields: [
      { key: 'photos', label: 'Photos (JSON array)', type: 'json', placeholder: '[{"photo_id":1,"filename":"recital_001.jpg"}]' },
      { key: 'event_context', label: 'Event Context', type: 'text', placeholder: 'Spring Recital 2025' },
      { key: 'dancer_roster', label: 'Dancer Roster (JSON array)', type: 'json', placeholder: '[{"id":1,"name":"Ava"}]' },
    ],
  },
  {
    id: 'video-highlight-suggestions',
    title: 'Video Highlight Suggestions',
    desc: 'Flag highlight clips from a long recital recording.',
    endpoint: '/ai/video-highlight-suggestions',
    fields: [
      { key: 'video_metadata', label: 'Video Metadata (JSON object)', type: 'json', placeholder: '{"duration_min":120,"chapters":[]}' },
      { key: 'recital_program', label: 'Recital Program (JSON array)', type: 'json' },
      { key: 'target_clip_count', label: 'Target Clip Count', type: 'number' },
    ],
  },
  {
    id: 'teacher-workload-balance',
    title: 'Teacher Workload Balance',
    desc: 'Suggest re-assignments to balance teacher loads across classes.',
    endpoint: '/ai/teacher-workload-balance',
    fields: [
      { key: 'teachers', label: 'Teachers (JSON array)', type: 'json', placeholder: '[{"id":1,"name":"Lina","weekly_hours":18}]' },
      { key: 'classes', label: 'Classes (JSON array)', type: 'json', placeholder: '[{"id":10,"name":"Jazz Junior","duration_min":60,"teacher_id":1}]' },
      { key: 'constraints', label: 'Constraints (JSON object)', type: 'json', placeholder: '{"max_hours_per_teacher":24}' },
    ],
  },
];

function parseField(field, raw) {
  if (raw === '' || raw == null) return undefined;
  if (field.type === 'number') {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  if (field.type === 'json') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

export default function AIAdvancedFeaturesPage() {
  const [expanded, setExpanded] = useState(FEATURES[0].id);
  const [forms, setForms] = useState({});
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const setField = (fid, key, value) => {
    setForms((p) => ({ ...p, [fid]: { ...(p[fid] || {}), [key]: value } }));
  };

  const run = async (feature) => {
    setLoading((p) => ({ ...p, [feature.id]: true }));
    setResults((p) => ({ ...p, [feature.id]: null }));
    try {
      const payload = {};
      for (const f of feature.fields) {
        const v = parseField(f, (forms[feature.id] || {})[f.key]);
        if (v !== undefined) payload[f.key] = v;
      }
      const data = await apiPost(feature.endpoint, payload);
      setResults((p) => ({ ...p, [feature.id]: data }));
    } catch (err) {
      setResults((p) => ({ ...p, [feature.id]: { error: err.message } }));
    } finally {
      setLoading((p) => ({ ...p, [feature.id]: false }));
    }
  };

  return (
    <div className="ai-features-page">
      <div className="ai-page-header">
        <Sparkles size={32} />
        <div>
          <h1>AI Advanced Features</h1>
          <p>Specialized AI tools spanning placement, choreography, scheduling, and parent communication.</p>
        </div>
      </div>

      <div className="ai-cards-grid">
        {FEATURES.map((feature) => {
          const isOpen = expanded === feature.id;
          const isLoading = loading[feature.id];
          const result = results[feature.id];
          return (
            <div key={feature.id} className={`ai-feature-card ${isOpen ? 'expanded' : ''}`}>
              <div className="ai-card-header" onClick={() => setExpanded(isOpen ? null : feature.id)}>
                <div className="ai-card-icon"><Sparkles size={20} /></div>
                <div className="ai-card-info">
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              {isOpen && (
                <div className="ai-card-body">
                  <div className="ai-form">
                    {feature.fields.map((f) => (
                      <div key={f.key} className="form-group">
                        <label>{f.label}</label>
                        {f.type === 'textarea' || f.type === 'json' ? (
                          <textarea
                            placeholder={f.placeholder}
                            rows={3}
                            value={(forms[feature.id] || {})[f.key] || ''}
                            onChange={(e) => setField(feature.id, f.key, e.target.value)}
                            style={f.type === 'json' ? { fontFamily: 'monospace', fontSize: 12 } : undefined}
                          />
                        ) : (
                          <input
                            type={f.type}
                            placeholder={f.placeholder}
                            value={(forms[feature.id] || {})[f.key] || ''}
                            onChange={(e) => setField(feature.id, f.key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                    <button className="btn btn-primary btn-ai" onClick={() => run(feature)} disabled={isLoading}>
                      {isLoading ? (<><Loader2 size={18} className="spin" /> Running...</>) : (<><Sparkles size={18} /> Run AI</>)}
                    </button>
                  </div>

                  {result && result.error && (
                    <div className="alert alert-error" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <AlertCircle size={18} /> {result.error}
                    </div>
                  )}
                  {result && !result.error && (
                    <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                      <pre style={{ fontSize: 12, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
