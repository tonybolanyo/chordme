import React, { useEffect, useCallback } from 'react';
import './TranspositionControls.css';

export type NotationSystem = 'american' | 'latin';

interface TranspositionControlsProps {
  onTranspose: (semitones: number) => void;
  onKeyChange?: (key: string) => void;
  onNotationSystemChange?: (system: NotationSystem) => void;
  onReset?: () => void;
  currentTransposition?: number;
  originalKey?: string;
  currentKey?: string;
  notationSystem?: NotationSystem;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  enableAdvancedFeatures?: boolean;
}

// All 12 chromatic keys for key selection
// Major and minor keys for dropdown
const ALL_KEYS = [
  // Major keys
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  // Minor keys  
  'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'
];

const TranspositionControls: React.FC<TranspositionControlsProps> = ({
  onTranspose,
  onKeyChange,
  onNotationSystemChange,
  onReset,
  currentTransposition = 0,
  originalKey,
  currentKey,
  notationSystem = 'american',
  disabled = false,
  className = '',
  style,
  enableAdvancedFeatures = true,
}) => {
  
  // Keyboard shortcut handling
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;
    
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          onTranspose(1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          onTranspose(-1);
          break;
        case '=':
        case '+':
          event.preventDefault();
          onTranspose(1);
          break;
        case '-':
          event.preventDefault();
          onTranspose(-1);
          break;
        case '0':
          event.preventDefault();
          if (onReset) onReset();
          break;
      }
    }
  }, [disabled, onTranspose, onReset]);

  useEffect(() => {
    if (enableAdvancedFeatures) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enableAdvancedFeatures]);

  const handleTransposeUp = () => {
    if (!disabled) {
      onTranspose(1);
    }
  };

  const handleTransposeDown = () => {
    if (!disabled) {
      onTranspose(-1);
    }
  };

  const handleKeySelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onKeyChange && !disabled) {
      onKeyChange(event.target.value);
    }
  };

  const handleNotationToggle = () => {
    if (onNotationSystemChange && !disabled) {
      const newSystem = notationSystem === 'american' ? 'latin' : 'american';
      onNotationSystemChange(newSystem);
    }
  };

  const handleReset = () => {
    if (onReset && !disabled) {
      onReset();
    }
  };

  return (
    <div className={`transposition-controls ${className}`} style={style}>
      {/* Basic Transposition Controls */}
      <div className="transposition-basic-controls">
        <span className="transposition-label">Transpose:</span>
        <div className="transposition-buttons">
          <button
            type="button"
            onClick={handleTransposeDown}
            disabled={disabled}
            className="transpose-button transpose-down"
            title="Transpose down by one semitone (Ctrl+↓ or Ctrl+-)"
            aria-label="Transpose down"
          >
            ♭
          </button>
          <button
            type="button"
            onClick={handleTransposeUp}
            disabled={disabled}
            className="transpose-button transpose-up"
            title="Transpose up by one semitone (Ctrl+↑ or Ctrl++)"
            aria-label="Transpose up"
          >
            ♯
          </button>
        </div>
        
        {/* Transposition Display */}
        {enableAdvancedFeatures && (
          <div className="transposition-display">
            <span className="transposition-amount">
              {currentTransposition > 0 ? `+${currentTransposition}` : currentTransposition}
            </span>
          </div>
        )}
      </div>

      {/* Advanced Controls */}
      {enableAdvancedFeatures && (
        <div className="transposition-advanced-controls">
          {/* Key Selection */}
          {onKeyChange && (
            <div className="key-selection-container">
              <label htmlFor="key-select" className="key-selection-label">
                Key:
              </label>
              <select
                id="key-select"
                value={currentKey || originalKey || 'C'}
                onChange={handleKeySelect}
                disabled={disabled}
                className="key-selection-dropdown"
                aria-label="Select key signature"
              >
                {ALL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Key Display */}
          {originalKey && (
            <div className="key-display">
              <span className="key-label">Original:</span>
              <span className="key-value original-key">{originalKey}</span>
              {currentKey && currentKey !== originalKey && (
                <>
                  <span className="key-arrow">→</span>
                  <span className="key-value current-key">{currentKey}</span>
                </>
              )}
            </div>
          )}

          {/* Notation System Toggle */}
          {onNotationSystemChange && (
            <div className="notation-system-container">
              <label className="notation-system-label">
                Notation:
              </label>
              <button
                type="button"
                onClick={handleNotationToggle}
                disabled={disabled}
                className={`notation-toggle ${notationSystem}`}
                title={`Switch to ${notationSystem === 'american' ? 'Latin' : 'American'} notation`}
                aria-label={`Current notation: ${notationSystem}. Click to switch`}
              >
                {notationSystem === 'american' ? 'ABC' : 'DoReMi'}
              </button>
            </div>
          )}

          {/* Reset Button */}
          {onReset && (
            <div className="reset-container">
              <button
                type="button"
                onClick={handleReset}
                disabled={disabled || currentTransposition === 0}
                className="reset-button"
                title="Reset to original key (Ctrl+0)"
                aria-label="Reset transposition"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {enableAdvancedFeatures && (
        <div className="keyboard-shortcuts-hint" title="Keyboard shortcuts available">
          <span className="shortcuts-text">
            Ctrl+↑/↓, Ctrl+±, Ctrl+0
          </span>
        </div>
      )}
    </div>
  );
};

export default TranspositionControls;
