/**
 * Demo page to test real-time ChordPro validation
 */

import React, { useState } from 'react';
import { ChordProEditor } from '../components/ChordProEditor';
import type { ValidationError } from '../services/chordProValidation';
import './ValidationDemo.css';

const DEMO_CONTENT = `{title: Amazing Grace}
{artist: John Newton}
{key: G}

[G]Amazing [C]grace how [G]sweet the [D]sound
That [G]saved a [C]wretch like [G]me [D]
I [G]once was [C]lost but [G]now am [Em]found
Was [G]blind but [D]now I [G]see

{start_of_chorus}
[G]'Twas [C]grace that [G]taught my [D]heart to fear
And [G]grace my [C]fears re[G]lieved [D]
{end_of_chorus}

{comment: This is a traditional hymn}`;

const INVALID_CONTENT = `{titel: Song With Errors}
{artist John Newton
{key: G}

[G]Valid chord [X]Invalid chord [G]Valid again
[Incomplete chord
{unclosed directive

<script>alert('security issue')</script>
{}
[]`;

export const ValidationDemo: React.FC = () => {
  const [content, setContent] = useState(DEMO_CONTENT);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);

  const handleValidationChange = (errors: ValidationError[], warnings: ValidationError[]) => {
    setValidationErrors(errors);
    setValidationWarnings(warnings);
  };

  return (
    <div className="validation-demo">
      <h1>Real-time ChordPro Validation Demo</h1>
      
      <div className="demo-controls">
        <button
          onClick={() => setContent(DEMO_CONTENT)}
          className="demo-button valid"
        >
          Load Valid Content
        </button>
        <button
          onClick={() => setContent(INVALID_CONTENT)}
          className="demo-button invalid"
        >
          Load Invalid Content
        </button>
        <button
          onClick={() => setContent('')}
          className="demo-button clear"
        >
          Clear
        </button>
      </div>

      <div className="demo-editor">
        <h2>ChordPro Editor with Real-time Validation</h2>
        <ChordProEditor
          value={content}
          onChange={setContent}
          placeholder="Enter ChordPro content here..."
          rows={15}
          enableValidation={true}
          showValidationStatus={true}
          onValidationChange={handleValidationChange}
        />
      </div>

      <div className="demo-info">
        <div className="validation-summary">
          <h3>Validation Status</h3>
          <div className="summary-item">
            <span className="label">Errors:</span>
            <span className={`count ${validationErrors.length > 0 ? 'has-errors' : ''}`}>
              {validationErrors.length}
            </span>
          </div>
          <div className="summary-item">
            <span className="label">Warnings:</span>
            <span className={`count ${validationWarnings.length > 0 ? 'has-warnings' : ''}`}>
              {validationWarnings.length}
            </span>
          </div>
        </div>

        <div className="validation-features">
          <h3>Features Demonstrated</h3>
          <ul>
            <li>✅ Real-time validation with debouncing</li>
            <li>✅ Inline error highlighting with tooltips</li>
            <li>✅ Chord syntax validation</li>
            <li>✅ Directive format validation</li>
            <li>✅ Bracket matching detection</li>
            <li>✅ Empty element detection</li>
            <li>✅ Security pattern detection</li>
            <li>✅ Typo detection for common mistakes</li>
            <li>✅ Validation status bar with error summary</li>
            <li>✅ Configurable validation settings</li>
            <li>✅ Non-blocking validation (type freely!)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ValidationDemo;