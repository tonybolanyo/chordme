import React from 'react';
import { BulkOperation, BulkActionContext } from '../../types';
import './BulkActionsToolbar.css';

interface BulkActionsToolbarProps {
  context: BulkActionContext;
  onBulkAction: (operation: BulkOperation) => void;
  onSelectAll: (selected: boolean) => void;
  onClearSelection: () => void;
  isVisible: boolean;
  totalResults: number;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  context,
  onBulkAction,
  onSelectAll,
  onClearSelection,
  isVisible,
  totalResults,
}) => {
  if (!isVisible || context.totalSelected === 0) {
    return null;
  }

  const bulkActions: Array<{ operation: BulkOperation; icon: string; label: string; className?: string }> = [
    { operation: 'export', icon: '📥', label: 'Export', className: 'bulk-export' },
    { operation: 'addToPlaylist', icon: '➕', label: 'Add to Playlist', className: 'bulk-playlist' },
    { operation: 'share', icon: '🔗', label: 'Share', className: 'bulk-share' },
    { operation: 'delete', icon: '🗑', label: 'Delete', className: 'bulk-delete' },
  ];

  const availableActions = bulkActions.filter(action => 
    context.availableOperations.includes(action.operation)
  );

  const isAllSelected = context.totalSelected === totalResults;

  return (
    <div className="bulk-actions-toolbar">
      <div className="bulk-selection-info">
        <span className="selection-count">
          {context.totalSelected} of {totalResults} selected
        </span>
        
        <div className="selection-controls">
          <button
            type="button"
            className="selection-control-button"
            onClick={() => onSelectAll(!isAllSelected)}
            aria-label={isAllSelected ? 'Deselect all' : 'Select all'}
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </button>
          
          <button
            type="button"
            className="selection-control-button"
            onClick={onClearSelection}
            aria-label="Clear selection"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bulk-actions">
        {availableActions.map(({ operation, icon, label, className }) => (
          <button
            key={operation}
            type="button"
            className={`bulk-action-button ${className || ''}`}
            onClick={() => onBulkAction(operation)}
            aria-label={`${label} ${context.totalSelected} selected items`}
          >
            <span className="bulk-action-icon" role="img" aria-hidden="true">
              {icon}
            </span>
            <span className="bulk-action-label">{label}</span>
            <span className="bulk-action-count">({context.totalSelected})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BulkActionsToolbar;