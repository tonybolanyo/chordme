import React from 'react';
import { ViewMode, SplitOrientation } from '../../types';
import './ViewModeSelector.css';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  splitOrientation: SplitOrientation;
  onViewModeChange: (mode: ViewMode) => void;
  onSplitOrientationChange: (orientation: SplitOrientation) => void;
  className?: string;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  viewMode,
  splitOrientation,
  onViewModeChange,
  onSplitOrientationChange,
  className = '',
}) => {
  const viewModes: Array<{ mode: ViewMode; label: string; icon: string }> = [
    { mode: 'edit-only', label: 'Edit Only', icon: '📝' },
    { mode: 'split', label: 'Split View', icon: '📑' },
    { mode: 'preview-only', label: 'Preview Only', icon: '👁' },
  ];

  const orientations: Array<{ orientation: SplitOrientation; label: string; icon: string }> = [
    { orientation: 'vertical', label: 'Side by Side', icon: '⫸' },
    { orientation: 'horizontal', label: 'Top Bottom', icon: '⬍' },
  ];

  return (
    <div className={`view-mode-selector ${className}`}>
      <span className="view-mode-selector-label">View:</span>
      
      <div className="view-mode-buttons" role="radiogroup" aria-label="View mode selection">
        {viewModes.map(({ mode, label, icon }) => (
          <button
            key={mode}
            type="button"
            className={`view-mode-button ${viewMode === mode ? 'active' : ''}`}
            onClick={() => onViewModeChange(mode)}
            role="radio"
            aria-checked={viewMode === mode}
            aria-label={`Switch to ${label}`}
            title={label}
          >
            <span className="view-mode-icon" role="img" aria-hidden="true">
              {icon}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {viewMode === 'split' && (
        <div className="orientation-controls">
          {orientations.map(({ orientation, label, icon }) => (
            <button
              key={orientation}
              type="button"
              className={`orientation-button ${splitOrientation === orientation ? 'active' : ''}`}
              onClick={() => onSplitOrientationChange(orientation)}
              aria-label={`Switch to ${label}`}
              title={label}
            >
              <span className="orientation-icon" role="img" aria-hidden="true">
                {icon}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewModeSelector;