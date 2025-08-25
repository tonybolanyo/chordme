import React from 'react';
import './UndoRedoControls.css';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onShowHistory?: () => void;
  className?: string;
}

const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onShowHistory,
  className = '',
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      if (canUndo) {
        onUndo();
      }
    } else if (
      ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z')
    ) {
      event.preventDefault();
      if (canRedo) {
        onRedo();
      }
    }
  };

  return (
    <div 
      className={`undo-redo-controls ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="toolbar"
      aria-label="Undo and Redo controls"
    >
      <button
        className={`undo-button ${!canUndo ? 'disabled' : ''}`}
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        aria-label="Undo last action"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
        </svg>
        <span className="button-text">Undo</span>
      </button>
      
      <button
        className={`redo-button ${!canRedo ? 'disabled' : ''}`}
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        aria-label="Redo last action"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
        </svg>
        <span className="button-text">Redo</span>
      </button>

      {onShowHistory && (
        <div className="separator" />
      )}

      {onShowHistory && (
        <button
          className="history-button"
          onClick={onShowHistory}
          title="Show version history"
          aria-label="Show version history"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13,3A9,9 0 0,0 4,12H1L4.89,15.89L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z"/>
          </svg>
          <span className="button-text">History</span>
        </button>
      )}
    </div>
  );
};

export default UndoRedoControls;