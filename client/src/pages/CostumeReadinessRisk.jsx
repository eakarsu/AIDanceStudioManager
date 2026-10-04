import React, { useState } from 'react';
import { apiPost } from '../utils/api';
import AIExampleButtons from '../components/AIExampleButtons';
import { costumeReadinessExamples } from '../utils/aiExamples';

export default function CostumeReadinessRisk() {
  const [form, setForm] = useState({
    dancerCount: 64,
    missingCostumes: 7,
    alterationTickets: 12,
    recitalDays: 18,
    measurementAgeDays: 83,
    vendorDelayDays: 5,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: Number(value) }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      setResult(await apiPost('/costume-readiness-risk/score', form));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Costume Readiness Risk</h1>
        <p>Flag recital costume gaps before they become rehearsal-day blockers.</p>
      </div>
      <form className="form-card" onSubmit={submit}>
        <AIExampleButtons
          featureTitle="Costume Readiness Risk"
          examples={costumeReadinessExamples}
          onSelect={(example) => {
            setForm(example.values);
            setResult(null);
            setError('');
          }}
        />
        {Object.entries(form).map(([key, value]) => (
          <label key={key} className="form-group">
            <span>{key.replace(/([A-Z])/g, ' $1')}</span>
            <input type="number" value={value} onChange={(e) => update(key, e.target.value)} />
          </label>
        ))}
        <button className="btn btn-primary" type="submit">Score readiness</button>
      </form>
      {error && <div className="alert alert-error">{error}</div>}
      {result && (
        <div className="data-card">
          <h2>{result.level.toUpperCase()} · {result.score}/100</h2>
          <ul>{result.actions.map((action) => <li key={action}>{action}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
