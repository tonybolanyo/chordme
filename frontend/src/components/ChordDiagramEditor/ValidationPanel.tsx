/**
 * Validation Panel Component
 * 
 * Displays validation results with errors, warnings, and suggestions.
 */

import React from 'react';
import { ChordDiagramValidationResult } from '../../types/chordDiagram';
import './ValidationPanel.css';

interface ValidationPanelProps {
  validation: ChordDiagramValidationResult;
  onToggle: () => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validation,
  onToggle
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return '#28a745'; // green
    if (score >= 0.6) return '#ffc107'; // yellow
    if (score >= 0.4) return '#fd7e14'; // orange
    return '#dc3545'; // red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Very Good';
    if (score >= 0.7) return 'Good';
    if (score >= 0.6) return 'Fair';
    if (score >= 0.4) return 'Poor';
    return 'Invalid';
  };

  return (
    <div className={`validation-panel ${validation.isValid ? 'valid' : 'invalid'}`}>
      <div className="panel-header" onClick={onToggle}>
        <div className="header-left">
          <h4>Validation</h4>
          <div className="validation-status">
            {validation.isValid ? (
              <span className="status-badge valid">✓ Valid</span>
            ) : (
              <span className="status-badge invalid">✗ Invalid</span>
            )}
          </div>
        </div>
        
        <div className="header-right">
          <div className="score-display">
            <span className="score-label">Score:</span>
            <span 
              className="score-value"
              style={{ color: getScoreColor(validation.score) }}
            >
              {Math.round(validation.score * 100)}%
            </span>
            <span className="score-text">
              ({getScoreLabel(validation.score)})
            </span>
          </div>
        </div>
      </div>

      <div className="panel-content">
        {/* Errors */}
        {validation.errors.length > 0 && (
          <div className="validation-section errors">
            <h5 className="section-title">
              <span className="icon">🚫</span>
              Errors ({validation.errors.length})
            </h5>
            <div className="messages-list">
              {validation.errors.map((error, index) => (
                <div key={index} className="message-item error">
                  <div className="message-content">
                    <span className="message-text">{error.message}</span>
                    {error.stringNumber && (
                      <span className="message-location">
                        String {error.stringNumber}
                        {error.fret !== undefined && `, Fret ${error.fret}`}
                      </span>
                    )}
                  </div>
                  {error.suggestion && (
                    <div className="message-suggestion">
                      💡 {error.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <div className="validation-section warnings">
            <h5 className="section-title">
              <span className="icon">⚠️</span>
              Warnings ({validation.warnings.length})
            </h5>
            <div className="messages-list">
              {validation.warnings.map((warning, index) => (
                <div key={index} className={`message-item warning ${warning.severity}`}>
                  <div className="message-content">
                    <span className="message-text">{warning.message}</span>
                    <span className="severity-badge">{warning.severity}</span>
                  </div>
                  {warning.suggestion && (
                    <div className="message-suggestion">
                      💡 {warning.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success state */}
        {validation.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
          <div className="validation-section success">
            <div className="success-message">
              <span className="icon">🎉</span>
              <div className="success-content">
                <h5>Perfect Chord!</h5>
                <p>Your chord diagram has no validation issues and is ready to be saved.</p>
              </div>
            </div>
          </div>
        )}

        {/* Validation tips */}
        {(!validation.isValid || validation.warnings.length > 0) && (
          <div className="validation-section tips">
            <h5 className="section-title">
              <span className="icon">💡</span>
              Tips
            </h5>
            <div className="tips-list">
              <div className="tip-item">
                • Ensure all fretted strings have valid finger assignments (1-4)
              </div>
              <div className="tip-item">
                • Check that finger stretches are physically possible
              </div>
              <div className="tip-item">
                • Use barre chords for multiple strings on the same fret
              </div>
              <div className="tip-item">
                • Mark unused strings as muted (×) or open (O)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidationPanel;