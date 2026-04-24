import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';

export default function AIResultDisplay({ result }) {
  const [displayedText, setDisplayedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [doneTyping, setDoneTyping] = useState(false);

  const text = typeof result === 'string' ? result : result?.result || result?.content || JSON.stringify(result, null, 2);

  useEffect(() => {
    setDisplayedText('');
    setDoneTyping(false);
    let i = 0;
    const speed = Math.max(1, Math.min(10, 2000 / text.length));
    const interval = setInterval(() => {
      i += Math.ceil(text.length / 200);
      if (i >= text.length) {
        setDisplayedText(text);
        setDoneTyping(true);
        clearInterval(interval);
      } else {
        setDisplayedText(text.slice(0, i));
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderFormatted = (content) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) return <h2 key={i} className="ai-heading">{trimmed.slice(2)}</h2>;
      if (trimmed.startsWith('## ')) return <h3 key={i} className="ai-subheading">{trimmed.slice(3)}</h3>;
      if (trimmed.startsWith('### ')) return <h4 key={i} className="ai-subheading-sm">{trimmed.slice(4)}</h4>;
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <li key={i} className="ai-bullet">{formatInline(trimmed.slice(2))}</li>;
      if (/^\d+[.)]\s/.test(trimmed)) return <li key={i} className="ai-numbered">{formatInline(trimmed.replace(/^\d+[.)]\s/, ''))}</li>;
      if (trimmed === '') return <br key={i} />;
      return <p key={i} className="ai-paragraph">{formatInline(trimmed)}</p>;
    });
  };

  const formatInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="ai-result-display">
      <div className="ai-result-header">
        <div className="ai-indicator">
          <Sparkles size={18} />
          <span>AI Generated</span>
        </div>
        <button className="ai-copy-btn" onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="ai-result-body">
        {renderFormatted(displayedText)}
        {!doneTyping && <span className="ai-cursor">|</span>}
      </div>
    </div>
  );
}
