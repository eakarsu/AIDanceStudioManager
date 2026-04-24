import React, { useState } from 'react';
import { Sparkles, BookOpen, Shirt, Trophy, FileText, Users, Music, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { apiPost } from '../utils/api';
import AIResultDisplay from '../components/AIResultDisplay';

const aiFeatures = [
  {
    id: 'class-description',
    title: 'Class Description Generator',
    desc: 'Generate compelling class descriptions for marketing',
    icon: BookOpen,
    endpoint: '/ai/class-description',
    fields: [
      { key: 'danceStyle', label: 'Dance Style', type: 'text', placeholder: 'e.g., Contemporary Ballet' },
      { key: 'level', label: 'Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'] },
      { key: 'ageGroup', label: 'Age Group', type: 'text', placeholder: 'e.g., 8-12 years' },
      { key: 'additionalInfo', label: 'Additional Info', type: 'textarea', placeholder: 'Any special focus, goals, etc.' },
    ],
  },
  {
    id: 'costume-design',
    title: 'Costume Design Brief',
    desc: 'Generate detailed costume design briefs',
    icon: Shirt,
    endpoint: '/ai/costume-design',
    fields: [
      { key: 'danceStyle', label: 'Dance Style', type: 'text', placeholder: 'e.g., Jazz' },
      { key: 'theme', label: 'Theme/Song', type: 'text', placeholder: 'e.g., "City Lights" theme' },
      { key: 'ageGroup', label: 'Age Group', type: 'text', placeholder: 'e.g., Teen' },
      { key: 'budget', label: 'Budget per Costume', type: 'text', placeholder: 'e.g., $50-75' },
      { key: 'colorPreferences', label: 'Color Preferences', type: 'text', placeholder: 'e.g., Navy and gold' },
    ],
  },
  {
    id: 'routine-scoring',
    title: 'Routine Scoring Analysis',
    desc: 'Analyze routine elements for competition scoring',
    icon: Trophy,
    endpoint: '/ai/routine-scoring',
    fields: [
      { key: 'danceStyle', label: 'Dance Style', type: 'text', placeholder: 'e.g., Lyrical' },
      { key: 'level', label: 'Competition Level', type: 'text', placeholder: 'e.g., Intermediate' },
      { key: 'routineDescription', label: 'Routine Description', type: 'textarea', placeholder: 'Describe the choreography, technique elements, etc.' },
      { key: 'duration', label: 'Duration', type: 'text', placeholder: 'e.g., 2:30' },
    ],
  },
  {
    id: 'program-book',
    title: 'Program Book Content',
    desc: 'Generate recital program book content',
    icon: FileText,
    endpoint: '/ai/program-book',
    fields: [
      { key: 'recitalName', label: 'Recital Name', type: 'text', placeholder: 'e.g., Spring Showcase 2026' },
      { key: 'theme', label: 'Theme', type: 'text', placeholder: 'e.g., "Through the Looking Glass"' },
      { key: 'studioName', label: 'Studio Name', type: 'text', placeholder: 'Your studio name' },
      { key: 'additionalInfo', label: 'Additional Details', type: 'textarea', placeholder: 'Special dedications, acknowledgments, etc.' },
    ],
  },
  {
    id: 'student-placement',
    title: 'Student Placement',
    desc: 'Get AI-powered student class placement suggestions',
    icon: Users,
    endpoint: '/ai/student-placement',
    fields: [
      { key: 'studentAge', label: 'Student Age', type: 'text', placeholder: 'e.g., 10' },
      { key: 'experience', label: 'Dance Experience', type: 'textarea', placeholder: 'Years of training, styles studied, etc.' },
      { key: 'goals', label: 'Goals', type: 'textarea', placeholder: 'What the student hopes to achieve' },
      { key: 'currentLevel', label: 'Current Level', type: 'text', placeholder: 'e.g., Beginner' },
    ],
  },
  {
    id: 'music-suggestions',
    title: 'Music Suggestions',
    desc: 'Get song suggestions for routines and classes',
    icon: Music,
    endpoint: '/ai/music-suggestions',
    fields: [
      { key: 'danceStyle', label: 'Dance Style', type: 'text', placeholder: 'e.g., Contemporary' },
      { key: 'mood', label: 'Mood/Theme', type: 'text', placeholder: 'e.g., Emotional, uplifting' },
      { key: 'ageGroup', label: 'Age Group', type: 'text', placeholder: 'e.g., Teen' },
      { key: 'duration', label: 'Preferred Duration', type: 'text', placeholder: 'e.g., 2-3 minutes' },
      { key: 'additionalPreferences', label: 'Additional Preferences', type: 'textarea', placeholder: 'Any specific preferences or restrictions' },
    ],
  },
];

export default function AIFeaturesPage() {
  const [expanded, setExpanded] = useState(null);
  const [formData, setFormData] = useState({});
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const toggleExpand = (id) => {
    setExpanded(expanded === id ? null : id);
  };

  const handleFieldChange = (featureId, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [featureId]: { ...(prev[featureId] || {}), [key]: value },
    }));
  };

  const handleSubmit = async (feature) => {
    setLoading((prev) => ({ ...prev, [feature.id]: true }));
    setResults((prev) => ({ ...prev, [feature.id]: null }));
    try {
      const data = await apiPost(feature.endpoint, formData[feature.id] || {});
      setResults((prev) => ({ ...prev, [feature.id]: data }));
    } catch (err) {
      setResults((prev) => ({ ...prev, [feature.id]: { error: err.message } }));
    } finally {
      setLoading((prev) => ({ ...prev, [feature.id]: false }));
    }
  };

  return (
    <div className="ai-features-page">
      <div className="ai-page-header">
        <Sparkles size={32} />
        <div>
          <h1>AI-Powered Features</h1>
          <p>Leverage artificial intelligence to enhance your dance studio management</p>
        </div>
      </div>

      <div className="ai-cards-grid">
        {aiFeatures.map((feature) => {
          const Icon = feature.icon;
          const isExpanded = expanded === feature.id;
          const isLoading = loading[feature.id];
          const result = results[feature.id];

          return (
            <div key={feature.id} className={`ai-feature-card ${isExpanded ? 'expanded' : ''}`}>
              <div className="ai-card-header" onClick={() => toggleExpand(feature.id)}>
                <div className="ai-card-icon">
                  <Icon size={24} />
                </div>
                <div className="ai-card-info">
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {isExpanded && (
                <div className="ai-card-body">
                  <div className="ai-form">
                    {feature.fields.map((field) => (
                      <div key={field.key} className="form-group">
                        <label>{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea
                            placeholder={field.placeholder}
                            value={(formData[feature.id] || {})[field.key] || ''}
                            onChange={(e) => handleFieldChange(feature.id, field.key, e.target.value)}
                            rows={3}
                          />
                        ) : field.type === 'select' ? (
                          <select
                            value={(formData[feature.id] || {})[field.key] || ''}
                            onChange={(e) => handleFieldChange(feature.id, field.key, e.target.value)}
                          >
                            <option value="">Select...</option>
                            {field.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={(formData[feature.id] || {})[field.key] || ''}
                            onChange={(e) => handleFieldChange(feature.id, field.key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                    <button
                      className="btn btn-primary btn-ai"
                      onClick={() => handleSubmit(feature)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <><Loader2 size={18} className="spin" /> Generating...</>
                      ) : (
                        <><Sparkles size={18} /> Generate with AI</>
                      )}
                    </button>
                  </div>

                  {result && !result.error && (
                    <AIResultDisplay result={result} />
                  )}
                  {result?.error && (
                    <div className="alert alert-error">{result.error}</div>
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
