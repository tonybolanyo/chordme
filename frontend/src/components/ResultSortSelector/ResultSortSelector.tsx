import React from 'react';
import { SearchSortOption, SortDirection } from '../../types';
import './ResultSortSelector.css';

interface ResultSortSelectorProps {
  sortBy: SearchSortOption;
  sortDirection: SortDirection;
  onSortChange: (sortBy: SearchSortOption, direction?: SortDirection) => void;
  className?: string;
}

const ResultSortSelector: React.FC<ResultSortSelectorProps> = ({
  sortBy,
  sortDirection,
  onSortChange,
  className = '',
}) => {
  const sortOptions: Array<{ value: SearchSortOption; label: string }> = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'alphabetical', label: 'Alphabetical' },
    { value: 'date', label: 'Date Created' },
    { value: 'popularity', label: 'Popularity' },
  ];

  const handleSortChange = (newSortBy: SearchSortOption) => {
    if (newSortBy === sortBy) {
      // Toggle direction if same sort option
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      onSortChange(newSortBy, newDirection);
    } else {
      // Default direction for new sort option
      const defaultDirection = newSortBy === 'relevance' || newSortBy === 'popularity' ? 'desc' : 'asc';
      onSortChange(newSortBy, defaultDirection);
    }
  };

  const getSortIcon = (option: SearchSortOption) => {
    if (option !== sortBy) return '';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className={`result-sort-selector ${className}`}>
      <span className="sort-selector-label">Sort by:</span>
      
      <div className="sort-options">
        {sortOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`sort-option-button ${sortBy === value ? 'active' : ''}`}
            onClick={() => handleSortChange(value)}
            aria-label={`Sort by ${label}${sortBy === value ? ` (currently ${sortDirection}ending)` : ''}`}
          >
            <span className="sort-option-text">{label}</span>
            {sortBy === value && (
              <span className="sort-direction-icon" aria-hidden="true">
                {getSortIcon(value)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ResultSortSelector;