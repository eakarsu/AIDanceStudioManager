import React from 'react';

export default function AIExampleButtons({ featureTitle, examples, onSelect, disabled = false }) {
  return (
    <div className="ai-example-picker" role="group" aria-label={`${featureTitle} example inputs`}>
      <span className="ai-example-label">Fill all fields:</span>
      {examples.map((example) => (
        <button
          key={example.label}
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={() => onSelect(example)}
          disabled={disabled}
        >
          {example.label}
        </button>
      ))}
    </div>
  );
}
