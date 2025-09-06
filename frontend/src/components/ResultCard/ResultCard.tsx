import React from 'react';
import { SearchResult } from '../../services/songSearchService';
import { SearchResultUtils } from '../../services/songSearchService';
import { ResultAction, SearchResultsViewMode } from '../../types';
import './ResultCard.css';

interface ResultCardProps {
  result: SearchResult;
  viewMode: SearchResultsViewMode;
  selected: boolean;
  favorited: boolean;
  availableActions: ResultAction[];
  onSelect: (selected: boolean) => void;
  onAction: (action: ResultAction) => void;
  showCheckbox?: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({
  result,
  viewMode,
  selected,
  favorited,
  availableActions,
  onSelect,
  onAction,
  showCheckbox = true,
}) => {
  const actionButtons: Array<{ action: ResultAction; icon: string; label: string; className?: string }> = [
    { action: 'preview', icon: '👁', label: 'Preview', className: 'action-preview' },
    { action: 'edit', icon: '✏️', label: 'Edit', className: 'action-edit' },
    { action: 'favorite', icon: favorited ? '❤️' : '🤍', label: favorited ? 'Unfavorite' : 'Favorite', className: `action-favorite ${favorited ? 'favorited' : ''}` },
    { action: 'share', icon: '🔗', label: 'Share', className: 'action-share' },
    { action: 'delete', icon: '🗑', label: 'Delete', className: 'action-delete' },
  ];

  const visibleActions = actionButtons.filter(button => availableActions.includes(button.action));

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger preview if clicking on actions or checkbox
    if ((e.target as HTMLElement).closest('.result-actions, .result-checkbox')) {
      return;
    }
    onAction('preview');
  };

  return (
    <div className={`result-card ${viewMode} ${selected ? 'selected' : ''}`}>
      {showCheckbox && (
        <div className="result-checkbox">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            aria-label={`Select ${result.title} by ${result.artist}`}
          />
        </div>
      )}

      <div className="result-card-content" onClick={handleCardClick}>
        <div className="result-main">
          <h3 className="result-title">
            {result.highlights?.title ? (
              <span dangerouslySetInnerHTML={{ __html: result.highlights.title }} />
            ) : (
              result.title
            )}
          </h3>
          
          <div className="result-artist">
            {result.highlights?.artist ? (
              <span dangerouslySetInnerHTML={{ __html: result.highlights.artist }} />
            ) : (
              result.artist
            )}
          </div>

          {result.highlights?.lyrics && (
            <div className="result-lyrics">
              <span dangerouslySetInnerHTML={{ __html: result.highlights.lyrics }} />
            </div>
          )}
        </div>

        <div className="result-meta">
          <div className="result-summary">
            {SearchResultUtils.createSummary(result)}
          </div>
          
          <div className="result-stats">
            <span className="relevance-score">
              {SearchResultUtils.formatRelevanceScore(result.relevance_score)}
            </span>
            <span className="match-type">
              {SearchResultUtils.getMatchTypeDescription(result.match_type)}
            </span>
            <span className="view-count">
              {result.view_count} views
            </span>
            <span className="favorite-count">
              {result.favorite_count} favorites
            </span>
          </div>

          <div className="result-badges">
            {result.matched_fields.map(field => (
              <span key={field} className={`field-badge badge-${field}`}>
                {field}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="result-actions">
        {visibleActions.map(({ action, icon, label, className }) => (
          <button
            key={action}
            type="button"
            className={`action-button ${className || ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onAction(action);
            }}
            title={label}
            aria-label={`${label} ${result.title}`}
          >
            <span className="action-icon" role="img" aria-hidden="true">
              {icon}
            </span>
            <span className="action-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ResultCard;