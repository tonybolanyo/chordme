import React from 'react';
import './TranspositionControls.css';

interface TranspositionControlsProps {
  onTranspose: (semitones: number) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const TranspositionControls: React.FC<TranspositionControlsProps> = ({
  onTranspose,
  disabled = false,
  className = '',
  style
}) => {
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

  return (
    <div className={`transposition-controls ${className}`} style={style}>
      <span className="transposition-label">Transpose:</span>
      <div className="transposition-buttons">
        <button
          type="button"
          onClick={handleTransposeDown}
          disabled={disabled}
          className="transpose-button transpose-down"
          title="Transpose down by one semitone"
          aria-label="Transpose down"
        >
          ♭
        </button>
        <button
          type="button"
          onClick={handleTransposeUp}
          disabled={disabled}
          className="transpose-button transpose-up"
          title="Transpose up by one semitone"
          aria-label="Transpose up"
        >
          ♯
        </button>
      </div>
    </div>
  );
};

export default TranspositionControls;