import React from 'react';
import { SearchResultsViewMode } from '../../types';
import './ResultViewSelector.css';

interface ResultViewSelectorProps {
  viewMode: SearchResultsViewMode;
  onViewModeChange: (mode: SearchResultsViewMode) => void;
  className?: string;
}

const ResultViewSelector: React.FC<ResultViewSelectorProps> = ({
  viewMode,
  onViewModeChange,
  className = '',
}) => {
  const viewModes: Array<{ mode: SearchResultsViewMode; label: string; icon: string }> = [
    { mode: 'list', label: 'List View', icon: '☰' },
    { mode: 'grid', label: 'Grid View', icon: '⊞' },
  ];

  return (
    <div className={`result-view-selector ${className}`}>
      <span className="result-view-selector-label">View:</span>
      
      <div className="view-mode-buttons" role="radiogroup" aria-label="Result view mode selection">
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
            <span className="view-mode-text">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ResultViewSelector;