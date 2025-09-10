/**
 * Status bar component for displaying validation summary and controls
 */

import React, { useState } from 'react';
import { ValidationError, ValidationConfig } from '../../services/chordProValidation';
import './ValidationStatusBar.css';

interface ValidationStatusBarProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  isValidating: boolean;
  isValid: boolean;
  config: ValidationConfig;
  onConfigChange?: (config: Partial<ValidationConfig>) => void;
  onErrorClick?: (error: ValidationError) => void;
  onValidateNow?: () => void;
  showSettings?: boolean;
  className?: string;
}

interface ValidationSummaryProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  isValidating: boolean;
  isValid: boolean;
  onErrorClick?: (error: ValidationError) => void;
}

interface ValidationSettingsProps {
  config: ValidationConfig;
  onConfigChange: (config: Partial<ValidationConfig>) => void;
  onClose: () => void;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  warnings,
  isValidating,
  onErrorClick
}) => {
  const [showErrorList, setShowErrorList] = useState(false);

  const allIssues = [...errors, ...warnings];
  const errorCount = errors.length;
  const warningCount = warnings.length;

  const getStatusIcon = (): string => {
    if (isValidating) return '⟳';
    if (errorCount > 0) return '⚠️';
    if (warningCount > 0) return '⚠️';
    return '✅';
  };

  const getStatusMessage = (): string => {
    if (isValidating) return 'Validating...';
    if (errorCount > 0) return `${errorCount} error${errorCount > 1 ? 's' : ''}`;
    if (warningCount > 0) return `${warningCount} warning${warningCount > 1 ? 's' : ''}`;
    return 'Valid ChordPro';
  };

  const getStatusClass = (): string => {
    if (isValidating) return 'validating';
    if (errorCount > 0) return 'has-errors';
    if (warningCount > 0) return 'has-warnings';
    return 'valid';
  };

  return (
    <div className="validation-summary">
      <div 
        className={`validation-status ${getStatusClass()}`}
        onClick={() => allIssues.length > 0 && setShowErrorList(!showErrorList)}
        style={{ cursor: allIssues.length > 0 ? 'pointer' : 'default' }}
      >
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-message">{getStatusMessage()}</span>
        {allIssues.length > 0 && (
          <span className="status-toggle">
            {showErrorList ? '▼' : '▶'}
          </span>
        )}
      </div>

      {showErrorList && allIssues.length > 0 && (
        <div className="error-list">
          {allIssues.map((issue, index) => (
            <div
              key={index}
              className={`error-item ${issue.severity}`}
              onClick={() => onErrorClick?.(issue)}
            >
              <span className="error-severity">{issue.severity}</span>
              <span className="error-type">{issue.type}</span>
              <span className="error-message">{issue.message}</span>
              <span className="error-position">
                {issue.position.line}:{issue.position.column}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ValidationSettings: React.FC<ValidationSettingsProps> = ({
  config,
  onConfigChange,
  onClose
}) => {
  const handleToggle = (key: keyof ValidationConfig) => {
    onConfigChange({ [key]: !config[key] });
  };

  return (
    <div className="validation-settings">
      <div className="settings-header">
        <h3>Validation Settings</h3>
        <button 
          className="settings-close"
          onClick={onClose}
          aria-label="Close settings"
        >
          ×
        </button>
      </div>
      
      <div className="settings-content">
        <div className="setting-group">
          <h4>General</h4>
          
          <label className="setting-item">
            <input
              type="checkbox"
              checked={config.strictMode}
              onChange={() => handleToggle('strictMode')}
            />
            <span>Strict mode (flag unknown directives)</span>
          </label>
          
          <label className="setting-item">
            <input
              type="checkbox"
              checked={config.checkSecurity}
              onChange={() => handleToggle('checkSecurity')}
            />
            <span>Security validation</span>
          </label>
        </div>

        <div className="setting-group">
          <h4>Syntax Checking</h4>
          
          <label className="setting-item">
            <input
              type="checkbox"
              checked={config.checkBrackets}
              onChange={() => handleToggle('checkBrackets')}
            />
            <span>Check bracket matching</span>
          </label>
          
          <label className="setting-item">
            <input
              type="checkbox"
              checked={config.checkEmptyElements}
              onChange={() => handleToggle('checkEmptyElements')}
            />
            <span>Flag empty elements</span>
          </label>
          
          <label className="setting-item">
            <input
              type="checkbox"
              checked={config.checkTypos}
              onChange={() => handleToggle('checkTypos')}
            />
            <span>Check for common typos</span>
          </label>
        </div>

        <div className="setting-group">
          <h4>Thresholds</h4>
          
          <label className="setting-item">
            <span>Max special characters (%)</span>
            <input
              type="range"
              min="5"
              max="50"
              value={config.maxSpecialCharPercent * 100}
              onChange={(e) => onConfigChange({ 
                maxSpecialCharPercent: parseInt(e.target.value) / 100 
              })}
            />
            <span className="setting-value">
              {Math.round(config.maxSpecialCharPercent * 100)}%
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export const ValidationStatusBar: React.FC<ValidationStatusBarProps> = ({
  errors,
  warnings,
  isValidating,
  isValid,
  config,
  onConfigChange,
  onErrorClick,
  onValidateNow,
  showSettings = true,
  className = ''
}) => {
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  return (
    <div className={`validation-status-bar ${className}`}>
      <ValidationSummary
        errors={errors}
        warnings={warnings}
        isValidating={isValidating}
        isValid={isValid}
        onErrorClick={onErrorClick}
      />
      
      <div className="validation-controls">
        {onValidateNow && (
          <button
            className="validate-now-button"
            onClick={onValidateNow}
            disabled={isValidating}
            title="Validate now"
          >
            {isValidating ? '⟳' : '🔍'}
          </button>
        )}
        
        {showSettings && onConfigChange && (
          <button
            className="settings-button"
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            title="Validation settings"
          >
            ⚙️
          </button>
        )}
      </div>

      {showSettingsPanel && onConfigChange && (
        <>
          <div 
            className="settings-overlay"
            onClick={() => setShowSettingsPanel(false)}
          />
          <ValidationSettings
            config={config}
            onConfigChange={onConfigChange}
            onClose={() => setShowSettingsPanel(false)}
          />
        </>
      )}
    </div>
  );
};

export default ValidationStatusBar;